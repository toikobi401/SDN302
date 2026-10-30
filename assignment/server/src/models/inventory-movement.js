const { Schema, model } = require('mongoose');
const { integer, reference } = require('./shared.js');

const schema = new Schema({
  book: reference('Book'),
  type: { type: String, enum: ['PURCHASE', 'SALE', 'CANCELLATION', 'ADJUSTMENT'], required: true },
  quantityChange: {
    type: Number, required: true,
    validate: { validator: value => Number.isSafeInteger(value) && value !== 0, message: 'Quantity change must be a nonzero safe integer' },
  },
  stockBefore: integer(),
  stockAfter: integer(),
  order: reference('Order', false),
  purchaseReceipt: reference('PurchaseReceipt', false),
  operationKey: { type: String, required: true, trim: true },
  performedBy: reference('User'),
  reason: { type: String, required: true, trim: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.pre('validate', function () {
  if (this.stockAfter !== this.stockBefore + this.quantityChange) {
    this.invalidate('stockAfter', 'Stock balance does not match quantity change');
  }
  if (this.type === 'SALE' && this.quantityChange >= 0) this.invalidate('quantityChange', 'Sale must reduce stock');
  if (['PURCHASE', 'CANCELLATION'].includes(this.type) && this.quantityChange <= 0) {
    this.invalidate('quantityChange', 'Purchase/cancellation must increase stock');
  }
  if (['SALE', 'CANCELLATION'].includes(this.type) && !this.order) this.invalidate('order', 'Order is required');
  if (this.type === 'PURCHASE' && !this.purchaseReceipt) this.invalidate('purchaseReceipt', 'Purchase receipt is required');
});

schema.index({ book: 1, createdAt: -1 });
schema.index({ operationKey: 1, book: 1 }, { unique: true });
schema.index({ order: 1, book: 1, type: 1 }, {
  unique: true, partialFilterExpression: { order: { $type: 'objectId' } },
});
schema.index({ purchaseReceipt: 1, book: 1, type: 1 }, {
  unique: true, partialFilterExpression: { purchaseReceipt: { $type: 'objectId' } },
});
const InventoryMovement = model('InventoryMovement', schema, 'inventoryMovements');

module.exports = { InventoryMovement };
