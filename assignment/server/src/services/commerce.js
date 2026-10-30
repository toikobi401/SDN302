const mongoose = require('mongoose');
const { createHash, randomUUID } = require('node:crypto');
const { Book, Order, PurchaseReceipt, Supplier, InventoryMovement } = require('../models');
const { assert, id, text, number, found, pick } = require('../lib/http');

function itemInput(items, purchase = false) {
  assert(Array.isArray(items) && items.length > 0 && items.length <= 100, 400, 'INVALID_INPUT', 'Provide 1–100 items');
  const result = items.map(item => {
    const value = { book: id(item?.book, 'book'), quantity: number(item?.quantity, 'quantity', 1) };
    if (purchase) value.unitCost = number(item.unitCost, 'unitCost');
    return value;
  }).sort((a, b) => a.book.localeCompare(b.book));
  assert(new Set(result.map(item => item.book)).size === result.length, 400, 'INVALID_INPUT', 'Duplicate book items');
  return result;
}

function shippingInput(input) {
  const address = pick(input, ['recipientName', 'phone', 'addressLine', 'ward', 'province']);
  for (const key of ['recipientName', 'phone', 'addressLine', 'province']) address[key] = text(address[key], key, { max: 500 });
  if (address.ward !== undefined) address.ward = text(address.ward, 'ward');
  return address;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function matchReplay(document, hash) {
  assert(document.requestHash === hash, 409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was used for a different request');
  return document;
}

async function idempotent(Model, filter, hash, work) {
  const existing = await Model.findOne(filter);
  if (existing) return matchReplay(existing, hash);
  try {
    return await mongoose.connection.transaction(async session => {
      const replay = await Model.findOne(filter).session(session);
      if (replay) return matchReplay(replay, hash);
      return work(session);
    });
  } catch (error) {
    if (error.code === 11000) {
      const replay = await Model.findOne(filter);
      if (replay) return matchReplay(replay, hash);
    }
    throw error;
  }
}

async function moveStock({ book, delta, type, actor, operationKey, order, purchaseReceipt, reason, active = false }, session) {
  number(Math.abs(delta), 'quantity', 1);
  const filter = { _id: book, stock: { $gte: delta < 0 ? -delta : 0, $lte: delta > 0 ? Number.MAX_SAFE_INTEGER - delta : Number.MAX_SAFE_INTEGER } };
  if (active) filter.status = 'ACTIVE';
  const previous = await Book.findOneAndUpdate(filter, { $inc: { stock: delta } }, { session, returnDocument: 'before' });
  assert(previous, 409, 'STOCK_CONFLICT', 'Book unavailable, insufficient stock or stock limit exceeded');
  const movement = new InventoryMovement({ book, quantityChange: delta, stockBefore: previous.stock,
    stockAfter: previous.stock + delta, type, performedBy: actor, operationKey, order, purchaseReceipt, reason });
  await movement.save({ session });
  return previous;
}

async function createOrder(user, input, key) {
  const items = itemInput(input?.items);
  const shippingAddress = shippingInput(input?.shippingAddress);
  const note = text(input?.note, 'note', { optional: true, max: 2000 });
  assert(input.paymentMethod === undefined || input.paymentMethod === 'COD', 400, 'INVALID_INPUT', 'Only COD is supported');
  const hash = fingerprint({ items, shippingAddress, note, paymentMethod: 'COD' });
  const idempotencyKey = text(key, 'Idempotency-Key', { max: 128 });
  return idempotent(Order, { user: user._id, idempotencyKey }, hash, async session => {
    const order = new Order({ user: user._id, idempotencyKey, requestHash: hash,
      orderNumber: `ORD-${randomUUID()}`, shippingAddress, note,
      shippingFee: number(Number(process.env.SHIPPING_FEE_VND || 0), 'SHIPPING_FEE_VND'),
      statusHistory: [{ status: 'PENDING', changedBy: user._id }], items: [] });
    for (const item of items) {
      const book = await moveStock({ book: item.book, delta: -item.quantity, type: 'SALE', actor: user._id,
        operationKey: `order:${order._id}:reserve`, order: order._id, reason: 'Order placed', active: true }, session);
      order.items.push({ ...item, title: book.title, isbn: book.isbn, coverImageUrl: book.coverImageUrl, unitPrice: book.price });
    }
    await order.save({ session });
    return order;
  });
}

async function transitionOrder(user, value, status, reason) {
  const orderId = id(value);
  assert(['CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'].includes(status), 400, 'INVALID_INPUT', 'Invalid order status');
  return mongoose.connection.transaction(async session => {
    const order = await found(Order, orderId, user.role === 'ADMIN' ? {} : { user: user._id }, session);
    assert(user.role === 'ADMIN' || status === 'CANCELLED', 403, 'FORBIDDEN', 'Only cancellation is allowed');
    if (order.status === status) return order;
    const next = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['SHIPPING', 'CANCELLED'], SHIPPING: ['COMPLETED'] };
    assert(next[order.status]?.includes(status), 409, 'INVALID_TRANSITION', 'Order status transition is not allowed');
    if (user.role !== 'ADMIN') assert(order.status === 'PENDING', 409, 'INVALID_TRANSITION', 'Only pending orders can be cancelled');
    if (status === 'CANCELLED') {
      assert(order.paymentStatus === 'UNPAID', 409, 'INVALID_TRANSITION', 'Paid orders require a refund workflow');
      order.cancellationReason = text(reason, 'reason', { max: 1000 });
      for (const item of [...order.items].sort((a, b) => String(a.book).localeCompare(String(b.book)))) {
        await moveStock({ book: item.book, delta: item.quantity, type: 'CANCELLATION', actor: user._id,
          operationKey: `order:${order._id}:cancel`, order: order._id, reason: order.cancellationReason }, session);
      }
      order.cancelledAt = new Date();
      order.stockReleasedAt = new Date();
    }
    if (status === 'COMPLETED') order.completedAt = new Date();
    order.status = status;
    order.statusHistory.push({ status, changedBy: user._id, note: status === 'CANCELLED' ? order.cancellationReason : undefined });
    await order.save({ session });
    return order;
  });
}

async function markPaid(user, value) {
  return mongoose.connection.transaction(async session => {
    const order = await found(Order, value, {}, session);
    assert(['SHIPPING', 'COMPLETED'].includes(order.status), 409, 'INVALID_TRANSITION', 'Collect COD payment during shipping or after completion');
    if (order.paymentStatus === 'PAID') return order;
    order.paymentStatus = 'PAID';
    order.paidAt = new Date();
    order.statusHistory.push({ status: order.status, changedBy: user._id, note: 'COD payment collected' });
    await order.save({ session });
    return order;
  });
}

async function receiptItems(items, session) {
  const result = [];
  for (const item of items) {
    const book = await found(Book, item.book, {}, session);
    result.push({ ...item, title: book.title });
  }
  return result;
}

async function createReceipt(user, input, key) {
  const normalized = { supplier: id(input?.supplier, 'supplier'), items: itemInput(input?.items, true),
    note: text(input?.note, 'note', { optional: true, max: 2000 }) };
  const hash = fingerprint(normalized);
  const idempotencyKey = text(key, 'Idempotency-Key', { max: 128 });
  return idempotent(PurchaseReceipt, { createdBy: user._id, idempotencyKey }, hash, async session => {
    const supplier = await found(Supplier, normalized.supplier, { isActive: true }, session);
    const receipt = new PurchaseReceipt({ ...normalized, items: await receiptItems(normalized.items, session),
      supplierName: supplier.name, createdBy: user._id, receiptNumber: `PUR-${randomUUID()}`, idempotencyKey, requestHash: hash });
    await receipt.save({ session });
    return receipt;
  });
}

async function updateReceipt(value, input) {
  return mongoose.connection.transaction(async session => {
    const receipt = await found(PurchaseReceipt, value, {}, session);
    assert(receipt.status === 'DRAFT', 409, 'RECEIPT_LOCKED', 'Only draft receipts can be edited');
    const fields = pick(input, ['supplier', 'items', 'note']);
    if (fields.supplier !== undefined) {
      const supplier = await found(Supplier, id(fields.supplier, 'supplier'), { isActive: true }, session);
      receipt.supplier = supplier._id;
      receipt.supplierName = supplier.name;
    }
    if (fields.items !== undefined) receipt.items = await receiptItems(itemInput(fields.items, true), session);
    if (fields.note !== undefined) receipt.note = text(fields.note, 'note', { max: 2000 });
    await receipt.save({ session });
    return receipt;
  });
}

async function transitionReceipt(user, value, status) {
  assert(['RECEIVED', 'CANCELLED'].includes(status), 400, 'INVALID_INPUT', 'Invalid receipt status');
  return mongoose.connection.transaction(async session => {
    const receipt = await found(PurchaseReceipt, value, {}, session);
    if (receipt.status === status) return receipt;
    assert(receipt.status === 'DRAFT', 409, 'RECEIPT_LOCKED', 'Only draft receipts can be confirmed or cancelled');
    if (status === 'RECEIVED') {
      for (const item of [...receipt.items].sort((a, b) => String(a.book).localeCompare(String(b.book)))) {
        await moveStock({ book: item.book, delta: item.quantity, type: 'PURCHASE', actor: user._id,
          operationKey: `receipt:${receipt._id}:receive`, purchaseReceipt: receipt._id, reason: 'Purchase received' }, session);
      }
      receipt.receivedBy = user._id;
      receipt.receivedAt = new Date();
    }
    receipt.status = status;
    await receipt.save({ session });
    return receipt;
  });
}

async function adjustStock(user, bookId, input, key) {
  const book = id(bookId);
  const delta = input?.quantityChange;
  assert(Number.isSafeInteger(delta) && delta !== 0, 400, 'INVALID_INPUT', 'quantityChange must be a nonzero safe integer');
  const reason = text(input?.reason, 'reason', { max: 1000 });
  const operationKey = `adjust:${user._id}:${text(key, 'Idempotency-Key', { max: 128 })}`;
  const replayResult = existing => {
    assert(existing.quantityChange === delta && existing.reason === reason, 409, 'IDEMPOTENCY_CONFLICT', 'Adjustment key was used for a different request');
    return existing;
  };
  const filter = { book, operationKey };
  const existing = await InventoryMovement.findOne(filter);
  if (existing) return replayResult(existing);
  try {
    return await mongoose.connection.transaction(async session => {
      const replay = await InventoryMovement.findOne(filter).session(session);
      if (replay) return replayResult(replay);
      await moveStock({ book, delta, type: 'ADJUSTMENT', actor: user._id, operationKey, reason }, session);
      return InventoryMovement.findOne(filter).session(session);
    });
  } catch (error) {
    if (error.code === 11000) {
      const replay = await InventoryMovement.findOne(filter);
      if (replay) return replayResult(replay);
    }
    throw error;
  }
}

module.exports = { itemInput, shippingInput, createOrder, transitionOrder, markPaid, createReceipt, updateReceipt, transitionReceipt, adjustStock };
