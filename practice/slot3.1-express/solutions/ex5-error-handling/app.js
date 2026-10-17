const express = require('express');
const books = require('./data/books');

const app = express();
const port = 3000;

app.use(express.json());

// Tạo một Error có kèm HTTP status để error handler biết trả về mã nào
function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Giả lập một tác vụ bất đồng bộ bị lỗi (ví dụ: truy vấn database thất bại)
function failingTask() {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Async boom!')), 10);
  });
}

app.get('/books', (req, res) => {
  res.json(books);
});

app.get('/books/:id', (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return next(createError(400, `Invalid book id: ${req.params.id}`));
  }

  const book = books.find((b) => b.id === id);
  if (!book) {
    return next(createError(404, 'Book not found'));
  }

  res.json(book);
});

app.post('/books', (req, res, next) => {
  const { title, author } = req.body || {};
  if (!title || !author) {
    return next(createError(400, 'title and author are required'));
  }

  const nextId = books.length === 0 ? 1 : Math.max(...books.map((b) => b.id)) + 1;
  const newBook = { id: nextId, title, author };
  books.push(newBook);
  res.status(201).json(newBook);
});

// Lỗi ĐỒNG BỘ: Express tự bắt và chuyển tới error handler
app.get('/boom', () => {
  throw new Error('Boom!');
});

// Lỗi BẤT ĐỒNG BỘ: dùng try/catch rồi next(err)
// (Express 5 tự chuyển promise bị reject tới error handler, Express 4 thì KHÔNG -> server có thể sập)
app.get('/async-boom', async (req, res, next) => {
  try {
    await failingTask();
    res.send('Không bao giờ tới được dòng này');
  } catch (err) {
    next(err);
  }
});

// 404: không route nào khớp -> tạo lỗi và đẩy xuống error handler
app.use((req, res, next) => {
  next(createError(404, `Route ${req.method} ${req.originalUrl} not found`));
});

// Error-handling middleware: BẮT BUỘC đủ 4 tham số (err, req, res, next), đặt CUỐI CÙNG
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err); // đã gửi response rồi thì giao lại cho Express xử lý
  }

  const status = err.status || err.statusCode || 500;
  let message = err.message;

  if (err.type === 'entity.parse.failed') {
    message = 'Invalid JSON body'; // lỗi do express.json() không parse được body
  } else if (status >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error'; // không lộ chi tiết lỗi server ra ngoài khi chạy thật
  }

  res.status(status).json({ status, message });
});

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
