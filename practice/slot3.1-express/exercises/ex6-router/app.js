const express = require('express');

const indexRouter = require('./routes/index');
const bookRouter = require('./routes/bookRouter');

const app = express();
const port = 3000;

// TODO 1: Gắn indexRouter vào đường dẫn '/'
// TODO 2: Gắn bookRouter vào đường dẫn '/api/books'
// TODO 3: Mọi route khác -> 404, JSON { "message": "Not Found" }

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
