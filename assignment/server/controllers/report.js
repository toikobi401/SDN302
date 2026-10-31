const { Order, Book } = require('../models');
const { dateRange, list, page } = require('../lib/http');

async function summary(req, res) {
  const createdFilter = dateRange(req.query);
  const completedFilter = dateRange(req.query, 'completedAt');
  const [ordersByStatus, revenue] = await Promise.all([
    Order.aggregate([{ $match: createdFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: { ...completedFilter, status: 'COMPLETED', paymentStatus: 'PAID' } },
      { $group: { _id: null, orders: { $sum: 1 }, bookRevenue: { $sum: '$subtotal' }, shippingRevenue: { $sum: '$shippingFee' }, totalCollected: { $sum: '$total' } } }]),
  ]);
  res.json({ data: { ordersByStatus, revenue: revenue[0] ? { ...revenue[0], _id: undefined } : { orders: 0, bookRevenue: 0, shippingRevenue: 0, totalCollected: 0 }, currency: 'VND' } });
}

async function bestSellers(req, res) {
  const pagination = page(req.query);
  const data = await Order.aggregate([
    { $match: { ...dateRange(req.query, 'completedAt'), status: 'COMPLETED', paymentStatus: 'PAID' } },
    { $unwind: '$items' },
    { $group: { _id: '$items.book', quantitySold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
    { $sort: { quantitySold: -1, _id: 1 } },
    { $facet: { data: [{ $skip: pagination.skip }, { $limit: pagination.limit },
      { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
      { $set: { book: { $arrayElemAt: ['$book', 0] } } }], count: [{ $count: 'total' }] } },
  ]);
  const total = data[0]?.count[0]?.total || 0;
  res.json({ data: data[0]?.data || [], pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) } });
}

async function lowStock(req, res) {
  res.json(await list(Book, { status: 'ACTIVE', $expr: { $lte: ['$stock', '$lowStockThreshold'] } }, req.query, { sort: { stock: 1, _id: 1 } }));
}

module.exports = { summary, bestSellers, lowStock };
