const express = require('express');

const app = express();
const port = 3000;

// TODO 0: Khai báo middleware built-in để đọc req.body từ JSON và từ HTML form (urlencoded)

// ---------- /books ----------

// TODO 1: app.all('/books', ...) -> set header Content-Type là text/plain rồi gọi next()

// TODO 2: GET    /books -> 200, "Will send all the books to you!"
// TODO 3: POST   /books -> 201, "Will add the book: <title> by <author>"   (lấy từ req.body)
// TODO 4: PUT    /books -> 403, "PUT operation not supported on /books"
// TODO 5: DELETE /books -> 200, "Deleting all books"

// ---------- /books/new và /books/:id/edit ----------

// TODO 6: GET /books/new      -> 200, "Will show the form to add a new book"
// TODO 7: GET /books/:id/edit -> 200, "Will show the form to edit book: <id>"

// ---------- /books/:id ----------

// TODO 8: app.all('/books/:id', ...) -> set header Content-Type là text/plain rồi gọi next()

// TODO 9:  GET    /books/:id -> 200, "Will send details of the book: <id> to you!"
// TODO 10: POST   /books/:id -> 403, "POST operation not supported on /books/<id>"
// TODO 11: PUT    /books/:id -> 200, trả về 2 dòng (dùng res.write rồi res.end):
//            Updating the book: <id>
//            Will update the book: <title> by <author>
// TODO 12: DELETE /books/:id -> 200, "Deleting book: <id>"

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
