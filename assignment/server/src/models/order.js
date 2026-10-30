const { Schema, model } = require('mongoose');
const { addressSchema, integer, nonEmptyUniqueBooks, options, orderStatuses, reference } = require('./shared.js');

const itemSchema = new Schema({
  book: reference('Book'),
  title: { type: String, required: true, trim: true },
  isbn: String,
  coverImageUrl: String,
  unitPrice: integer(),
  quantity: integer(1),
  lineTotal: integer(),
}, { _id: false });

const historySchema = new Schema({
  status: { type: String, enum: orderStatuses, required: true },
  changedBy: reference('User'),
  changedAt: { type: Date, default: Date.now, required: true },
  note: { type: String, trim: true },
}, { _id: false });

const schema = new Schema({
  orderNumber: { type: String, required: true, trim: true, immutable: true },
  user: reference('User'),
  idempotencyKey: { type: String, required: true, trim: true, immutable: true },
  requestHash: { type: String, required: true, immutable: true },
  shippingAddress: { type: addressSchema, required: true },
  items: {
    type: [itemSchema], required: true,
    validate: { validator: nonEmptyUniqueBooks, message: 'Order requires distinct book items' },
  },
  subtotal: integer(),
  shippingFee: integer(0, 0),
  total: integer(),
  currency: { type: String, enum: ['VND'], default: 'VND', required: true },
  paymentMethod: { type: String, enum: ['COD'], default: 'COD', required: true },
  paymentStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID', required: true },
  paidAt: Date,
  status: { type: String, enum: orderStatuses, default: 'PENDING', required: true },
  statusHistory: { type: [historySchema], default: [] },
  note: { type: String, trim: true },
  cancellationReason: { type: String, trim: true, required() { return this.status === 'CANCELLED'; } },
  cancelledAt: Date,
  completedAt: Date,
  stockReleasedAt: Date,
}, options);

schema.pre('validate', function () {
  for (const item of this.items) item.lineTotal = item.unitPrice * item.quantity;
  this.subtotal = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  this.total = this.subtotal + this.shippingFee;
  if (this.paymentStatus === 'PAID' && !this.paidAt) this.invalidate('paidAt', 'paidAt is required for paid orders');
});

schema.index({ orderNumber: 1 }, { unique: true });
schema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ user: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ status: 1, paymentStatus: 1, completedAt: -1 });
const Order = model('Order', schema, 'orders');

module.exports = { Order };
