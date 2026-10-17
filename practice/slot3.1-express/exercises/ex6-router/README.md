# Bài 6 — Express Router

**Slide:** 39–47 (`articleRouter` với `express.Router()` và `router.route('/').get().post().put().delete()`)
**Mục tiêu:** tách route ra file riêng, nối chuỗi các method trên cùng một path, gắn router vào app với tiền tố `/api/books`.

## Cấu trúc

```
ex6-router/
├── app.js                 ← gắn router: '/' và '/api/books'
├── data/books.js
└── routes/
    ├── index.js           ← GET /
    └── bookRouter.js      ← toàn bộ CRUD sách
```

## Yêu cầu

**[routes/index.js](routes/index.js)**: `GET /` → `{ "message": "Welcome to Bookstore API", "endpoints": ["/api/books"] }`

**[routes/bookRouter.js](routes/bookRouter.js)**: dùng `express.json()` và `express.urlencoded()` **ở cấp router**, rồi:

| `bookRouter.route(...)` | Method | Kết quả |
|---|---|---|
| `'/'` | GET | 200 mảng sách |
| | POST | 201 sách mới · thiếu field → 400 `{ "message": "title and author are required" }` |
| | PUT | 403 `{ "message": "PUT operation not supported on /api/books" }` |
| | DELETE | 403 `{ "message": "DELETE operation not supported on /api/books" }` |
| `'/:id'` | GET | 200 sách · 404 `{ "message": "Book not found" }` |
| | POST | 403 `{ "message": "POST operation not supported on /api/books/<id>" }` |
| | PUT | 200 sách đã sửa (không đổi `id`) · 404 |
| | DELETE | 200 sách đã xoá · 404 |

**[app.js](app.js)**: gắn `indexRouter` ở `/`, `bookRouter` ở `/api/books`. Route khác trả về 404 `{ "message": "Not Found" }`.

> Có thể tái sử dụng logic CRUD đã viết ở Bài 3.

## Tự kiểm tra

```bash
npm run check -- 6
```

<details>
<summary>Gợi ý</summary>

- `const bookRouter = express.Router();` rồi cuối file `module.exports = bookRouter;`
- Nối chuỗi: `bookRouter.route('/').get(handler).post(handler).put(handler).delete(handler);`
- Trong router, path là **tương đối**: `route('/')` gắn ở `/api/books` thành `/api/books`, `route('/:id')` thành `/api/books/:id`.
- `req.baseUrl` là `'/api/books'`, dùng nó để viết message 403 thay vì gõ cứng đường dẫn. Sau này đổi chỗ gắn router thì message tự đúng.
- Slide 45 viết các handler `.get().post()` **trước** dòng `articleRouter.route('/:id')`. Đó chỉ là do cách cắt slide; trong code thật, `.route('/:id')` phải đứng **trước** chuỗi `.get()...`.

</details>

## Mở rộng (không chấm)

- Thêm `routes/authorRouter.js`: `GET /api/authors` trả về danh sách tác giả **không trùng lặp** lấy từ `books`.
- Tìm hiểu `router.param('id', ...)` để gom việc tìm sách theo id về một chỗ.
