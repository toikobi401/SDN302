const { Schema, model } = require('mongoose');
const { integer, options, reference } = require('./shared.js');

const schema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  authors: {
    type: [{ type: String, required: true, trim: true }],
    required: true,
    validate: { validator: value => value.length > 0, message: 'At least one author is required' },
  },
  publisher: { type: String, trim: true },
  isbn: {
    type: String,
    trim: true,
    set: value => typeof value === 'string' ? value.replace(/[\s-]/g, '') || undefined : value,
    match: /^(?:\d{9}[\dXx]|\d{13})$/,
  },
  description: { type: String, default: '' },
  coverImageUrl: { type: String, trim: true },
  coverImagePublicId: { type: String, trim: true },
  imageUrls: { type: [String], default: [] },
  imagePublicIds: { type: [String], default: [] },
  categories: { type: [reference('Category')], default: [] },
  price: integer(),
  // Available quantity: placing an order reduces it; cancellation restores it.
  stock: integer(0, 0),
  lowStockThreshold: integer(0, 5),
  status: { type: String, enum: ['ACTIVE', 'DISCONTINUED'], default: 'ACTIVE', required: true },
  source: { type: String, trim: true },
  sourceId: { type: String, trim: true },
  license: { type: String, trim: true },
  licenseUrl: { type: String, trim: true },
  ebookFormat: { type: String, enum: ['EPUB', 'PDF'] },
  ebookUrl: { type: String, trim: true },
  // Only the file name inside data/books/pdfs; hidden by default so no public API can return it.
  pdfFile: { type: String, trim: true, match: /^[a-z0-9-]+\.pdf$/, select: false },
  pdfPrice: { type: Number, min: 1, validate: { validator: Number.isSafeInteger, message: '{PATH} must be a safe integer' } },
  pdfForSale: { type: Boolean, default: false, required: true },
}, options);

schema.index({ slug: 1 }, { unique: true });
schema.index({ sourceId: 1 }, { unique: true, partialFilterExpression: { sourceId: { $type: 'string' } } });
schema.index({ isbn: 1 }, { unique: true, partialFilterExpression: { isbn: { $type: 'string' } } });
schema.index({ title: 'text', authors: 'text' }, { default_language: 'none' });
schema.index({ status: 1, categories: 1, price: 1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ status: 1, title: 1 });
const Book = model('Book', schema, 'books');

module.exports = { Book };
