# Luyện tập Slot 3.1 — Express JS

Bộ bài tập bám sát slide **Slot3.1_ExpressJS.pptx**. Có 7 bài từ dễ đến khó, 1 bài thử thách và 1 bộ câu hỏi lý thuyết.
Mỗi bài có sẵn **code khởi đầu** (`exercises/`), **test chấm tự động** (`tests/`) và **đáp án** (`solutions/`).

## Chuẩn bị

```bash
cd practice/slot3.1-express
npm install          # cài express 5 + morgan
node -v              # cần Node.js >= 20
```

Để test API thủ công, dùng **Postman** (như slide) hoặc extension **REST Client** của VS Code (mở file `requests.http` trong từng bài rồi bấm *Send Request*).

## Cách làm một bài

1. Đọc đề ở `exercises/<bài>/README.md`.
2. Viết code vào các chỗ `TODO` trong `exercises/<bài>/`.
3. Chạy server để thử bằng tay:
   ```bash
   node exercises/ex1-hello-express/app.js      # rồi mở http://localhost:3000
   ```
   Hoặc dùng `node --watch exercises/ex1-hello-express/app.js` để server tự khởi động lại mỗi khi bạn lưu file.
4. Chấm bài:
   ```bash
   npm run check -- 1            # chấm bài 1
   npm run check -- 3 4          # chấm bài 3 và 4
   npm run check -- challenge    # chấm bài thử thách
   npm run check                 # chấm tất cả
   ```
5. Bí thì xem `solutions/<bài>/`. Muốn kiểm tra đáp án chạy đúng: `npm run check:solution -- 1`.

> Tất cả test phải chuyển từ ✖ sang ✔. Thông báo lỗi của test (bằng tiếng Việt) cho bạn biết đang thiếu gì.

## Lộ trình

| # | Bài | Nội dung chính | Slide | Chấm tự động | Thời gian |
|---|-----|----------------|-------|:---:|:---:|
| 0 | [QUIZ.md](QUIZ.md) | Lý thuyết, semver, tìm lỗi trong code | toàn bộ | tự đối chiếu | 20' |
| 1 | [Hello Express](exercises/ex1-hello-express/README.md) | `app.get`, `res.send`/`res.json`, `req.params`, middleware 404 | 9–11, 15 | ✔ | 20' |
| 2 | [RESTful Routes](exercises/ex2-restful-routes/README.md) | 7 route RESTful, `app.all` + `next()`, `express.json`/`urlencoded`, thứ tự route | 13–15, 21, 24–32 | ✔ | 30' |
| 3 | [CRUD dữ liệu trong bộ nhớ](exercises/ex3-crud-in-memory/README.md) | CRUD thật trên mảng, status code 200/201/400/404 | 23–32 (+ speaker notes) | ✔ | 40' |
| 4 | [Middleware](exercises/ex4-middleware/README.md) | Tự viết middleware, 5 loại middleware, `express.static`, `morgan` | 7, 16–18 | ✔ | 40' |
| 5 | [Xử lý lỗi](exercises/ex5-error-handling/README.md) | `next(err)`, error-handling middleware, lỗi sync/async | 11, 49 | ✔ | 30' |
| 6 | [Express Router](exercises/ex6-router/README.md) | `express.Router()`, `router.route().get().post()...`, `req.baseUrl` | 40–47 | ✔ | 30' |
| 7 | [Express Generator](exercises/ex7-express-generator/README.md) | Sinh project, đọc hiểu `app.js`, gắn router mới | 35–48 | checklist | 30' |
| ★ | [Thử thách: Student API](exercises/challenge-student-api/README.md) | Tự dựng API hoàn chỉnh: router + middleware + validate + lỗi | tổng hợp | ✔ | 90' |

## Express 4 (trong slide) và Express 5 (bạn đang cài)

`npm install express` hiện cài **Express 5**, trong khi slide viết theo Express 4 và `express-generator` vẫn sinh project Express 4.
Phần lớn code trong slide vẫn chạy, chỉ khác mấy điểm sau:

| Vấn đề | Express 4 | Express 5 |
|---|---|---|
| Route bắt tất cả (`app.get('*', ...)` ở slide 19) | chạy được | **Lỗi ngay khi khởi động**: `Missing parameter name at index 1: *`. Dùng `app.get('/{*splat}', ...)` hoặc `app.use(...)` |
| Handler `async` bị lỗi (promise reject) | không có response, Node ≥ 15 còn **sập server**; phải tự `try/catch` + `next(err)` | Express tự chuyển lỗi tới error handler |
| `req.body` khi không có body-parser | `undefined` | `undefined` (vẫn phải `app.use(express.json())`) |
| `express.urlencoded()` mặc định | `extended: true` (có cảnh báo) | `extended: false` — slide luôn ghi rõ `{ extended: true }` là an toàn |

## Cấu trúc thư mục

```
slot3.1-express/
├── README.md                 ← bạn đang đọc
├── QUIZ.md                   ← câu hỏi lý thuyết + tìm lỗi (có đáp án)
├── exercises/                ← LÀM BÀI Ở ĐÂY
│   ├── ex1-hello-express/
│   ├── ...
│   ├── ex7-express-generator/
│   └── challenge-student-api/
├── solutions/                ← đáp án tham khảo
├── tests/                    ← test chấm tự động (không cần sửa)
└── scripts/check.js          ← lệnh npm run check
```

Mọi `app.js` đều kết thúc bằng:

```js
module.exports = app;

if (require.main === module) {
  app.listen(port, ...);
}
```

`require.main === module` chỉ đúng khi bạn chạy trực tiếp `node app.js`. Khi test `require('./app')` thì app **không** listen cổng 3000, test tự mở một cổng ngẫu nhiên. Nhờ vậy bạn vừa chạy server vừa chấm bài cùng lúc được.
