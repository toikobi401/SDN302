const mongoose = require('mongoose');
const { createHash, randomUUID } = require('node:crypto');
const { Book, Order, PurchaseReceipt, Supplier, InventoryMovement, User } = require('../models');
const { assert, id, text, number, found, pick } = require('../lib/http');
const { bookFormats } = require('../models/shared');
const { pdfExists } = require('./pdf');
const { normalizeCode, redeemCoupon, releaseCoupon } = require('./coupon');

function itemInput(items, purchase = false) {
  assert(Array.isArray(items) && items.length > 0 && items.length <= 100, 400, 'INVALID_INPUT', 'Provide 1–100 items');
  const result = items.map(item => {
    const book = id(item?.book, 'book');
    if (purchase) return { book, quantity: number(item?.quantity, 'quantity', 1), unitCost: number(item.unitCost, 'unitCost') };
    const format = item?.format ?? 'PHYSICAL';
    assert(bookFormats.includes(format), 400, 'INVALID_INPUT', 'format must be PHYSICAL or PDF');
    if (format === 'PHYSICAL') return { book, format, quantity: number(item?.quantity, 'quantity', 1) };
    return { book, format, quantity: number(item?.quantity ?? 1, 'quantity', 1) };
  }).sort((a, b) => a.book.localeCompare(b.book) || (a.format || '').localeCompare(b.format || ''));
  assert(new Set(result.map(item => `${item.book}:${item.format}`)).size === result.length, 400, 'INVALID_INPUT', 'Duplicate book items');
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

// Buying a paid PDF again is allowed because it adds downloads; only a second payment in flight is refused.
async function assertNoPdfPaymentPending(user, items, session) {
  const pending = await Order.exists({ user: user._id,
    items: { $elemMatch: { format: 'PDF', book: { $in: items.filter(item => item.format === 'PDF').map(item => item.book) } } },
    paymentStatus: 'UNPAID', status: 'PENDING' }).session(session);
  assert(!pending, 409, 'PDF_PAYMENT_PENDING', 'You have an unpaid order for this PDF; pay or cancel it first');
}

async function pdfLine(item, session) {
  const book = await Book.findOne({ _id: item.book, status: 'ACTIVE', pdfForSale: true }).select('+pdfFile').session(session);
  assert(book, 409, 'PDF_UNAVAILABLE', 'This PDF is not for sale');
  assert(pdfExists(book.pdfFile), 409, 'PDF_UNAVAILABLE', 'This PDF is temporarily unavailable');
  return { ...item, title: book.title, isbn: book.isbn, coverImageUrl: book.coverImageUrl, unitPrice: book.pdfPrice };
}

async function createOrder(user, input, key, paymentFields = {}) {
  const items = itemInput(input?.items);
  const hasPhysical = items.some(item => item.format === 'PHYSICAL');
  const hasPdf = items.some(item => item.format === 'PDF');
  const shippingAddress = hasPhysical ? shippingInput(input?.shippingAddress) : undefined;
  const note = text(input?.note, 'note', { optional: true, max: 2000 });
  const paymentMethod = input.paymentMethod ?? 'COD';
  assert(['COD', 'PAYOS'].includes(paymentMethod), 400, 'INVALID_INPUT', 'paymentMethod must be COD or PAYOS');
  assert(!hasPdf || paymentMethod === 'PAYOS', 400, 'PAYMENT_REQUIRED', 'PDF books must be paid online');
  const couponCode = input.couponCode === undefined ? undefined : normalizeCode(input.couponCode);
  const hash = fingerprint({ items, shippingAddress, note, paymentMethod, couponCode });
  const idempotencyKey = text(key, 'Idempotency-Key', { max: 128 });
  return idempotent(Order, { user: user._id, idempotencyKey }, hash, async session => {
    // Writing the user document makes one customer's concurrent orders conflict, so the once-only checks cannot race.
    if (hasPdf || couponCode) await User.updateOne({ _id: user._id }, { $currentDate: { updatedAt: true } }).session(session);
    if (hasPdf) await assertNoPdfPaymentPending(user, items, session);
    const order = new Order({ user: user._id, idempotencyKey, requestHash: hash,
      orderNumber: `ORD-${randomUUID()}`, shippingAddress, note, paymentMethod, ...paymentFields,
      shippingFee: hasPhysical ? number(Number(process.env.SHIPPING_FEE_VND || 0), 'SHIPPING_FEE_VND') : 0,
      statusHistory: [{ status: 'PENDING', changedBy: user._id }], items: [] });
    for (const item of items) {
      if (item.format === 'PDF') {
        order.items.push(await pdfLine(item, session));
        continue;
      }
      const book = await moveStock({ book: item.book, delta: -item.quantity, type: 'SALE', actor: user._id,
        operationKey: `order:${order._id}:reserve`, order: order._id, reason: 'Order placed', active: true }, session);
      order.items.push({ ...item, title: book.title, isbn: book.isbn, coverImageUrl: book.coverImageUrl, unitPrice: book.price });
    }
    if (couponCode) {
      const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      order.couponCode = couponCode;
      order.discount = await redeemCoupon(user, couponCode, subtotal, session);
      // payOS cannot take a zero amount, and a PDF cannot fall back to cash.
      assert(paymentMethod === 'COD' || subtotal + order.shippingFee - order.discount > 0, 400, 'COUPON_TOTAL', 'This code leaves nothing to pay online; choose cash on delivery or use another code');
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
    const pdfOnly = order.items.every(item => item.format === 'PDF');
    assert(!(pdfOnly && ['CONFIRMED', 'SHIPPING'].includes(status)), 409, 'INVALID_TRANSITION', 'PDF-only orders are not shipped');
    if (status === 'CONFIRMED') assert(order.paymentMethod === 'COD' || order.paymentStatus === 'PAID', 409, 'PAYMENT_REQUIRED', 'Online orders must be paid before confirmation');
    if (status === 'CANCELLED') {
      // A cancelled order that keeps PAID is the admin's queue of manual refunds.
      assert(user.role === 'ADMIN' || order.paymentStatus === 'UNPAID', 409, 'INVALID_TRANSITION', 'Paid orders can only be cancelled by the store');
      order.cancellationReason = text(reason, 'reason', { max: 1000 });
      const physical = order.items.filter(item => item.format !== 'PDF');
      for (const item of physical.sort((a, b) => String(a.book).localeCompare(String(b.book)))) {
        await moveStock({ book: item.book, delta: item.quantity, type: 'CANCELLATION', actor: user._id,
          operationKey: `order:${order._id}:cancel`, order: order._id, reason: order.cancellationReason }, session);
      }
      if (order.couponCode) await releaseCoupon(order.couponCode, session);
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
    assert(order.paymentMethod === 'COD', 409, 'INVALID_TRANSITION', 'Online payments are confirmed by the payment provider');
    assert(['SHIPPING', 'COMPLETED'].includes(order.status), 409, 'INVALID_TRANSITION', 'Collect COD payment during shipping or after completion');
    if (order.paymentStatus === 'PAID') return order;
    order.paymentStatus = 'PAID';
    order.paidAt = new Date();
    order.statusHistory.push({ status: order.status, changedBy: user._id, note: 'COD payment collected' });
    await order.save({ session });
    return order;
  });
}

async function markRefunded(user, value) {
  return mongoose.connection.transaction(async session => {
    const order = await found(Order, value, {}, session);
    if (order.paymentStatus === 'REFUNDED') return order;
    assert(order.status === 'CANCELLED' && order.paymentStatus === 'PAID', 409, 'INVALID_TRANSITION', 'Only cancelled, paid orders can be refunded');
    order.paymentStatus = 'REFUNDED';
    order.refundedAt = new Date();
    order.statusHistory.push({ status: order.status, changedBy: user._id, note: 'Refund recorded' });
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

module.exports = { itemInput, shippingInput, createOrder, transitionOrder, markPaid, markRefunded, createReceipt, updateReceipt, transitionReceipt, adjustStock };
