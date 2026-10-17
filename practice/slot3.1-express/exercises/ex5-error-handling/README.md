# Bài 5 — Xử lý lỗi

**Slide:** 11 (middleware 404), 17 (error-handling middleware), 24–32 (khối `try/catch` trong mỗi route), 49 (Exercise: Handling errors)
**Mục tiêu:** gom mọi lỗi về **một** error-handling middleware duy nhất, trả về JSON thống nhất, không để request bị treo hay lộ stack trace.

## Quy ước

Mọi lỗi trả về JSON dạng:

```json
{ "status": 404, "message": "Book not found" }
```

Route **không** tự viết `res.status(4xx).json(...)` mà gọi `next(createError(status, message))`. Hàm `createError` đã có sẵn trong [app.js](app.js).

## Yêu cầu

| # | Route | Kết quả |
|---|---|---|
| 1 | `GET /books/:id` | `id` không phải số nguyên → **400** `Invalid book id: <id>` · không có → **404** `Book not found` · có → 200 JSON sách |
| 2 | `POST /books` | thiếu `title`/`author` → **400** `title and author are required` · hợp lệ → 201 |
| 3 | `GET /boom` | `throw new Error('Boom!')` (lỗi đồng bộ) → **500** `Boom!` |
| 4 | `GET /async-boom` | `await failingTask()` trong `try/catch`, `catch` gọi `next(err)` → **500** `Async boom!` |
| 5 | *route không tồn tại* | **404** `Route <METHOD> <url> not found`, ví dụ `Route GET /abc not found` |
| 6 | Error handler | `(err, req, res, next)` → `res.status(status).json({ status, message })`, `status = err.status` hoặc 500 |
| 6b | Body JSON sai cú pháp | (`err.type === 'entity.parse.failed'`) → **400** `Invalid JSON body` |

## Tự kiểm tra

Chạy server, gửi thử các request trong [requests.http](requests.http), đặc biệt request **JSON sai cú pháp** ở cuối file.

```bash
npm run check -- 5
```

<details>
<summary>Gợi ý</summary>

- Express nhận ra error-handling middleware nhờ **đủ 4 tham số** `(err, req, res, next)`. Viết thiếu `next` thì Express coi nó là middleware thường và bỏ qua khi có lỗi (dù `next` không dùng tới vẫn phải khai báo).
- Thứ tự cuối file: *các route* → *middleware 404* → *error handler*.
- Middleware 404 không cần tự trả response, chỉ cần `next(createError(404, ...))` để error handler lo phần định dạng.
- `req.method`, `req.originalUrl` cho biết method và URL gốc của request.
- `throw` trong handler **đồng bộ** thì Express tự bắt. Trong handler **async**:
  - Express 4: promise bị reject **không** được bắt. Client không nhận được response, và Node ≥ 15 sẽ làm **sập cả server**. Bắt buộc `try/catch` + `next(err)` (như slide).
  - Express 5: tự bắt. Nhưng vẫn nên viết `try/catch` để code chạy được ở cả hai phiên bản.
- `express.json()` gặp body hỏng sẽ tự tạo lỗi có `err.status = 400` và `err.type = 'entity.parse.failed'`, rồi chuyển thẳng tới error handler của bạn.

</details>

## Mở rộng (không chấm)

- Khi `NODE_ENV=production`, lỗi 500 chỉ trả `"Internal Server Error"` để không lộ chi tiết bên trong server.
- Thêm `stack` vào JSON **chỉ khi** đang ở môi trường development (xem cách `express-generator` làm trong `app.js` ở Bài 7).
