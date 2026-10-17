const express = require('express');
const books = require('../data/books');

const bookRouter = express.Router();

// Middleware cấp router: chỉ áp dụng cho các route trong bookRouter
bookRouter.use(express.json());
bookRouter.use(express.urlencoded({ extended: true }));

const findIndexById = (id) => books.findIndex((book) => book.id === Number(id));

// req.baseUrl = đường dẫn router được gắn vào (ở đây là '/api/books')
bookRouter
  .route('/')
  .get((req, res) => {
    res.status(200).json(books);
  })
  .post((req, res) => {
    const { title, author, year } = req.body || {};
    if (!title || !author) {
      return res.status(400).json({ message: 'title and author are required' });
    }

    const nextId = books.length === 0 ? 1 : Math.max(...books.map((book) => book.id)) + 1;
    const newBook = { id: nextId, title, author, year: year === undefined ? null : Number(year) };
    books.push(newBook);
    res.status(201).json(newBook);
  })
  .put((req, res) => {
    res.status(403).json({ message: `PUT operation not supported on ${req.baseUrl}` });
  })
  .delete((req, res) => {
    res.status(403).json({ message: `DELETE operation not supported on ${req.baseUrl}` });
  });

bookRouter
  .route('/:id')
  .get((req, res) => {
    const index = findIndexById(req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json(books[index]);
  })
  .post((req, res) => {
    res
      .status(403)
      .json({ message: `POST operation not supported on ${req.baseUrl}/${req.params.id}` });
  })
  .put((req, res) => {
    const index = findIndexById(req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, author, year } = req.body || {};
    const book = books[index];
    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (year !== undefined) book.year = Number(year);

    res.status(200).json(book);
  })
  .delete((req, res) => {
    const index = findIndexById(req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const [deletedBook] = books.splice(index, 1);
    res.status(200).json(deletedBook);
  });

module.exports = bookRouter;
