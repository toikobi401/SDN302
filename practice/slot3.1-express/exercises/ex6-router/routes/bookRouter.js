const express = require('express');
const books = require('../data/books');

const bookRouter = express.Router();

// TODO 1: Dùng express.json() và express.urlencoded({ extended: true }) ở CẤP ROUTER (bookRouter.use)

// TODO 2: bookRouter.route('/')  (sẽ thành /api/books khi gắn vào app)
//   .get    -> 200, JSON mảng tất cả sách
//   .post   -> 201, JSON sách mới | thiếu title/author -> 400 { "message": "title and author are required" }
//   .put    -> 403 { "message": "PUT operation not supported on /api/books" }
//   .delete -> 403 { "message": "DELETE operation not supported on /api/books" }
//   Gợi ý: req.baseUrl cho biết router đang được gắn ở đường dẫn nào

// TODO 3: bookRouter.route('/:id')  (sẽ thành /api/books/:id)
//   .get    -> 200, JSON sách | không có -> 404 { "message": "Book not found" }
//   .post   -> 403 { "message": "POST operation not supported on /api/books/<id>" }
//   .put    -> 200, JSON sách đã cập nhật (không đổi id) | không có -> 404
//   .delete -> 200, JSON sách đã xoá | không có -> 404

module.exports = bookRouter;
