# Đáp án Bài 7 — Express Generator

## Phần B — Đọc hiểu

**1.** `npm start` chạy `node ./bin/www` (xem `scripts.start` trong `package.json`). `bin/www` tạo `http.createServer(app)` rồi gọi `server.listen(port)`. Còn `app.js` chỉ cấu hình app rồi `module.exports = app`, giống cách mọi `app.js` trong bộ bài tập này tách `module.exports` khỏi `listen`.
Port lấy từ `process.env.PORT || '3000'`, nên đổi cổng không cần sửa code:
- PowerShell: `$env:PORT=4000; npm start`
- cmd: `set PORT=4000 & npm start`
- bash: `PORT=4000 npm start`

**2.**

| Dòng trong `app.js` | Loại |
|---|---|
| `app.use(logger('dev'))` (morgan) | Third-party |
| `app.use(express.json())` | Built-in |
| `app.use(express.urlencoded({ extended: false }))` | Built-in |
| `app.use(cookieParser())` | Third-party |
| `app.use(express.static(path.join(__dirname, 'public')))` | Built-in |
| `app.use('/', indexRouter)`, `app.use('/users', usersRouter)` | Gắn router; bên trong router là router-level |
| `app.use(function (req, res, next) { next(createError(404)); })` | Application-level (bắt 404) |
| `app.use(function (err, req, res, next) { ... })` | Error-handling (4 tham số) |

**3.** `router.get('/', ...)` trong `routes/users.js`, trả về text `respond with a resource`. Path trong router là **tương đối** so với chỗ gắn: `app.use('/users', usersRouter)` + `router.get('/')` = `GET /users`.

**4.** `logger` → `json` → `urlencoded` → `cookieParser` → `static` (không có file `abc` nên `next()`) → `indexRouter` (không khớp) → `usersRouter` (không khớp) → middleware 404 gọi `next(createError(404))` → **error handler** gọi `res.status(404)` và `res.render('error')`. Error handler là middleware cuối cùng gửi response.

**5.** Dòng `res.locals.error = req.app.get('env') === 'development' ? err : {};`
`app.get('env')` lấy từ biến môi trường `NODE_ENV`, mặc định là `'development'`. Chạy với `NODE_ENV=production` thì `error` là `{}`, `views/error.ejs` không còn stack để in.

**6.** Semantic versioning `MAJOR.MINOR.PATCH` (slide 8):
- `~4.16.1`: cho phép `>=4.16.1 <4.17.0` (chỉ nâng **patch**).
- `^4.16.1`: cho phép `>=4.16.1 <5.0.0` (nâng **minor** và patch).
- `4.16.1` (không dấu): đúng phiên bản đó.

> Slide 8 gọi `npm install express@4.x.x` là "Exact". Thực ra `4.x.x` là **range** (mọi bản 4.*). Muốn cài đúng một bản thì phải ghi cụ thể, ví dụ `express@4.21.2`.

**7.** `extended: false` dùng thư viện `querystring`, chỉ parse được cặp key-value phẳng. `extended: true` dùng thư viện `qs`, parse được object/mảng lồng nhau từ form, ví dụ `user[name]=An&user[age]=20` → `{ user: { name: 'An', age: '20' } }`.

## Phần C — Gắn router

- Code router: [routes/articleRouter.js](routes/articleRouter.js)
- Thêm vào `myapp/app.js`:

```js
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var articleRouter = require('./routes/articleRouter'); // thêm
var bookRouter = require('./routes/bookRouter'); // thêm (copy từ Bài 6)

// ...

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/articles', articleRouter); // thêm
app.use('/api/books', bookRouter); // thêm

// catch 404 and forward to error handler   <- các router PHẢI đứng trước dòng này
```

Nếu đặt `app.use('/articles', ...)` sau middleware 404 thì request `/articles` đã bị biến thành lỗi 404 trước khi tới router.
