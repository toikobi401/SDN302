const express = require('express');

const indexRouter = require('./routes/index');
const bookRouter = require('./routes/bookRouter');

const app = express();
const port = 3000;

// Gắn router vào app: mọi route trong bookRouter được "cộng" thêm tiền tố /api/books
//   bookRouter.route('/')    -> /api/books
//   bookRouter.route('/:id') -> /api/books/:id
app.use('/', indexRouter);
app.use('/api/books', bookRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
