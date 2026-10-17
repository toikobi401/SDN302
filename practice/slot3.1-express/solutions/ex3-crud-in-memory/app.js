const express = require('express');
const books = require('./data/books');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// req.params.id là string -> phải ép sang number trước khi so sánh với book.id
const findIndexById = (id) => books.findIndex((book) => book.id === Number(id));

// GET /books  (mở rộng: /books?author=Tô Hoài)
app.get('/books', (req, res) => {
  const { author } = req.query;
  const result = author ? books.filter((book) => book.author === author) : books;
  res.status(200).json(result);
});

// GET /books/:id
app.get('/books/:id', (req, res) => {
  const index = findIndexById(req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Book not found' });
  }
  res.status(200).json(books[index]);
});

// POST /books
app.post('/books', (req, res) => {
  // Express 5: req.body là undefined nếu request không có body -> dùng `|| {}` cho an toàn
  const { title, author, year } = req.body || {};
  if (!title || !author) {
    return res.status(400).json({ message: 'title and author are required' });
  }

  // KHÔNG dùng books.length + 1: sau khi xoá một phần tử sẽ sinh ra id trùng
  const nextId = books.length === 0 ? 1 : Math.max(...books.map((book) => book.id)) + 1;
  const newBook = { id: nextId, title, author, year: year === undefined ? null : Number(year) };

  books.push(newBook);
  res.status(201).json(newBook);
});

// PUT /books/:id
app.put('/books/:id', (req, res) => {
  const index = findIndexById(req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Book not found' });
  }

  // Chỉ cập nhật các field cho phép -> client không thể đổi id
  const { title, author, year } = req.body || {};
  const book = books[index];
  if (title !== undefined) book.title = title;
  if (author !== undefined) book.author = author;
  if (year !== undefined) book.year = Number(year);

  res.status(200).json(book);
});

// DELETE /books/:id
app.delete('/books/:id', (req, res) => {
  const index = findIndexById(req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Book not found' });
  }

  const [deletedBook] = books.splice(index, 1);
  // Lưu ý: status 204 KHÔNG có body, nên muốn trả về sách đã xoá thì dùng 200
  res.status(200).json(deletedBook);
});

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
