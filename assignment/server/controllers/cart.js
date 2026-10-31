const mongoose = require('mongoose');
const { Cart, Book } = require('../models');
const { assert, id, number } = require('../lib/http');
const { bookFormats } = require('../models/shared');

function formatInput(value) {
  const format = value ?? 'PHYSICAL';
  assert(bookFormats.includes(format), 400, 'INVALID_INPUT', 'format must be PHYSICAL or PDF');
  return format;
}

function cartLine(item) {
  if (!item.book) return { available: false, lineTotal: 0 };
  if (item.format === 'PDF') return { available: item.book.status === 'ACTIVE' && item.book.pdfForSale, lineTotal: item.book.pdfPrice || 0 };
  return { available: item.book.status === 'ACTIVE' && item.book.stock >= item.quantity, lineTotal: item.book.price * item.quantity };
}

async function get(req, res) {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.book');
  let subtotal = 0;
  const items = (cart?.items || []).map(item => {
    const { available, lineTotal } = cartLine(item);
    subtotal += lineTotal;
    return { book: item.book, format: item.format, quantity: item.quantity, available: Boolean(available), lineTotal };
  });
  assert(Number.isSafeInteger(subtotal), 409, 'TOTAL_TOO_LARGE', 'Cart total exceeds supported range');
  res.json({ data: { items, subtotal, currency: 'VND', reservesStock: false } });
}

// PUT sets the exact quantity, so repeating the same request does not add duplicates.
async function setItem(req, res) {
  const book = id(req.params.bookId, 'book');
  const format = formatInput(req.body?.format);
  const quantity = number(req.body?.quantity, 'quantity', 1);
  assert(format !== 'PDF' || quantity === 1, 400, 'INVALID_INPUT', 'A PDF line always has quantity 1');
  let cart;
  try {
    cart = await mongoose.connection.transaction(async session => {
      const exists = await Book.exists({ _id: book, status: 'ACTIVE', ...(format === 'PDF' ? { pdfForSale: true } : {}) }).session(session);
      assert(exists, 404, 'NOT_FOUND', format === 'PDF' ? 'This PDF is not for sale' : 'Active book not found');
      let document = await Cart.findOne({ user: req.user._id }).session(session);
      if (!document) document = new Cart({ user: req.user._id });
      const item = document.items.find(entry => String(entry.book) === book && entry.format === format);
      if (item) item.quantity = quantity;
      else {
        assert(document.items.length < 100, 400, 'CART_LIMIT', 'Maximum 100 distinct books');
        document.items.push({ book, format, quantity });
      }
      await document.save({ session });
      return document;
    });
  } catch (error) {
    if (error.code === 11000) assert(false, 409, 'CONCURRENT_UPDATE', 'Cart was created concurrently; retry the request');
    throw error;
  }
  res.json({ data: cart });
}

async function removeItem(req, res) {
  const format = formatInput(req.query.format);
  // Carts saved before formats existed have no format field and count as physical.
  const match = format === 'PHYSICAL' ? { $in: ['PHYSICAL', null] } : format;
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { book: id(req.params.bookId, 'book'), format: match } }, $inc: { __v: 1 } });
  res.status(204).end();
}

async function clear(req, res) {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] }, $inc: { __v: 1 } });
  res.status(204).end();
}

module.exports = { get, setItem, removeItem, clear };
