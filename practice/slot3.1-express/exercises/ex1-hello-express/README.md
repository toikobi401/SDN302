# Bài 1 — Hello Express

**Slide:** 9–11 (first program, routes, 404), 15 (route parameters)
**Mục tiêu:** viết route với `app.METHOD(PATH, HANDLER)`, phân biệt `res.send` / `res.json` / `res.status`, đọc `req.params`, bắt 404.

## Yêu cầu

Hoàn thành các `TODO` trong [app.js](app.js):

| Method | Path | Status | Response |
|---|---|---|---|
| GET | `/` | 200 | HTML `<h1>Welcome to My Bookstore</h1>` |
| GET | `/hello` | 200 | Text `Hello, World!` |
| GET | `/hello/:name` | 200 | JSON `{ "message": "Hello, <name>!" }` |
| GET | `/sum/:a/:b` | 200 | JSON `{ "a": 3, "b": 5, "sum": 8 }` |
| GET | `/sum/:a/:b` (a hoặc b không phải số) | 400 | JSON `{ "message": "a and b must be numbers" }` |
| GET | `/about` | 200 | JSON `{ "course": "SDN302", "slot": "3.1", "framework": "Express" }` |
| *mọi route khác* | | 404 | Text `Sorry, that route doesn't exist. Have a nice day!` |

## Tự kiểm tra

```bash
node exercises/ex1-hello-express/app.js
```

Mở trình duyệt: <http://localhost:3000/>, <http://localhost:3000/hello/Dat>, <http://localhost:3000/sum/3/5>, <http://localhost:3000/abc>

```bash
npm run check -- 1
```

<details>
<summary>Gợi ý</summary>

- `res.send('<h1>...</h1>')` tự đặt `Content-Type: text/html`. `res.json({...})` đặt `application/json`.
- `req.params` luôn là **string**: `'3' + '5' === '35'`. Dùng `Number(...)` rồi kiểm tra `Number.isNaN(...)`.
- Khi đã trả lỗi 400 thì dùng `return res.status(400).json(...)` để hàm dừng lại, không chạy tiếp xuống dòng trả kết quả.
- Middleware 404 là `app.use((req, res) => ...)` đặt **cuối cùng**. Express chạy theo thứ tự khai báo; đặt ở đầu thì mọi request đều thành 404.

</details>

## Mở rộng (không chấm)

- Thêm `GET /hello?lang=vi` trả về `Xin chào, World!` (đọc `req.query.lang`).
- Thử `res.sendStatus(401)` và xem trình duyệt hiển thị gì.
