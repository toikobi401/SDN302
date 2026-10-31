const { Schema, model } = require('mongoose');
const { options } = require('./shared.js');

const schema = new Schema({
  code: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  contactName: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  note: { type: String, trim: true },
  isActive: { type: Boolean, default: true, required: true },
}, options);

schema.index({ code: 1 }, { unique: true });
schema.index({ name: 1 });
const Supplier = model('Supplier', schema, 'suppliers');

module.exports = { Supplier };
