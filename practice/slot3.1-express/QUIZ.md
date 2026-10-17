# Quiz Slot 3.1 — Express JS

Làm trước khi code (khoảng 20 phút). Đáp án nằm trong các mục **▶ Đáp án**, bấm để mở. Hãy tự trả lời trước rồi mới xem.

---

## Phần A — Trắc nghiệm

**A1.** Câu nào mô tả **đúng nhất** Express?
- a) Một runtime JavaScript chạy phía server
- b) Một framework web tối giản, không áp đặt cấu trúc (unopinionated), chạy trên Node.js
- c) Một hệ quản trị cơ sở dữ liệu NoSQL
- d) Một thư viện giao diện phía client

**A2.** Cú pháp tổng quát của route là `app.METHOD(PATH, HANDLER)`. Cái nào **không** phải là `METHOD` hợp lệ?
- a) `app.get`  b) `app.all`  c) `app.fetch`  d) `app.delete`

**A3.** Với route `app.get('/articles/:id', ...)` và request `GET /articles/7?sort=asc`, giá trị nào đúng?
- a) `req.params.id === 7` và `req.query.sort === 'asc'`
- b) `req.params.id === '7'` và `req.query.sort === 'asc'`
- c) `req.body.id === '7'`
- d) `req.params.sort === 'asc'`

**A4.** Trong `package.json` có `"express": "^4.17.1"`. Lệnh `npm install` được phép cài phiên bản nào?
- a) `4.17.0`  b) `4.21.2`  c) `5.0.0`  d) Chỉ đúng `4.17.1`

**A5.** Còn `"express": "~4.17.1"` thì sao?
- a) `4.17.3`  b) `4.18.0`  c) `5.0.0`  d) `4.16.9`

**A6.** Theo slide 16, middleware **không** làm được việc nào sau đây?
- a) Thực thi code bất kỳ
- b) Sửa đổi `req` và `res`
- c) Kết thúc chu trình request-response
- d) Chạy lại middleware đứng **trước** nó trong stack

**A7.** Một middleware không gửi response và cũng **không** gọi `next()`. Điều gì xảy ra?
- a) Express tự chuyển sang middleware kế tiếp
- b) Express tự trả về 404
- c) Request bị treo cho đến khi client hết thời gian chờ (timeout)
- d) Server bị crash

**A8.** Ghép mỗi dòng code với loại middleware (slide 17):

| Code | Loại |
|---|---|
| 1. `app.use(express.json())` | a. Third-party |
| 2. `app.use(morgan('dev'))` | b. Error-handling |
| 3. `router.use(checkLogin)` | c. Built-in |
| 4. `app.use((err, req, res, next) => {...})` | d. Router-level |
| 5. `app.use((req, res, next) => {...})` | e. Application-level |

**A9.** Với `app.use(express.static(__dirname + '/public'))`, file `public/images/logo.png` có URL là gì?
- a) `/public/images/logo.png`  b) `/images/logo.png`  c) `/static/images/logo.png`  d) `/logo.png`

**A10.** Theo bảng RESTful ở slide 21, cặp nào **sai**?
- a) Hiện form sửa: `GET /articles/:id/edit`
- b) Cập nhật: `PUT /articles/:id`
- c) Tạo mới: `POST /articles/new`
- d) Xoá: `DELETE /articles/:id`

**A11.** Status code nào phù hợp nhất khi tạo mới tài nguyên thành công?
- a) 200  b) 201  c) 204  d) 302

**A12.** Trong project do `express-generator` sinh ra, dòng `server.listen(port)` nằm ở đâu?
- a) `app.js`  b) `routes/index.js`  c) `bin/www`  d) `package.json`

**A13.** "Stateless" trong REST (slide 12) nghĩa là gì?
- a) Server không được dùng database
- b) Mỗi request tự mang đủ thông tin để xử lý; server không nhớ trạng thái giữa các request
- c) Client không được lưu cookie
- d) API không được trả về lỗi

**A14.** `app.use(express.json())` dùng để làm gì?
- a) Để `res.json()` hoạt động
- b) Parse body có `Content-Type: application/json` thành object trong `req.body`
- c) Chuyển mọi response sang JSON
- d) Kiểm tra JSON trong file `package.json`

<details>
<summary>▶ Đáp án Phần A</summary>

| Câu | Đáp án | Giải thích |
|---|---|---|
| A1 | b | Slide 3: *Fast, unopinionated, minimalist web framework for Node.js*. Runtime là Node.js. |
| A2 | c | Không có `app.fetch`. `app.all` khớp mọi method. |
| A3 | b | `req.params` và `req.query` luôn là **string**. `req.body` chỉ có khi gửi body. |
| A4 | b | `^` giữ nguyên MAJOR: `>=4.17.1 <5.0.0`. |
| A5 | a | `~` giữ nguyên MAJOR.MINOR: `>=4.17.1 <4.18.0`. |
| A6 | d | Middleware chỉ đi **tới**: `next()` gọi middleware kế tiếp, không quay lại. |
| A7 | c | Không ai trả lời thì request treo. Lỗi này rất hay gặp. |
| A8 | 1-c, 2-a, 3-d, 4-b, 5-e | |
| A9 | b | Thư mục `public` là **gốc** của static. URL không chứa chữ `public`. |
| A10 | c | Tạo mới là `POST /articles`. `/articles/new` là `GET` để **hiện form**. |
| A11 | b | 201 Created. 204 No Content thì không có body. |
| A12 | c | `app.js` chỉ cấu hình và `module.exports = app`. `bin/www` tạo server và listen. |
| A13 | b | |
| A14 | b | Không có nó thì `req.body` là `undefined`. `res.json()` vẫn chạy bình thường mà không cần nó. |

</details>

---

## Phần B — Tìm lỗi (Bug hunt)

Mỗi đoạn code dưới đây có **ít nhất một lỗi**. Nói lỗi là gì, hậu quả ra sao, và cách sửa. Nhiều đoạn lấy **nguyên văn từ slide** hoặc speaker notes.

**B1.**
```js
app.use((req, res) => {
  res.status(404).send("Sorry, that route doesn't exist.");
});
app.get('/', (req, res) => res.send('Home'));
app.get('/hello', (req, res) => res.send('Hello'));
```

**B2.** (slide 31)
```js
app.put('/articles/:id', (req, res) => {
  res.write('Updating the article: ' + req.params.id + '\n');
  res.status(201).end('Will update the article: ' + req.body.title);
});
```

**B3.** (speaker notes slide 26)
```js
app.post('/articles', (req, res) => {
  const newArticle = { id: articles.length + 1, ...req.body };
  articles.push(newArticle);
  res.status(201).json(newArticle);
});
```

**B4.** (speaker notes slide 28)
```js
app.delete('/article/:id', (req, res) => {
  const index = articles.findIndex(a => a.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).send('Article not found');
  const deleted = articles.splice(index, 1);
  res.status(204).json(deleted);
});
```
*(Gợi ý: có 2 lỗi, một lỗi nằm ở path.)*

**B5.** (slide 19, chạy trên Express 5)
```js
app.get('/', (req, res) => res.send('Hello World!'));
app.get('*', (req, res) => res.sendStatus(401));
app.listen(3000, () => console.log(`Example app listening on port ${port}`));
```

**B6.**
```js
app.get('/books/:id', (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  if (!book) res.status(404).json({ message: 'Not found' });
  res.json(book);
});
```
*(Gợi ý: có 2 lỗi.)*

**B7.**
```js
app.use((err, req, res) => {
  res.status(err.status || 500).json({ message: err.message });
});
```

**B8.**
```js
const app = express();
app.post('/books', (req, res) => {
  const { title, author } = req.body;
  res.status(201).json({ title, author });
});
```

**B9.**
```js
app.get('/books/:id', (req, res) => { /* chi tiết sách */ });
app.get('/books/new', (req, res) => res.send('Form thêm sách'));
```

**B10.** (Express 4)
```js
app.get('/books', async (req, res) => {
  const books = await db.findAll(); // giả sử DB lỗi -> promise bị reject
  res.json(books);
});
```

<details>
<summary>▶ Đáp án Phần B</summary>

**B1.** Middleware 404 đặt **trước** các route. Express chạy theo thứ tự khai báo, nên mọi request đều bị trả 404. Sửa: chuyển middleware 404 xuống **cuối**, sau mọi route.

**B2.** `res.write()` đã gửi header kèm status mặc định 200. `res.status(201)` gọi sau đó không còn tác dụng, client nhận **200** (ảnh Postman ở slide 48 cũng hiện `200 OK`). Sửa: gọi `res.status(...)` **trước** `res.write()`.

**B3.** `articles.length + 1` sinh **id trùng** sau khi xoá (id `[1, 2, 3]` → xoá 2 → POST tạo id 3 → trùng). Ngoài ra `...req.body` cho client tự gửi `id` ghi đè. Sửa: `Math.max(...articles.map(a => a.id)) + 1` (hoặc để DB tự sinh id, sẽ học ở slot sau), và chỉ lấy các field cho phép.

**B4.** (1) Path `/article/:id` (số ít) không khớp với tài nguyên `/articles`, client gọi `DELETE /articles/1` sẽ nhận 404. (2) Status **204 No Content không được có body**, `json(deleted)` bị bỏ đi âm thầm. Sửa: `res.status(204).end()`, hoặc dùng 200 nếu muốn trả về phần tử đã xoá. Thêm nữa: `splice` trả về **mảng**, muốn lấy phần tử thì `const [deleted] = ...`.

**B5.** (1) Express 5 không chấp nhận `'*'` trần: app **crash ngay khi khởi động** với lỗi `Missing parameter name at index 1: *`. Sửa: `app.get('/{*splat}', ...)` hoặc dùng `app.use((req, res) => ...)` ở cuối. (2) Biến `port` chưa khai báo, sẽ bị `ReferenceError` trong callback. (3) 401 Unauthorized sai ngữ nghĩa cho "không tìm thấy", nên dùng 404.

**B6.** (1) `req.params.id` là string, so sánh `===` với number luôn `false`, nên **không bao giờ tìm thấy**. Sửa: `Number(req.params.id)`. (2) Thiếu `return` sau khi gửi 404: code chạy tiếp tới `res.json(book)` và báo lỗi `Cannot set headers after they are sent to the client` (`ERR_HTTP_HEADERS_SENT`).

**B7.** Error-handling middleware phải có **đủ 4 tham số** `(err, req, res, next)`. Chỉ có 3 tham số thì Express coi nó là middleware thường (và hiểu `err` là `req`!). Lỗi sẽ không bao giờ tới đây.

**B8.** Thiếu `app.use(express.json())`, nên `req.body` là `undefined` và destructuring ném `TypeError: Cannot destructure property 'title' of 'req.body' as it is undefined`, kết quả là lỗi 500.

**B9.** `/books/:id` khớp luôn `/books/new` (với `id = 'new'`), nên route `/books/new` **không bao giờ chạy**. Sửa: khai báo `/books/new` **trước** `/books/:id`.

**B10.** Ở Express 4, promise bị reject trong handler `async` **không** được chuyển tới error handler. Client không nhận được response, và từ Node 15 trở đi một *unhandled rejection* mặc định sẽ **làm sập cả server** (mọi người dùng khác cũng mất kết nối). Sửa: bọc trong `try { ... } catch (err) { next(err); }` như các slide 24–32. Express 5 thì tự chuyển lỗi này tới error handler.

</details>

---

## Phần C — Đoán thứ tự chạy

```js
app.use((req, res, next) => {
  console.log('A');
  next();
  console.log('B');
});

app.use('/x', (req, res, next) => {
  console.log('C');
  next();
});

app.get('/x', (req, res) => {
  console.log('D');
  res.send('ok');
});

app.get('/y', (req, res) => {
  console.log('E');
  res.send('ok');
});
```

**C1.** Gửi `GET /x`, terminal in ra gì, theo thứ tự nào?
**C2.** Gửi `GET /y` thì sao?
**C3.** Gửi `GET /x/abc` thì sao? Client nhận được gì?

<details>
<summary>▶ Đáp án Phần C</summary>

**C1.** `A C D B`. `next()` là một lời gọi hàm bình thường: các middleware phía sau chạy xong (đồng bộ) thì mới quay lại in `B`.

**C2.** `A E B`. `app.use('/x', ...)` không khớp `/y`.

**C3.** `A C B`. `app.use('/x', ...)` khớp mọi path **bắt đầu bằng** `/x` (khớp tiền tố), còn `app.get('/x')` chỉ khớp **đúng** `/x`. Không route nào trả lời nên client nhận 404 mặc định của Express (`Cannot GET /x/abc`).

</details>
