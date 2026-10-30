// Offline tests: no HTTP listener, network requests or database connections.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { User, Book, Order, PurchaseReceipt, InventoryMovement } = require('../src/models');
const commerce = require('../src/services/commerce');
const { authenticate, admin } = require('../src/middleware/auth');
const { number, id } = require('../src/lib/http');

const user = { _id: new mongoose.Types.ObjectId(), role: 'CUSTOMER' };
const bookId = new mongoose.Types.ObjectId();
const address = { recipientName: 'Customer', phone: '0900000000', addressLine: '123 Street', province: 'HCM' };
const query = value => ({ session: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });

function stockMocks(t, stock = 10) {
  const calls = [];
  t.mock.method(mongoose.connection, 'transaction', async callback => callback({ offline: true }));
  t.mock.method(Book, 'findOneAndUpdate', async (filter, update, options) => {
    calls.push({ filter, update, options });
    if (stock < filter.stock.$gte || stock > filter.stock.$lte) return null;
    const previous = { _id: bookId, stock, title: 'Database price', price: 125000 };
    stock += update.$inc.stock;
    return previous;
  });
  t.mock.method(InventoryMovement.prototype, 'save', async function () { await this.validate(); return this; });
  t.mock.method(Order.prototype, 'save', async function () { await this.validate(); return this; });
  t.mock.method(PurchaseReceipt.prototype, 'save', async function () { await this.validate(); return this; });
  return { calls, stock: () => stock };
}

test('rejects object-shaped IDs, unsafe money and repeated book lines', () => {
  assert.throws(() => id({ $ne: null }), { status: 400 });
  assert.throws(() => number(Number.MAX_SAFE_INTEGER + 1, 'price'), { status: 400 });
  assert.throws(() => commerce.itemInput([{ book: String(bookId), quantity: 1 }, { book: String(bookId), quantity: 2 }]), { status: 400 });
  assert.throws(() => commerce.itemInput([{ book: String(bookId), quantity: -1 }]), { status: 400 });
});

test('registration ignores role supplied by the client and never returns the password hash', async t => {
  const router = require('../src/routes/auth');
  const handler = router.stack.find(layer => layer.route?.path === '/register').route.stack.at(-1).handle;
  let created;
  t.mock.method(User, 'create', async fields => { created = fields; return new User(fields); });
  let response;
  const res = { status() { return this; }, json(value) { response = value; return this; } };
  await handler({ body: { name: 'Customer', email: 'a@example.com', password: 'strong-password', role: 'ADMIN' } }, res);
  assert.equal(created.role, 'CUSTOMER');
  assert.notEqual(created.passwordHash, 'strong-password');
  assert.equal(response.data.passwordHash, undefined);
  assert.equal(response.data.tokenVersion, undefined);
});

test('revoked JWT versions and customer access to admin APIs are rejected', async t => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'offline-test-secret-longer-than-32-characters';
  t.after(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
  const token = jwt.sign({ version: 0 }, process.env.JWT_SECRET, { subject: String(user._id), issuer: 'bookstore-api', audience: 'bookstore-web', expiresIn: '1h' });
  t.mock.method(User, 'findById', () => ({ select: async () => ({ ...user, isActive: true, tokenVersion: 1 }) }));
  await assert.rejects(() => authenticate({ get: () => `Bearer ${token}` }, {}, () => {}), { status: 401 });
  assert.throws(() => admin({ user }, {}, () => {}), { status: 403 });
});

test('order uses server prices, snapshots and a conditional stock deduction', async t => {
  const state = stockMocks(t);
  const originalFee = process.env.SHIPPING_FEE_VND;
  process.env.SHIPPING_FEE_VND = '15000';
  t.after(() => { if (originalFee === undefined) delete process.env.SHIPPING_FEE_VND; else process.env.SHIPPING_FEE_VND = originalFee; });
  t.mock.method(Order, 'findOne', () => query(null));
  const order = await commerce.createOrder(user, { items: [{ book: String(bookId), quantity: 2, unitPrice: 1 }], shippingAddress: address, total: 1 }, 'order-test');
  assert.equal(order.items[0].unitPrice, 125000);
  assert.equal(order.items[0].title, 'Database price');
  assert.equal(order.subtotal, 250000);
  assert.equal(order.total, 265000);
  assert.equal(state.stock(), 8);
  assert.equal(state.calls[0].filter.stock.$gte, 2);
  assert.equal(state.calls[0].filter.status, 'ACTIVE');
  assert.ok(state.calls[0].options.session);
});

test('insufficient stock rejects checkout instead of allowing negative stock', async t => {
  const state = stockMocks(t, 1);
  t.mock.method(Order, 'findOne', () => query(null));
  await assert.rejects(() => commerce.createOrder(user, { items: [{ book: String(bookId), quantity: 2 }], shippingAddress: address }, 'insufficient'), { code: 'STOCK_CONFLICT' });
  assert.equal(state.stock(), 1);
});

test('reusing an order idempotency key with different content is rejected before stock writes', async t => {
  const state = stockMocks(t);
  t.mock.method(Order, 'findOne', () => query({ requestHash: 'a-different-request' }));
  await assert.rejects(() => commerce.createOrder(user, { items: [{ book: String(bookId), quantity: 2 }], shippingAddress: address }, 'same-key'), { code: 'IDEMPOTENCY_CONFLICT' });
  assert.equal(state.calls.length, 0);
});

test('cancelling twice restores stock once and customer cancellation is ownership-scoped', async t => {
  const state = stockMocks(t, 8);
  const order = new Order({ orderNumber: 'ORD-test', user: user._id, idempotencyKey: 'key', requestHash: 'hash',
    shippingAddress: address, items: [{ book: bookId, title: 'Book', unitPrice: 100, quantity: 2 }] });
  let observedFilter;
  t.mock.method(Order, 'findOne', filter => { observedFilter = filter; return query(order); });
  await commerce.transitionOrder(user, String(order._id), 'CANCELLED', 'Changed mind');
  await commerce.transitionOrder(user, String(order._id), 'CANCELLED', 'Changed mind');
  assert.equal(state.stock(), 10);
  assert.equal(state.calls.length, 1);
  assert.equal(String(observedFilter.user), String(user._id));
  assert.equal(order.statusHistory.length, 1);
});

test('customer cannot cancel confirmed orders and admin cannot skip status transitions', async t => {
  const state = stockMocks(t);
  const order = new Order({ status: 'CONFIRMED' });
  t.mock.method(Order, 'findOne', () => query(order));
  await assert.rejects(() => commerce.transitionOrder(user, String(order._id), 'CANCELLED', 'Cancel'), { code: 'INVALID_TRANSITION' });
  await assert.rejects(() => commerce.transitionOrder({ ...user, role: 'ADMIN' }, String(order._id), 'COMPLETED'), { code: 'INVALID_TRANSITION' });
  assert.equal(state.calls.length, 0);
});

test('confirming a purchase receipt twice increases stock once and locks editing', async t => {
  const state = stockMocks(t, 0);
  const receipt = new PurchaseReceipt({ receiptNumber: 'PUR-test', idempotencyKey: 'receipt', requestHash: 'hash',
    supplier: new mongoose.Types.ObjectId(), supplierName: 'Supplier', createdBy: user._id,
    items: [{ book: bookId, title: 'Book', quantity: 10, unitCost: 80000 }] });
  t.mock.method(PurchaseReceipt, 'findOne', () => query(receipt));
  await commerce.transitionReceipt({ ...user, role: 'ADMIN' }, String(receipt._id), 'RECEIVED');
  await commerce.transitionReceipt({ ...user, role: 'ADMIN' }, String(receipt._id), 'RECEIVED');
  assert.equal(state.stock(), 10);
  assert.equal(state.calls.length, 1);
  assert.equal(receipt.total, 800000);
  await assert.rejects(() => commerce.updateReceipt(String(receipt._id), { note: 'Changed' }), { code: 'RECEIPT_LOCKED' });
});

test('order schema rejects integer overflow in computed totals', async () => {
  const order = new Order({ orderNumber: 'ORD-overflow', user: user._id, idempotencyKey: 'overflow', requestHash: 'hash',
    shippingAddress: address, items: [{ book: bookId, title: 'Book', unitPrice: Number.MAX_SAFE_INTEGER, quantity: 2 }] });
  await assert.rejects(() => order.validate(), { name: 'ValidationError' });
});
