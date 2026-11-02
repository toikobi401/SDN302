const { Schema, model } = require('mongoose');
const { integer, options } = require('./shared.js');

const optionalInteger = min => ({
  type: Number,
  min,
  default: null,
  validate: { validator: value => value === null || Number.isSafeInteger(value), message: '{PATH} must be a safe integer' },
});

const schema = new Schema({
  code: { type: String, required: true, trim: true, uppercase: true, immutable: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['PERCENT', 'FIXED'], required: true },
  value: integer(1),
  minSubtotal: integer(0, 0),
  maxDiscount: optionalInteger(1),
  usageLimit: optionalInteger(1),
  usedCount: integer(0, 0),
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true, required: true },
}, options);

schema.index({ code: 1 }, { unique: true });
const Coupon = model('Coupon', schema, 'coupons');

module.exports = { Coupon };
