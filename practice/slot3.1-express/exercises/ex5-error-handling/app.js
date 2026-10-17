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

// Quy ước: MỌI lỗi đều trả về JSON dạng { "status": <mã lỗi>, "message": "<thông báo>" }
// và phải đi qua error-handling middleware (TODO 6), KHÔNG tự res.status(4xx).json(...) trong route.

app.get('/books', (req, res) => {
  res.json(books);
});

// TODO 1: GET /books/:id
//         - id không phải số nguyên -> next(createError(400, 'Invalid book id: <id>'))
//         - không tìm thấy          -> next(createError(404, 'Book not found'))
//         - tìm thấy                -> 200, JSON cuốn sách

// TODO 2: POST /books
//         - thiếu title hoặc author -> lỗi 400 'title and author are required'
//         - hợp lệ                  -> 201, JSON sách mới (id không trùng)

// TODO 3: GET /boom -> ném lỗi ĐỒNG BỘ: throw new Error('Boom!')

// TODO 4: GET /async-boom -> await failingTask() trong try/catch, catch thì next(err)

// TODO 5: Middleware 404 cho route không tồn tại
//         -> lỗi 404 với message 'Route <METHOD> <url> not found'  (vd: 'Route GET /abc not found')

// TODO 6: Error-handling middleware (4 tham số!) -> res.status(status).json({ status, message })
//         - status = err.status (không có thì 500)
//         - Body JSON sai cú pháp (err.type === 'entity.parse.failed') -> message 'Invalid JSON body'

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
