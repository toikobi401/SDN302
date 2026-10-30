const { Schema, model } = require('mongoose');
const { integer, options, reference } = require('./shared.js');

const itemSchema = new Schema({ book: reference('Book'), quantity: integer(1) }, { _id: false });
const schema = new Schema({
  user: reference('User'),
  items: {
    type: [itemSchema],
    default: [],
    validate: {
      validator: items => new Set(items.map(item => String(item.book))).size === items.length,
      message: 'A book may only appear once in a cart',
    },
  },
}, options);

schema.index({ user: 1 }, { unique: true });
const Cart = model('Cart', schema, 'carts');

module.exports = { Cart };
