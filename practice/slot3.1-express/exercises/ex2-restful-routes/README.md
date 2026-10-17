# Bài 2 — RESTful Routes

**Slide:** 13–15 (application routes, `app.all`, params), 21 (bảng 7 route RESTful), 24–32 (GET/POST/PUT/DELETE)
**Mục tiêu:** dựng bộ khung route RESTful cho tài nguyên `books` giống demo `articles` trong slide, **chưa cần dữ liệu thật** (chỉ trả về câu thông báo).

## Yêu cầu

Hoàn thành các `TODO` trong [app.js](app.js). Tất cả response là **text**.

**Bước 0:** khai báo `express.json()` và `express.urlencoded({ extended: true })`.

**Bước 1:** `app.all('/books', ...)` và `app.all('/books/:id', ...)` đặt header `Content-Type: text/plain` rồi gọi `next()`.

| Tên (slide 21) | Method | Path | Status | Response |
|---|---|---|---|---|
| index | GET | `/books` | 200 | `Will send all the books to you!` |
| create | POST | `/books` | 201 | `Will add the book: <title> by <author>` |
| — | PUT | `/books` | 403 | `PUT operation not supported on /books` |
| — | DELETE | `/books` | 200 | `Deleting all books` |
| new | GET | `/books/new` | 200 | `Will show the form to add a new book` |
| edit | GET | `/books/:id/edit` | 200 | `Will show the form to edit book: <id>` |
| show | GET | `/books/:id` | 200 | `Will send details of the book: <id> to you!` |
| — | POST | `/books/:id` | 403 | `POST operation not supported on /books/<id>` |
| update | PUT | `/books/:id` | 200 | 2 dòng: `Updating the book: <id>` ⏎ `Will update the book: <title> by <author>` |
| destroy | DELETE | `/books/:id` | 200 | `Deleting book: <id>` |

`POST /books` phải nhận được dữ liệu gửi **cả dạng JSON lẫn dạng HTML form** (`x-www-form-urlencoded`).

## Tự kiểm tra

Chạy `node exercises/ex2-restful-routes/app.js`, mở [requests.http](requests.http) (extension REST Client) hoặc Postman:
Body → raw → JSON: `{ "title": "Clean Code", "author": "Robert C. Martin" }`

```bash
npm run check -- 2
```

<details>
<summary>Gợi ý</summary>

- `app.all(path, (req, res, next) => { ...; next(); })` chạy cho **mọi method**. Quên `next()` thì request bị treo.
- `res.end('...')` gửi chuỗi thô, không tự đặt Content-Type. `res.send('...')` cũng giữ nguyên Content-Type nếu đã đặt trước.
- **Thứ tự quan trọng:** `/books/:id` khớp cả `/books/new` (khi đó `id = 'new'`), nên `GET /books/new` phải khai báo **trước** `GET /books/:id`.
- Route PUT có 2 dòng: `res.write('dòng 1\n')` rồi `res.end('dòng 2')`.
- **Bẫy trong slide 31:** slide viết `res.write(...)` rồi mới `res.status(201).end(...)`. Nhưng `res.write` đã gửi header kèm status 200 đi rồi, nên `status(201)` gọi sau đó bị bỏ qua (ảnh Postman ở slide 48 cũng hiện `200 OK`). Muốn đổi status thì gọi `res.status()` **trước** `res.write()`.

</details>

## Mở rộng (không chấm)

- Slide dùng **403 Forbidden** cho thao tác không hỗ trợ. Tìm hiểu mã **405 Method Not Allowed** và header `Allow`, mã nào đúng ngữ nghĩa hơn?
