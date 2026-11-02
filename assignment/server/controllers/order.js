const { Book, Order } = require('../models');
const { assert, id, list, found, dateRange } = require('../lib/http');
const { pdfPath, pdfExists } = require('../services/pdf');
const commerce = require('../services/commerce');
const payos = require('../services/payos');
const { orderStatuses } = require('../models/shared');

function filter(query) {
  const result = dateRange(query);
  if (query.status !== undefined) {
    assert(orderStatuses.includes(query.status), 400, 'INVALID_QUERY', 'Invalid status');
    result.status = query.status;
  }
  return result;
}

async function create(req, res) {
  res.status(201).json({ data: await payos.placeOrder(req.user, req.body, req.get('Idempotency-Key')) });
}

async function mine(req, res) {
  res.json(await list(Order, { ...filter(req.query), user: req.user._id }, req.query));
}

async function get(req, res) {
  res.json({ data: await found(Order, req.params.id, { user: req.user._id }) });
}

async function cancel(req, res) {
  // Keep customer URLs scoped to ownership even when an admin uses them.
  await found(Order, req.params.id, { user: req.user._id });
  res.json({ data: await payos.cancelOrder({ _id: req.user._id, role: 'CUSTOMER' }, req.params.id, req.body?.reason) });
}

async function download(req, res) {
  const order = await found(Order, req.params.id, { user: req.user._id });
  const bookId = id(req.params.bookId, 'book');
  const line = order.items.find(item => String(item.book) === bookId && item.format === 'PDF');
  assert(line, 404, 'NOT_FOUND', 'This order has no PDF for that book');
  assert(order.paymentStatus === 'PAID' && order.status !== 'CANCELLED', 403, 'NOT_PAID', 'The PDF is available once the order is paid');
  const book = await Book.findById(bookId).select('+pdfFile');
  if (!pdfExists(book?.pdfFile)) {
    console.error(JSON.stringify({ event: 'pdf_file_missing', book: bookId, order: String(order._id), requestId: req.requestId }));
    assert(false, 404, 'FILE_MISSING', 'The PDF file is unavailable; contact the store');
  }
  const pdfLineWhere = downloadCount => ({ _id: order._id, items: { $elemMatch: { book: line.book, format: 'PDF', downloadCount } } });
  // The filter stops concurrent requests going over the limit. $not also matches lines saved before counting existed.
  const claimed = await Order.updateOne(pdfLineWhere({ $not: { $gte: line.quantity } }), { $inc: { 'items.$.downloadCount': 1 } });
  assert(claimed.matchedCount === 1, 403, 'DOWNLOAD_LIMIT', 'You have used all downloads for this PDF');
  await new Promise((resolve, reject) => {
    res.download(pdfPath(book.pdfFile), `${book.slug}.pdf`, async error => {
      if (!error) return resolve();
      // shortcut: a client that aborts near the end keeps its download, upgrade to signed one-time links if that matters.
      await Order.updateOne(pdfLineWhere({ $gt: 0 }), { $inc: { 'items.$.downloadCount': -1 } })
        .catch(refund => console.error(JSON.stringify({ event: 'download_refund_failed', order: String(order._id), name: refund.name })));
      // A customer closing the tab mid-download is not a server error.
      return error.code === 'ECONNABORTED' ? resolve() : reject(error);
    });
  });
}

async function adminList(req, res) {
  const conditions = filter(req.query);
  if (req.query.paymentStatus !== undefined) {
    assert(['UNPAID', 'PAID', 'REFUNDED'].includes(req.query.paymentStatus), 400, 'INVALID_QUERY', 'Invalid payment status');
    conditions.paymentStatus = req.query.paymentStatus;
  }
  res.json(await list(Order, conditions, req.query));
}

async function adminGet(req, res) {
  res.json({ data: await found(Order, req.params.id) });
}

async function updateStatus(req, res) {
  res.json({ data: req.body?.status === 'CANCELLED'
    ? await payos.cancelOrder(req.user, req.params.id, req.body?.reason)
    : await commerce.transitionOrder(req.user, req.params.id, req.body?.status) });
}

async function markPaid(req, res) {
  res.json({ data: await commerce.markPaid(req.user, req.params.id) });
}

async function markRefunded(req, res) {
  res.json({ data: await commerce.markRefunded(req.user, req.params.id) });
}

module.exports = { create, mine, get, cancel, download, adminList, adminGet, updateStatus, markPaid, markRefunded };
