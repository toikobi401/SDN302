const { Schema, model } = require('mongoose');
const { integer, nonEmptyUniqueBooks, options, reference } = require('./shared.js');

const itemSchema = new Schema({
  book: reference('Book'),
  title: { type: String, required: true, trim: true },
  quantity: integer(1),
  unitCost: integer(),
  lineTotal: integer(),
}, { _id: false });

const schema = new Schema({
  receiptNumber: { type: String, required: true, trim: true, immutable: true },
  idempotencyKey: { type: String, required: true, trim: true, immutable: true },
  requestHash: { type: String, required: true, immutable: true },
  supplier: reference('Supplier'),
  supplierName: { type: String, required: true, trim: true },
  createdBy: reference('User'),
  items: {
    type: [itemSchema], required: true,
    validate: { validator: nonEmptyUniqueBooks, message: 'Receipt requires distinct book items' },
  },
  total: integer(),
  currency: { type: String, enum: ['VND'], default: 'VND', required: true },
  status: { type: String, enum: ['DRAFT', 'RECEIVED', 'CANCELLED'], default: 'DRAFT', required: true },
  receivedBy: reference('User', false),
  receivedAt: Date,
  note: { type: String, trim: true },
}, options);

schema.pre('validate', function () {
  for (const item of this.items) item.lineTotal = item.unitCost * item.quantity;
  this.total = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  if (this.status === 'RECEIVED') {
    if (!this.receivedAt) this.invalidate('receivedAt', 'receivedAt is required');
    if (!this.receivedBy) this.invalidate('receivedBy', 'receivedBy is required');
  }
});

schema.index({ receiptNumber: 1 }, { unique: true });
schema.index({ createdBy: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ supplier: 1, createdAt: -1 });
schema.index({ status: 1, receivedAt: -1 });
const PurchaseReceipt = model('PurchaseReceipt', schema, 'purchaseReceipts');

module.exports = { PurchaseReceipt };
