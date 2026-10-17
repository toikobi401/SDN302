const express = require('express');

const app = express();
const port = 3000;

// Bài thử thách: đọc đặc tả trong README.md rồi TỰ xây dựng toàn bộ API.
// Cấu trúc thư mục gợi ý:
//   app.js
//   data/students.js            (đã có sẵn)
//   routes/studentRouter.js     (BẮT BUỘC - test sẽ require file này)
//   middlewares/requestId.js
//   middlewares/validateStudent.js
//   middlewares/errorHandler.js
//   utils/createError.js

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Student API listening at http://localhost:${port}`);
  });
}
