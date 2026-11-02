const { Schema, model } = require('mongoose');
const { addressSchema, bookFormats, integer, options, orderStatuses, reference } = require('./shared.js');

const itemSchema = new Schema({
  book: reference('Book'),
  format: { type: String, enum: bookFormats, default: 'PHYSICAL', required: true },
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
  shippingAddress: { type: addressSchema, required() { return this.items.some(item => item.format !== 'PDF'); } },
  items: {
    type: [itemSchema], required: true,
    validate: { validator: items => items.length > 0 && new Set(items.map(item => `${item.book}:${item.format}`)).size === items.length, message: 'Order requires distinct book items' },
  },
  subtotal: integer(),
  shippingFee: integer(0, 0),
  // Kept on the order so later edits to the coupon cannot change what was charged.
  couponCode: { type: String, trim: true, uppercase: true },
  discount: integer(0, 0),
  total: integer(),
  currency: { type: String, enum: ['VND'], default: 'VND', required: true },
  paymentMethod: { type: String, enum: ['COD', 'PAYOS'], default: 'COD', required: true },
  paymentStatus: { type: String, enum: ['UNPAID', 'PAID', 'REFUNDED'], default: 'UNPAID', required: true },
  paidAt: Date,
  refundedAt: Date,
  // payOS requires an integer order code; only PAYOS orders have the payment fields below.
  orderCode: { type: Number, immutable: true, validate: { validator: Number.isSafeInteger, message: 'orderCode must be a safe integer' } },
  checkoutUrl: String,
  paymentExpiresAt: Date,
  paymentReference: String,
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
  if (this.discount > this.subtotal) this.invalidate('discount', 'Discount cannot exceed the subtotal');
  this.total = this.subtotal + this.shippingFee - this.discount;
  for (const item of this.items) if (item.format === 'PDF' && item.quantity !== 1) this.invalidate('items', 'A PDF line always has quantity 1');
  if (this.paymentStatus === 'PAID' && !this.paidAt) this.invalidate('paidAt', 'paidAt is required for paid orders');
});

schema.index({ orderNumber: 1 }, { unique: true });
schema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ user: 1, createdAt: -1 });
schema.index({ user: 1, couponCode: 1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ status: 1, paymentStatus: 1, completedAt: -1 });
schema.index({ orderCode: 1 }, { unique: true, partialFilterExpression: { orderCode: { $type: 'number' } } });
schema.index({ paymentMethod: 1, paymentStatus: 1, status: 1, paymentExpiresAt: 1 });
const Order = model('Order', schema, 'orders');

module.exports = { Order };
