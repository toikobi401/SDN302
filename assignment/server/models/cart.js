const { Schema, model } = require('mongoose');
const { bookFormats, integer, options, reference } = require('./shared.js');

const itemSchema = new Schema({ book: reference('Book'), format: { type: String, enum: bookFormats, default: 'PHYSICAL', required: true }, quantity: integer(1) }, { _id: false });
const schema = new Schema({
  user: reference('User'),
  items: {
    type: [itemSchema],
    default: [],
    validate: {
      validator: items => new Set(items.map(item => `${item.book}:${item.format}`)).size === items.length,
      message: 'A book format may only appear once in a cart',
    },
  },
}, options);

schema.index({ user: 1 }, { unique: true });
const Cart = model('Cart', schema, 'carts');

module.exports = { Cart };
