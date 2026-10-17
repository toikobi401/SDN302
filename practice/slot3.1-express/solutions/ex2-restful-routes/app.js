const express = require('express');

const app = express();
const port = 3000;

// Middleware built-in để đọc req.body (phải khai báo TRƯỚC các route cần dùng body)
app.use(express.json()); // application/json
app.use(express.urlencoded({ extended: true })); // application/x-www-form-urlencoded (HTML form)

// ---------- /books ----------

// app.all chạy cho MỌI method tới /books, sau đó next() để chuyển tiếp xuống route bên dưới
app.all('/books', (req, res, next) => {
  res.set('Content-Type', 'text/plain');
  next();
});

app.get('/books', (req, res) => {
  res.status(200).end('Will send all the books to you!');
});

app.post('/books', (req, res) => {
  res.status(201).end(`Will add the book: ${req.body.title} by ${req.body.author}`);
});

app.put('/books', (req, res) => {
  res.status(403).end('PUT operation not supported on /books');
});

app.delete('/books', (req, res) => {
  res.status(200).end('Deleting all books');
});

// ---------- /books/new và /books/:id/edit ----------

// PHẢI khai báo /books/new TRƯỚC /books/:id, nếu không "new" sẽ bị hiểu là một :id
app.get('/books/new', (req, res) => {
  res.status(200).send('Will show the form to add a new book');
});

app.get('/books/:id/edit', (req, res) => {
  res.status(200).send(`Will show the form to edit book: ${req.params.id}`);
});

// ---------- /books/:id ----------

app.all('/books/:id', (req, res, next) => {
  res.set('Content-Type', 'text/plain');
  next();
});

app.get('/books/:id', (req, res) => {
  res.status(200).end(`Will send details of the book: ${req.params.id} to you!`);
});

app.post('/books/:id', (req, res) => {
  res.status(403).end(`POST operation not supported on /books/${req.params.id}`);
});

app.put('/books/:id', (req, res) => {
  // Gọi res.status() TRƯỚC res.write(): khi đã write thì header (kèm status) đã được gửi đi
  res.status(200);
  res.write(`Updating the book: ${req.params.id}\n`);
  res.end(`Will update the book: ${req.body.title} by ${req.body.author}`);
});

app.delete('/books/:id', (req, res) => {
  res.status(200).end(`Deleting book: ${req.params.id}`);
});

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
