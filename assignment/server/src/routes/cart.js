const { Router } = require('express');
const mongoose = require('mongoose');
const { Cart, Book } = require('../models');
const { authenticate } = require('../middleware/auth');
const { assert, id, number } = require('../lib/http');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.book');
  let subtotal = 0;
  const items = (cart?.items || []).map(item => {
    const available = Boolean(item.book && item.book.status === 'ACTIVE' && item.book.stock >= item.quantity);
    const lineTotal = item.book ? item.book.price * item.quantity : 0;
    subtotal += lineTotal;
    return { book: item.book, quantity: item.quantity, available, lineTotal };
  });
  assert(Number.isSafeInteger(subtotal), 409, 'TOTAL_TOO_LARGE', 'Cart total exceeds supported range');
  res.json({ data: { items, subtotal, currency: 'VND', reservesStock: false } });
});

// PUT sets the exact quantity, so repeating the same request does not add duplicates.
router.put('/items/:bookId', async (req, res) => {
  const book = id(req.params.bookId, 'book');
  const quantity = number(req.body?.quantity, 'quantity', 1);
  let cart;
  try {
    cart = await mongoose.connection.transaction(async session => {
      const exists = await Book.exists({ _id: book, status: 'ACTIVE' }).session(session);
      assert(exists, 404, 'NOT_FOUND', 'Active book not found');
      let document = await Cart.findOne({ user: req.user._id }).session(session);
      if (!document) document = new Cart({ user: req.user._id });
      const item = document.items.find(entry => String(entry.book) === book);
      if (item) item.quantity = quantity;
      else {
        assert(document.items.length < 100, 400, 'CART_LIMIT', 'Maximum 100 distinct books');
        document.items.push({ book, quantity });
      }
      await document.save({ session });
      return document;
    });
  } catch (error) {
    if (error.code === 11000) assert(false, 409, 'CONCURRENT_UPDATE', 'Cart was created concurrently; retry the request');
    throw error;
  }
  res.json({ data: cart });
});
router.delete('/items/:bookId', async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { book: id(req.params.bookId, 'book') } }, $inc: { __v: 1 } });
  res.status(204).end();
});
router.delete('/', async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] }, $inc: { __v: 1 } });
  res.status(204).end();
});

module.exports = router;
