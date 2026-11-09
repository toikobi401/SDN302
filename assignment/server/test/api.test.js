// Offline tests: no HTTP listener, network requests or database connections.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { User, Book, Order, PurchaseReceipt, InventoryMovement } = require('../models');
const commerce = require('../services/commerce');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { number, id } = require('../lib/http');

const user = { _id: new mongoose.Types.ObjectId(), role: 'CUSTOMER' };
const bookId = new mongoose.Types.ObjectId();
const address = { recipientName: 'Customer', phone: '0900000000', addressLine: '123 Street', province: 'HCM' };
const query = value => ({ select() { return this; }, session: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });

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
  const { register } = require('../controllers/auth');
  let created;
  t.mock.method(User, 'create', async fields => { created = fields; return new User(fields); });
  let response;
  const res = { status() { return this; }, json(value) { response = value; return this; } };
  await register({ body: { name: 'Customer', email: 'a@example.com', password: 'strong-password', role: 'ADMIN' } }, res);
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
  await assert.rejects(() => requireAuth({ get: () => `Bearer ${token}` }, {}, () => {}), { status: 401 });
  assert.throws(() => requireAdmin({ user }, {}, () => {}), { status: 403 });
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

const payment = require('../services/payos');

function paymentOrder(fields = {}) {
  return new Order({ orderNumber: 'ORD-payos', user: user._id, idempotencyKey: 'payos', requestHash: 'hash', paymentMethod: 'PAYOS',
    orderCode: 1700000000000123, total: 200, shippingAddress: address, checkoutUrl: 'https://pay.payos.vn/web/x',
    items: [{ book: bookId, title: 'Book', unitPrice: 100, quantity: 2 }], ...fields });
}

function paidUpdates(t, order) {
  const updates = [];
  t.mock.method(Order, 'findOne', () => query(order));
  t.mock.method(Order, 'findOneAndUpdate', async (filter, update) => {
    updates.push(update);
    if (order.paymentStatus !== filter.paymentStatus) return null;
    return Object.assign(order, update.$set);
  });
  t.mock.method(Order, 'findById', async () => order);
  return updates;
}

test('online order is rejected before stock writes when payOS is not configured', async t => {
  const state = stockMocks(t);
  t.mock.method(payment.gateway, 'assertConfigured', () => { throw Object.assign(new Error('off'), { status: 503 }); });
  await assert.rejects(() => payment.placeOrder(user, { paymentMethod: 'PAYOS', items: [{ book: String(bookId), quantity: 1 }], shippingAddress: address }, 'k'), { status: 503 });
  assert.equal(state.calls.length, 0);
});

test('failed payment link cancels the order and restores stock', async t => {
  const state = stockMocks(t);
  let order;
  t.mock.method(Order, 'findOne', () => query(order || null));
  t.mock.method(payment.gateway, 'assertConfigured', () => {});
  t.mock.method(payment.gateway, 'create', async value => { order = value; throw Object.assign(new Error('down'), { status: 502 }); });
  await assert.rejects(() => payment.placeOrder(user, { paymentMethod: 'PAYOS', items: [{ book: String(bookId), quantity: 2 }], shippingAddress: address }, 'link-fail'), { status: 502 });
  assert.equal(state.stock(), 10);
  assert.equal(order.status, 'CANCELLED');
  assert.ok(Number.isSafeInteger(order.orderCode));
});

test('repeated paid webhooks record one payment and bad signatures are rejected', async t => {
  const order = paymentOrder();
  const updates = paidUpdates(t, order);
  t.mock.method(payment.gateway, 'verify', async () => ({ code: '00', orderCode: order.orderCode, amount: 200, reference: 'REF1' }));
  await payment.handleWebhook({});
  await payment.handleWebhook({});
  assert.equal(order.paymentStatus, 'PAID');
  assert.equal(order.paymentReference, 'REF1');
  assert.equal(updates.length, 2);
  assert.equal(updates[0].$set.paymentReference, 'REF1');
  payment.gateway.verify.mock.mockImplementation(async () => { throw Object.assign(new Error('bad'), { status: 400 }); });
  await assert.rejects(() => payment.handleWebhook({}), { status: 400 });
});

test('underpaid webhook does not mark the order paid and unknown orders succeed', async t => {
  const order = paymentOrder();
  const updates = paidUpdates(t, order);
  t.mock.method(payment.gateway, 'verify', async () => ({ code: '00', orderCode: order.orderCode, amount: 199, reference: 'REF1' }));
  await payment.handleWebhook({});
  assert.equal(order.paymentStatus, 'UNPAID');
  assert.equal(updates.length, 0);
  Order.findOne.mock.mockImplementation(() => query(null));
  await payment.handleWebhook({});
});

test('payment after cancellation keeps the order cancelled and joins the refund queue', async t => {
  const order = paymentOrder({ status: 'CANCELLED', cancellationReason: 'Expired' });
  stockMocks(t);
  paidUpdates(t, order);
  t.mock.method(payment.gateway, 'verify', async () => ({ code: '00', orderCode: order.orderCode, amount: 200, reference: 'LATE' }));
  await payment.handleWebhook({});
  assert.equal(order.status, 'CANCELLED');
  assert.equal(order.paymentStatus, 'PAID');
  await commerce.markRefunded({ ...user, role: 'ADMIN' }, String(order._id));
  assert.equal(order.paymentStatus, 'REFUNDED');
});

test('sync releases stock when the payment link expired', async t => {
  const state = stockMocks(t, 8);
  const order = paymentOrder();
  t.mock.method(Order, 'findOne', () => query(order));
  t.mock.method(payment.gateway, 'get', async () => ({ status: 'EXPIRED', amountPaid: 0 }));
  await payment.syncOrder(order);
  assert.equal(order.status, 'CANCELLED');
  assert.equal(state.stock(), 10);
});

test('customer cannot cancel once sync finds the order paid', async t => {
  const state = stockMocks(t, 8);
  const order = paymentOrder();
  paidUpdates(t, order);
  const cancel = t.mock.method(payment.gateway, 'cancel', async () => ({}));
  t.mock.method(payment.gateway, 'get', async () => ({ status: 'PAID', amountPaid: 200, transactions: [{ reference: 'REF2' }] }));
  await assert.rejects(() => payment.cancelOrder(user, String(order._id), 'Changed mind'), { code: 'INVALID_TRANSITION' });
  assert.equal(cancel.mock.callCount(), 0);
  assert.equal(state.stock(), 8);
});

test('provider failure while cancelling leaves the order active', async t => {
  const state = stockMocks(t, 8);
  const order = paymentOrder();
  t.mock.method(Order, 'findOne', () => query(order));
  t.mock.method(payment.gateway, 'get', async () => ({ status: 'PENDING', amountPaid: 0 }));
  t.mock.method(payment.gateway, 'cancel', async () => { throw Object.assign(new Error('down'), { status: 502 }); });
  await assert.rejects(() => payment.cancelOrder(user, String(order._id), 'Changed mind'), { status: 502 });
  assert.equal(order.status, 'PENDING');
  assert.equal(state.stock(), 8);
});

test('unpaid online orders cannot be confirmed or marked paid by hand', async t => {
  stockMocks(t);
  const order = paymentOrder();
  t.mock.method(Order, 'findOne', () => query(order));
  const adminUser = { ...user, role: 'ADMIN' };
  await assert.rejects(() => commerce.transitionOrder(adminUser, String(order._id), 'CONFIRMED'), { code: 'PAYMENT_REQUIRED' });
  await assert.rejects(() => commerce.markPaid(adminUser, String(order._id)), { code: 'INVALID_TRANSITION' });
});

test('only shippers reach shipper APIs, and they collect COD before delivery is completed', async t => {
  const { requireShipper } = require('../middleware/auth');
  const shipper = { ...user, role: 'SHIPPER' };
  assert.throws(() => requireShipper({ user }, {}, () => {}), { status: 403 });
  assert.throws(() => requireShipper({ user: { ...user, role: 'ADMIN' } }, {}, () => {}), { status: 403 });
  assert.throws(() => requireAdmin({ user: shipper }, {}, () => {}), { status: 403 });
  let called = false;
  requireShipper({ user: shipper }, {}, () => { called = true; });
  assert.equal(called, true);

  stockMocks(t);
  const codOrder = status => new Order({ orderNumber: 'ORD-cod', user: user._id, idempotencyKey: 'cod', requestHash: 'hash', shippingAddress: address,
    status, items: [{ book: bookId, title: 'Book', unitPrice: 100, quantity: 1 }] });
  let current;
  t.mock.method(Order, 'findOne', () => query(current));
  current = codOrder('CONFIRMED');
  const paid = await commerce.markPaid(shipper, String(current._id));
  assert.equal(paid.paymentStatus, 'PAID');
  assert.equal(paid.status, 'CONFIRMED');
  assert.equal(String(paid.statusHistory.at(-1).changedBy), String(shipper._id));
  current = codOrder('COMPLETED');
  await assert.rejects(() => commerce.markPaid(shipper, String(current._id)), { code: 'INVALID_TRANSITION' });
  current = codOrder('CONFIRMED');
  await assert.rejects(() => commerce.markPaid({ ...user, role: 'ADMIN' }, String(current._id)), { code: 'INVALID_TRANSITION' });
  current = paymentOrder({ status: 'CONFIRMED', paymentStatus: 'PAID', paidAt: new Date() });
  await assert.rejects(() => commerce.markPaid(shipper, String(current._id)), { code: 'INVALID_TRANSITION' });
});

test('the shipper list holds confirmed and shipping orders without customer account data', async t => {
  const { shipperList } = require('../controllers/order');
  let args;
  t.mock.method(Order, 'find', filter => {
    args = { filter };
    const cursor = { sort: () => cursor, skip: () => cursor, limit: () => cursor, select: value => { args.select = value; return cursor; }, then: resolve => resolve([]) };
    return cursor;
  });
  t.mock.method(Order, 'countDocuments', async () => 0);
  await shipperList({ query: {} }, { json() {} });
  assert.deepEqual(args.filter.status.$in, ['CONFIRMED', 'SHIPPING']);
  assert.ok(args.select.includes('shippingAddress'));
  assert.ok(!/\buser\b|paymentReference|statusHistory|idempotencyKey/.test(args.select));
});

const cloudinary = require('../services/cloudinary');
const { update: updateBook } = require('../controllers/book');

function cloudinaryEnv(t) {
  const keys = { CLOUDINARY_CLOUD_NAME: 'shop', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret', CLOUDINARY_FOLDER: 'bookstore' };
  const previous = Object.fromEntries(Object.keys(keys).map(key => [key, process.env[key]]));
  Object.assign(process.env, keys);
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}

test('upload signature covers every signed parameter and hides the secret', t => {
  cloudinaryEnv(t);
  const signed = cloudinary.signUpload();
  const expected = require('node:crypto').createHash('sha1')
    .update(`allowed_formats=${signed.allowedFormats}&folder=${signed.folder}&timestamp=${signed.timestamp}secret`).digest('hex');
  assert.equal(signed.signature, expected);
  assert.equal(JSON.stringify(signed).includes('"secret"'), false);
});

test('book images must belong to the store account and folder', t => {
  cloudinaryEnv(t);
  const url = 'https://res.cloudinary.com/shop/image/upload/v1/bookstore/books/a.jpg';
  assert.doesNotThrow(() => cloudinary.assertOwnImage(url, 'bookstore/books/a'));
  assert.throws(() => cloudinary.assertOwnImage('https://evil.example/a.jpg', 'bookstore/books/a'), { code: 'INVALID_IMAGE' });
  assert.throws(() => cloudinary.assertOwnImage('https://res.cloudinary.com/other/image/upload/a.jpg', 'bookstore/books/a'), { code: 'INVALID_IMAGE' });
  assert.throws(() => cloudinary.assertOwnImage(url, 'someone-else/a'), { code: 'INVALID_IMAGE' });
});

test('editing a book deletes only the stored images it no longer uses', async t => {
  cloudinaryEnv(t);
  const url = name => `https://res.cloudinary.com/shop/image/upload/v1/bookstore/books/${name}.jpg`;
  const book = new Book({ title: 'B', slug: 'b', authors: ['A'], price: 1, coverImageUrl: url('old'), coverImagePublicId: 'bookstore/books/old',
    imageUrls: [url('keep'), url('drop')], imagePublicIds: ['bookstore/books/keep', 'bookstore/books/drop'] });
  t.mock.method(Book, 'findOne', () => query(book));
  t.mock.method(Book.prototype, 'save', async function () { return this; });
  const destroyed = [];
  t.mock.method(cloudinary, 'destroyImages', async ids => { destroyed.push(...ids); });
  const body = { coverImageUrl: url('new'), coverImagePublicId: 'bookstore/books/new', imageUrls: [url('keep')], imagePublicIds: ['bookstore/books/keep'] };
  await updateBook({ params: { id: String(book._id) }, body }, { json() {} });
  assert.deepEqual(destroyed.sort(), ['bookstore/books/drop', 'bookstore/books/old']);
});

test('imported books keep only paths and links, with stable sample prices', () => {
  const { toBookDocument, samplePrice } = require('../scripts/import-books');
  const base = { id: 'openstax-x', source: 'openstax', title: 'X', authors: ['A'], description: 'D', isbn: null, license: 'L', licenseUrl: 'https://l' };
  const withPdf = toBookDocument({ ...base, cover: 'covers/textbook/math/x.svg', ebook: { format: 'PDF', url: 'https://u/x.pdf', file: 'pdfs/openstax-x.pdf', sizeBytes: 9 } }, []);
  assert.equal(withPdf.coverImageUrl, '/api/covers/textbook/math/x.svg');
  assert.equal(withPdf.pdfFile, 'openstax-x.pdf');
  assert.equal(withPdf.slug, 'x');
  assert.equal(withPdf.price, samplePrice(base));
  assert.equal(withPdf.price % 5000, 0);
  const noPdf = toBookDocument({ ...base, id: 'gutenberg-1', source: 'gutenberg', cover: 'covers/literature/romance/y-1.jpg', ebook: { format: 'EPUB', url: 'https://u/y' } }, []);
  assert.equal(noPdf.pdfFile, undefined);
  assert.equal(new Book({ ...withPdf, pdfFile: '../secret.pdf' }).validateSync().errors.pdfFile.kind, 'regexp');
  assert.equal(new Book(withPdf).validateSync(), undefined);
  assert.equal(toBookDocument({ ...base, isbn: ['978', '1', '938168', '14', '7'].join(String.fromCharCode(0xad)), cover: 'covers/x.svg', ebook: { format: 'PDF', url: 'https://u' } }, []).isbn, '9781938168147');
});

const pdfs = require('../services/pdf');
const { download } = require('../controllers/order');

function pdfOrder(fields = {}) {
  return new Order({ orderNumber: 'ORD-pdf', user: user._id, idempotencyKey: 'pdf', requestHash: 'hash', paymentMethod: 'PAYOS', orderCode: 1700000000000999,
    total: 100, items: [{ book: bookId, format: 'PDF', title: 'Book', unitPrice: 100, quantity: 1 }], ...fields });
}

function pdfBookMock(t, book) {
  const select = { select: () => ({ session: async () => book }) };
  t.mock.method(Book, 'findOne', () => select);
  t.mock.method(User, 'updateOne', () => ({ session: async () => ({}) }));
}

test('an uploaded PDF gets a generated name, and a rejected one leaves no file behind', async t => {
  const { Readable } = require('node:stream');
  const send = chunks => Readable.from(chunks.map(chunk => Buffer.from(chunk)));
  const dir = require('node:path').dirname(pdfs.pdfPath('x.pdf'));
  const name = await pdfs.savePdf(send(['%P', 'DF-1.7 body']));
  t.after(() => fs.rmSync(pdfs.pdfPath(name), { force: true }));
  assert.match(name, /^upload-[a-f0-9-]+\.pdf$/);
  assert.ok(pdfs.isPdfName(name));
  assert.equal(fs.readFileSync(pdfs.pdfPath(name), 'utf8'), '%PDF-1.7 body');
  const before = fs.readdirSync(dir).length;
  await assert.rejects(() => pdfs.savePdf(send(['<html>not a pdf'])), { code: 'INVALID_PDF', status: 400 });
  await assert.rejects(() => pdfs.savePdf(send(['%PD'])), { code: 'INVALID_PDF', status: 400 });
  await assert.rejects(() => pdfs.savePdf(send(['%PDF-', 'too long']), 6), { code: 'PDF_TOO_LARGE', status: 413 });
  assert.equal(fs.readdirSync(dir).length, before);
});

test('a refused PDF upload reads the whole body before answering', async () => {
  const { Readable } = require('node:stream');
  const { pdf } = require('../controllers/upload');
  const res = { status() { throw new Error('must not answer with success'); } };
  const notPdf = Object.assign(Readable.from([Buffer.from('<html>'), Buffer.from('rest')]), { is: () => 'application/pdf', get: () => undefined });
  await assert.rejects(() => pdf(notPdf, res), { code: 'INVALID_PDF' });
  assert.equal(notPdf.readableEnded, true);
  const wrongType = Object.assign(Readable.from([Buffer.from('%PDF-')]), { is: () => false, get: () => undefined });
  await assert.rejects(() => pdf(wrongType, res), { status: 415 });
  assert.equal(wrongType.readableEnded, true);
  const declaredTooBig = Object.assign(Readable.from([Buffer.from('%PDF-')]), { is: () => 'application/pdf', get: () => String(201 * 1024 * 1024) });
  await assert.rejects(() => pdf(declaredTooBig, res), { status: 413 });
});

test('PDF names cannot leave the PDF folder', () => {
  for (const bad of ['../secret.pdf', 'a/b.pdf', 'a\\b.pdf', 'A.pdf', 'x.txt', '', null, { $ne: 1 }]) assert.equal(pdfs.pdfPath(bad), null);
  assert.ok(pdfs.pdfPath('good-1.pdf').endsWith('good-1.pdf'));
  assert.equal(pdfs.pdfExists('no-such-file.pdf'), false);
});

test('a book may be in an order as both formats and a PDF line defaults to one download', async () => {
  const both = commerce.itemInput([{ book: String(bookId), quantity: 2 }, { book: String(bookId), format: 'PDF' }]);
  assert.deepEqual(both.map(item => [item.format, item.quantity]), [['PDF', 1], ['PHYSICAL', 2]]);
  assert.equal(commerce.itemInput([{ book: String(bookId), format: 'PDF', quantity: 3 }])[0].quantity, 3);
  assert.throws(() => commerce.itemInput([{ book: String(bookId), format: 'PDF', quantity: 0 }]), { status: 400 });
  await pdfOrder({ items: [{ book: bookId, format: 'PDF', title: 'B', unitPrice: 100, quantity: 3 }] }).validate();
  assert.throws(() => commerce.itemInput([{ book: String(bookId), format: 'EPUB', quantity: 1 }]), { status: 400 });
});

test('PDF lines reject cash on delivery before any write', async t => {
  const state = stockMocks(t);
  await assert.rejects(() => commerce.createOrder(user, { items: [{ book: String(bookId), format: 'PDF' }], paymentMethod: 'COD' }, 'cod-pdf'), { code: 'PAYMENT_REQUIRED' });
  await assert.rejects(() => commerce.createOrder(user, { items: [{ book: String(bookId), format: 'PDF' }] }, 'default-pdf'), { code: 'PAYMENT_REQUIRED' });
  assert.equal(state.calls.length, 0);
});

test('PDF-only order needs no address, pays no shipping, keeps stock and charges the PDF price', async t => {
  const state = stockMocks(t);
  const originalFee = process.env.SHIPPING_FEE_VND;
  process.env.SHIPPING_FEE_VND = '15000';
  t.after(() => { if (originalFee === undefined) delete process.env.SHIPPING_FEE_VND; else process.env.SHIPPING_FEE_VND = originalFee; });
  t.mock.method(Order, 'findOne', () => query(null));
  t.mock.method(Order, 'exists', () => ({ session: async () => null }));
  pdfBookMock(t, { _id: bookId, title: 'Digital', pdfFile: 'x.pdf', pdfPrice: 40000, price: 999999 });
  t.mock.method(fs, 'existsSync', () => true);
  const order = await commerce.createOrder(user, { items: [{ book: String(bookId), format: 'PDF' }], paymentMethod: 'PAYOS' }, 'pdf-only', { orderCode: 1700000000000321 });
  assert.equal(order.total, 40000);
  assert.equal(order.shippingFee, 0);
  assert.equal(order.shippingAddress, undefined);
  assert.equal(state.calls.length, 0);
});

test('mixed order deducts stock for the physical line only and still requires an address', async t => {
  const state = stockMocks(t);
  t.mock.method(Order, 'findOne', () => query(null));
  t.mock.method(Order, 'exists', () => ({ session: async () => null }));
  pdfBookMock(t, { _id: bookId, title: 'Digital', pdfFile: 'x.pdf', pdfPrice: 40000 });
  t.mock.method(fs, 'existsSync', () => true);
  const items = [{ book: String(bookId), quantity: 2 }, { book: String(bookId), format: 'PDF' }];
  await assert.rejects(() => commerce.createOrder(user, { items, paymentMethod: 'PAYOS' }, 'mixed-no-address'), { status: 400 });
  const order = await commerce.createOrder(user, { items, paymentMethod: 'PAYOS', shippingAddress: address }, 'mixed', { orderCode: 1700000000000322 });
  assert.equal(order.total, 40000 + 250000);
  assert.equal(state.stock(), 8);
  assert.equal(state.calls.length, 1);
});

test('PDFs with an unpaid order, unavailable and missing PDFs are refused', async t => {
  stockMocks(t);
  t.mock.method(Order, 'findOne', () => query(null));
  const exists = t.mock.method(Order, 'exists', () => ({ session: async () => ({ _id: 'pending' }) }));
  pdfBookMock(t, null);
  const input = { items: [{ book: String(bookId), format: 'PDF' }], paymentMethod: 'PAYOS' };
  await assert.rejects(() => commerce.createOrder(user, input, 'pending'), { code: 'PDF_PAYMENT_PENDING' });
  const pendingFilter = exists.mock.calls[0].arguments[0];
  assert.equal(pendingFilter.items.$elemMatch.format, 'PDF');
  // Paid orders must not match, so a customer who used up their downloads can buy more.
  assert.deepEqual([pendingFilter.paymentStatus, pendingFilter.status], ['UNPAID', 'PENDING']);
  exists.mock.mockImplementation(() => ({ session: async () => null }));
  await assert.rejects(() => commerce.createOrder(user, input, 'not-for-sale'), { code: 'PDF_UNAVAILABLE' });
  Book.findOne.mock.mockImplementation(() => ({ select: () => ({ session: async () => ({ pdfFile: 'no-such-file.pdf', pdfPrice: 1 }) }) }));
  await assert.rejects(() => commerce.createOrder(user, input, 'file-gone'), { code: 'PDF_UNAVAILABLE' });
});

test('paying a PDF-only order completes it, but never revives a cancelled one', async t => {
  const order = pdfOrder();
  const updates = paidUpdates(t, order);
  t.mock.method(payment.gateway, 'verify', async () => ({ code: '00', orderCode: order.orderCode, amount: 100, reference: 'R' }));
  await payment.handleWebhook({});
  assert.equal(order.status, 'COMPLETED');
  assert.ok(order.completedAt);
  assert.equal(updates[0].$push.statusHistory.status, 'COMPLETED');
  const cancelled = pdfOrder({ status: 'CANCELLED', cancellationReason: 'Expired' });
  Order.findOne.mock.mockImplementation(() => query(cancelled));
  Order.findOneAndUpdate.mock.mockImplementation(async (filter, update) => Object.assign(cancelled, update.$set));
  await payment.handleWebhook({});
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.paymentStatus, 'PAID');
});

test('a mixed order stays with the store after payment', async t => {
  const order = pdfOrder({ shippingAddress: address, items: [{ book: bookId, format: 'PDF', title: 'B', unitPrice: 100, quantity: 1 }, { book: bookId, title: 'B', unitPrice: 100, quantity: 1 }], total: 200 });
  const updates = paidUpdates(t, order);
  t.mock.method(payment.gateway, 'verify', async () => ({ code: '00', orderCode: order.orderCode, amount: 200, reference: 'R' }));
  await payment.handleWebhook({});
  assert.equal(order.status, 'PENDING');
  assert.equal(order.paymentStatus, 'PAID');
  assert.equal(updates[0].$push, undefined);
});

test('PDF-only orders cannot be shipped, and cancelling restores stock for physical lines only', async t => {
  const state = stockMocks(t, 5);
  const adminUser = { ...user, role: 'ADMIN' };
  const only = pdfOrder({ paymentStatus: 'PAID', paidAt: new Date() });
  t.mock.method(Order, 'findOne', () => query(only));
  await assert.rejects(() => commerce.transitionOrder(adminUser, String(only._id), 'CONFIRMED'), { code: 'INVALID_TRANSITION' });
  await assert.rejects(() => commerce.transitionOrder(adminUser, String(only._id), 'SHIPPING'), { code: 'INVALID_TRANSITION' });
  const mixed = pdfOrder({ shippingAddress: address, items: [{ book: bookId, format: 'PDF', title: 'B', unitPrice: 100, quantity: 1 }, { book: bookId, title: 'B', unitPrice: 100, quantity: 2 }] });
  Order.findOne.mock.mockImplementation(() => query(mixed));
  await commerce.transitionOrder(adminUser, String(mixed._id), 'CANCELLED', 'Out of print');
  assert.equal(state.stock(), 7);
  assert.equal(state.calls.length, 1);
});

test('download is owner-scoped and needs a paid, active order with that PDF', async t => {
  const res = { download() { throw new Error('must not send the file'); } };
  const req = order => ({ params: { id: String(order._id), bookId: String(bookId) }, user, get: () => '' });
  let filter;
  const mock = order => { Order.findOne.mock.mockImplementation(value => { filter = value; return query(order); }); };
  t.mock.method(Order, 'findOne', () => query(null));
  const unpaid = pdfOrder();
  mock(unpaid);
  await assert.rejects(() => download(req(unpaid), res), { code: 'NOT_PAID' });
  assert.equal(String(filter.user), String(user._id));
  const cancelled = pdfOrder({ paymentStatus: 'PAID', paidAt: new Date(), status: 'CANCELLED', cancellationReason: 'x' });
  mock(cancelled);
  await assert.rejects(() => download(req(cancelled), res), { code: 'NOT_PAID' });
  const refunded = pdfOrder({ paymentStatus: 'REFUNDED', paidAt: new Date(), status: 'CANCELLED', cancellationReason: 'x' });
  mock(refunded);
  await assert.rejects(() => download(req(refunded), res), { code: 'NOT_PAID' });
  const physicalOnly = pdfOrder({ shippingAddress: address, paymentStatus: 'PAID', paidAt: new Date(), items: [{ book: bookId, title: 'B', unitPrice: 100, quantity: 1 }] });
  mock(physicalOnly);
  await assert.rejects(() => download(req(physicalOnly), res), { code: 'NOT_FOUND' });
  const paid = pdfOrder({ paymentStatus: 'PAID', paidAt: new Date(), status: 'COMPLETED' });
  mock(paid);
  t.mock.method(Book, 'findById', () => ({ select: async () => ({ pdfFile: 'no-such-file.pdf', slug: 'b' }) }));
  await assert.rejects(() => download(req(paid), res), { code: 'FILE_MISSING' });
});

test('each download uses one purchased download and is refused past the limit', async t => {
  const order = pdfOrder({ paymentStatus: 'PAID', paidAt: new Date(), status: 'COMPLETED', items: [{ book: bookId, format: 'PDF', title: 'B', unitPrice: 100, quantity: 2 }] });
  t.mock.method(Order, 'findOne', () => query(order));
  t.mock.method(Book, 'findById', () => ({ select: async () => ({ pdfFile: 'exists.pdf', slug: 'b' }) }));
  t.mock.method(require('node:fs'), 'existsSync', () => true);
  const update = t.mock.method(Order, 'updateOne', async () => ({ matchedCount: 1 }));
  const req = { params: { id: String(order._id), bookId: String(bookId) }, user, get: () => '' };
  await download(req, { download: (file, name, done) => done() });
  assert.equal(update.mock.callCount(), 1);
  const [where, change] = update.mock.calls[0].arguments;
  assert.equal(change.$inc['items.$.downloadCount'], 1);
  assert.deepEqual(where.items.$elemMatch.downloadCount, { $not: { $gte: 2 } });
  // matchedCount, because timestamps make modifiedCount 1 even when no line qualifies.
  update.mock.mockImplementation(async () => ({ matchedCount: 0, modifiedCount: 1 }));
  await assert.rejects(() => download(req, { download() { throw new Error('must not send the file'); } }), { code: 'DOWNLOAD_LIMIT', status: 403 });
});

test('an aborted download is not an error and gives the download back, but a failed one still is an error', async t => {
  const order = pdfOrder({ paymentStatus: 'PAID', paidAt: new Date(), status: 'COMPLETED' });
  t.mock.method(Order, 'findOne', () => query(order));
  const update = t.mock.method(Order, 'updateOne', async () => ({ matchedCount: 1 }));
  t.mock.method(Book, 'findById', () => ({ select: async () => ({ pdfFile: 'exists.pdf', slug: 'b' }) }));
  t.mock.method(require('node:fs'), 'existsSync', () => true);
  const req = { params: { id: String(order._id), bookId: String(bookId) }, user, get: () => '' };
  await download(req, { download: (file, name, done) => done(Object.assign(new Error('aborted'), { code: 'ECONNABORTED' })) });
  assert.equal(update.mock.calls[1].arguments[1].$inc['items.$.downloadCount'], -1);
  await assert.rejects(() => download(req, { download: (file, name, done) => done(Object.assign(new Error('broken'), { code: 'EIO' })) }), { code: 'EIO' });
  assert.equal(update.mock.calls[3].arguments[1].$inc['items.$.downloadCount'], -1);
});

test('public book JSON never includes pdfFile because the field is unselected by default', () => {
  assert.equal(Book.schema.path('pdfFile').options.select, false);
});

const { Coupon } = require('../models');
const coupons = require('../services/coupon');

function couponMocks(t, fields = {}, { usedBefore = null } = {}) {
  const coupon = new Coupon({ code: 'SALE10', type: 'PERCENT', value: 10, ...fields });
  t.mock.method(Coupon, 'findOne', () => query(coupon));
  t.mock.method(Order, 'exists', () => ({ session: async () => usedBefore }));
  t.mock.method(User, 'updateOne', () => ({ session: async () => ({}) }));
  t.mock.method(Coupon, 'findOneAndUpdate', async () => { coupon.usedCount += 1; return coupon; });
  t.mock.method(Coupon, 'updateOne', async () => { coupon.usedCount -= 1; });
  return coupon;
}

test('discounts respect percentage, cap, fixed amount and subtotal', () => {
  assert.equal(coupons.couponDiscount({ type: 'PERCENT', value: 10, maxDiscount: null }, 125000), 12500);
  assert.equal(coupons.couponDiscount({ type: 'PERCENT', value: 33, maxDiscount: null }, 1001), 330);
  assert.equal(coupons.couponDiscount({ type: 'PERCENT', value: 50, maxDiscount: 20000 }, 100000), 20000);
  assert.equal(coupons.couponDiscount({ type: 'FIXED', value: 30000, maxDiscount: null }, 100000), 30000);
  assert.equal(coupons.couponDiscount({ type: 'FIXED', value: 30000, maxDiscount: null }, 20000), 20000);
});

test('codes are normalized and malformed codes are refused', () => {
  assert.equal(coupons.normalizeCode(' sale-10 '), 'SALE-10');
  for (const bad of ['', 'ab', 'a b c', { $ne: 1 }, null, 'x'.repeat(31)]) assert.throws(() => coupons.normalizeCode(bad), { code: 'COUPON_INVALID' });
});

test('unusable coupons are refused with a shared message for unknown, off and out-of-date codes', async t => {
  const coupon = couponMocks(t);
  const later = new Date(Date.now() + 60000);
  const earlier = new Date(Date.now() - 60000);
  coupon.isActive = false;
  await assert.rejects(() => coupons.usableCoupon(user, 'SALE10', 1000), { code: 'COUPON_INVALID' });
  coupon.isActive = true;
  coupon.startsAt = later;
  await assert.rejects(() => coupons.usableCoupon(user, 'SALE10', 1000), { code: 'COUPON_INVALID' });
  coupon.startsAt = null;
  coupon.expiresAt = earlier;
  await assert.rejects(() => coupons.usableCoupon(user, 'SALE10', 1000), { code: 'COUPON_INVALID' });
  coupon.expiresAt = null;
  coupon.minSubtotal = 5000;
  await assert.rejects(() => coupons.usableCoupon(user, 'SALE10', 4999), { code: 'COUPON_MINIMUM' });
  assert.equal((await coupons.usableCoupon(user, 'SALE10', 5000)).code, 'SALE10');
  coupon.usageLimit = 1;
  coupon.usedCount = 1;
  await assert.rejects(() => coupons.usableCoupon(user, 'SALE10', 5000), { code: 'COUPON_EXHAUSTED' });
  Coupon.findOne.mock.mockImplementation(() => query(null));
  await assert.rejects(() => coupons.usableCoupon(user, 'NOPE1', 5000), { code: 'COUPON_INVALID' });
});

test('a customer cannot reuse a code', async t => {
  couponMocks(t, {}, { usedBefore: { _id: 'order' } });
  await assert.rejects(() => coupons.usableCoupon(user, 'SALE10', 1000), { code: 'COUPON_USED' });
  assert.deepEqual(Order.exists.mock.calls[0].arguments[0].status, { $ne: 'CANCELLED' });
});

test('losing the race for the last use fails the order', async t => {
  couponMocks(t);
  Coupon.findOneAndUpdate.mock.mockImplementation(async () => null);
  await assert.rejects(() => coupons.redeemCoupon(user, 'SALE10', 1000), { code: 'COUPON_EXHAUSTED' });
});

test('an order takes the discount off the books, keeps shipping, and cancelling returns the use', async t => {
  const state = stockMocks(t, 10);
  const originalFee = process.env.SHIPPING_FEE_VND;
  process.env.SHIPPING_FEE_VND = '15000';
  t.after(() => { if (originalFee === undefined) delete process.env.SHIPPING_FEE_VND; else process.env.SHIPPING_FEE_VND = originalFee; });
  const coupon = couponMocks(t);
  t.mock.method(Order, 'findOne', () => query(null));
  const order = await commerce.createOrder(user, { items: [{ book: String(bookId), quantity: 2 }], shippingAddress: address, couponCode: 'sale10', discount: 999999 }, 'coupon-order');
  assert.equal(order.subtotal, 250000);
  assert.equal(order.discount, 25000);
  assert.equal(order.total, 240000);
  assert.equal(order.couponCode, 'SALE10');
  assert.equal(coupon.usedCount, 1);
  Order.findOne.mock.mockImplementation(() => query(order));
  await commerce.transitionOrder(user, String(order._id), 'CANCELLED', 'Changed mind');
  assert.equal(coupon.usedCount, 0);
  assert.equal(state.stock(), 10);
  await commerce.transitionOrder(user, String(order._id), 'CANCELLED', 'Changed mind');
  assert.equal(coupon.usedCount, 0);
});

test('a full discount is allowed for cash but not for an online payment', async t => {
  stockMocks(t, 10);
  couponMocks(t, { value: 100 });
  t.mock.method(Order, 'findOne', () => query(null));
  const input = { items: [{ book: String(bookId), quantity: 1 }], shippingAddress: address };
  await assert.rejects(() => commerce.createOrder(user, { ...input, couponCode: 'SALE10', paymentMethod: 'PAYOS' }, 'free-online', { orderCode: 1700000000000777 }), { code: 'COUPON_TOTAL' });
  const free = await commerce.createOrder(user, { ...input, couponCode: 'SALE10' }, 'free-cash');
  assert.equal(free.total, 0);
});

test('order schema refuses a discount above the subtotal', async () => {
  const order = new Order({ orderNumber: 'ORD-d', user: user._id, idempotencyKey: 'd', requestHash: 'h', shippingAddress: address, discount: 300,
    items: [{ book: bookId, title: 'B', unitPrice: 100, quantity: 2 }] });
  await assert.rejects(() => order.validate(), { name: 'ValidationError' });
});

test('coupon admin input is validated and the code cannot be renamed', async t => {
  const { create, update } = require('../controllers/coupon');
  const res = { status() { return this; }, json() { return this; } };
  const post = body => create({ body }, res);
  await assert.rejects(() => post({ code: 'SALE10', type: 'PERCENT', value: 101 }), { status: 400 });
  await assert.rejects(() => post({ code: 'x', type: 'PERCENT', value: 10 }), { status: 400 });
  await assert.rejects(() => post({ code: 'SALE10', type: 'OTHER', value: 10 }), { status: 400 });
  await assert.rejects(() => post({ code: 'SALE10', type: 'FIXED', value: 0 }), { status: 400 });
  await assert.rejects(() => post({ code: 'SALE10', type: 'FIXED', value: 10, startsAt: '2027-01-02T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z' }), { status: 400 });
  const created = t.mock.method(Coupon, 'create', async fields => fields);
  await post({ code: 'sale10', type: 'FIXED', value: 10, usedCount: 500 });
  assert.equal(created.mock.calls[0].arguments[0].code, 'SALE10');
  assert.equal(created.mock.calls[0].arguments[0].usedCount, undefined);
  const coupon = new Coupon({ code: 'SALE10', type: 'FIXED', value: 10 });
  t.mock.method(Coupon, 'findOne', () => query(coupon));
  await assert.rejects(() => update({ params: { id: String(coupon._id) }, body: { code: 'OTHER' } }, res), { status: 400 });
});
