const express = require('express');
const books = require('./data/books');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TODO 1: GET /books -> 200, JSON mảng tất cả sách

// TODO 2: GET /books/:id -> 200, JSON cuốn sách có id tương ứng
//         Không tìm thấy -> 404, { "message": "Book not found" }

// TODO 3: POST /books -> 201, JSON cuốn sách vừa tạo (có id mới)
//         Thiếu title hoặc author -> 400, { "message": "title and author are required" }
//         id mới phải KHÔNG BAO GIỜ trùng với id đã có (kể cả sau khi xoá)

// TODO 4: PUT /books/:id -> 200, JSON cuốn sách sau khi cập nhật
//         Chỉ cập nhật title / author / year có trong body, KHÔNG cho đổi id
//         Không tìm thấy -> 404, { "message": "Book not found" }

// TODO 5: DELETE /books/:id -> 200, JSON cuốn sách vừa bị xoá
//         Không tìm thấy -> 404, { "message": "Book not found" }

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
