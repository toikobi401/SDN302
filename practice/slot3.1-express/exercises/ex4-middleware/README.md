# Bài 4 — Middleware

**Slide:** 7 (morgan, `express.static`), 16 (middleware làm được gì), 17 (5 loại middleware), 18 (viết middleware: sửa `req`, sửa `res`, kết thúc chu trình)
**Mục tiêu:** tự viết middleware cho cả 4 việc ở slide 16 và dùng đủ các loại middleware ở slide 17.

## Middleware cần viết (trong thư mục [middlewares/](middlewares/))

| File | Việc làm (slide 16) | Yêu cầu |
|---|---|---|
| [courseHeader.js](middlewares/courseHeader.js) | Sửa **response** | Gắn header `X-Course: SDN302` rồi `next()` |
| [requestTime.js](middlewares/requestTime.js) | Sửa **request** | Gắn `req.requestTime = new Date().toISOString()` rồi `next()` |
| [requestCounter.js](middlewares/requestCounter.js) | Thực thi code bất kỳ | Tăng `req.app.locals.requestCount` thêm 1 rồi `next()` |
| [requireApiKey.js](middlewares/requireApiKey.js) | **Kết thúc** chu trình | Header `x-api-key` khác `sdn302-secret` thì trả về 401 `{ "message": "Unauthorized" }` và **không** gọi `next()` |

## Ráp vào [app.js](app.js)

| Loại (slide 17) | Việc cần làm |
|---|---|
| Third-party | `morgan('dev')` log mọi request |
| Application-level | `courseHeader`, `requestCounter` áp dụng cho **mọi** request, kể cả file tĩnh và 404 |
| Built-in | `express.static` phục vụ thư mục `public/` (`GET /` → `index.html`, `GET /css/style.css`) |
| Application-level | `requestTime`, rồi 2 route: `GET /time` → `{ "requestTime": "..." }`, `GET /stats` → `{ "totalRequests": <số> }` |
| Router-level | `adminRouter` dùng `requireApiKey` cho **mọi** route bên trong, có `GET /admin/dashboard` → `{ "message": "Welcome admin" }` |
| — | Route không tồn tại → 404 `{ "message": "Not Found" }` |

## Tự kiểm tra

```bash
node exercises/ex4-middleware/app.js
```

- Mở <http://localhost:3000/>: thấy trang HTML tĩnh. Xem terminal: `morgan` in ra từng request.
- F12 → tab Network → xem header `X-Course` của từng file.
- Gọi `GET /admin/dashboard` có và không có header `x-api-key: sdn302-secret` ([requests.http](requests.http)).

```bash
npm run check -- 4
```

<details>
<summary>Gợi ý</summary>

- Middleware là hàm `(req, res, next) => { ... }`. Mỗi middleware phải **hoặc** gửi response, **hoặc** gọi `next()`. Không làm gì cả thì request bị treo.
- `res.set('X-Course', 'SDN302')` đặt header. `req.get('x-api-key')` đọc header (không phân biệt hoa thường).
- `express.static` gửi file xong là **kết thúc** chu trình, không gọi `next()`. Vậy middleware nào muốn chạy cho cả file tĩnh thì phải đặt **trước** nó.
- Router-level: `const adminRouter = express.Router(); adminRouter.use(requireApiKey); adminRouter.get('/dashboard', ...); app.use('/admin', adminRouter);`
- Dùng `return res.status(401).json(...)`. Nếu thiếu `return`, code sẽ chạy tiếp tới `next()`, route phía sau lại cố gửi response lần 2 và báo lỗi `Cannot set headers after they are sent to the client`.
- `__dirname` là đường dẫn thư mục chứa file hiện tại (slide 7). Dùng `path.join(__dirname, 'public')` để chạy `node` từ thư mục nào cũng đúng.

</details>

## Mở rộng (không chấm)

- Viết middleware `responseTime` đo thời gian xử lý và log `GET /time - 3ms`. Gợi ý: lắng nghe `res.on('finish', ...)`.
- `app.disable('x-powered-by')`: vì sao nên tắt header này khi deploy?
