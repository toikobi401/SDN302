const { Schema, model } = require('mongoose');
const { options } = require('./shared.js');

const schema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  description: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
  imagePublicId: { type: String, trim: true },
  isActive: { type: Boolean, default: true, required: true },
}, options);

schema.index({ slug: 1 }, { unique: true });
const Category = model('Category', schema, 'categories');

module.exports = { Category };
