const { Schema, model } = require('mongoose');
const { addressSchema, options } = require('./shared.js');

const savedAddressSchema = new Schema({
  label: { type: String, trim: true },
  address: { type: addressSchema, required: true },
});

const schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  // The authentication service must hash passwords before assigning this field.
  passwordHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0, select: false },
  role: { type: String, enum: ['CUSTOMER', 'ADMIN'], default: 'CUSTOMER', required: true },
  phone: { type: String, trim: true },
  addresses: { type: [savedAddressSchema], default: [] },
  isActive: { type: Boolean, default: true, required: true },
}, options);

schema.index({ email: 1 }, { unique: true });
const User = model('User', schema, 'users');

module.exports = { User };
