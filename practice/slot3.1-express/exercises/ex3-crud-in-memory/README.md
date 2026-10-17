# Bài 3 — CRUD với dữ liệu trong bộ nhớ

**Slide:** 23 (file dữ liệu `articles.js`), 24–32 và **speaker notes** của slide 26–28 (code CRUD thật với `findIndex`, `splice`)
**Mục tiêu:** thay các câu thông báo ở Bài 2 bằng thao tác thật trên mảng `books` ([data/books.js](data/books.js)), trả về JSON với status code đúng.

## Yêu cầu

Hoàn thành các `TODO` trong [app.js](app.js). Mọi response là **JSON**.

| Method | Path | Thành công | Lỗi |
|---|---|---|---|
| GET | `/books` | 200 — mảng tất cả sách | |
| GET | `/books/:id` | 200 — cuốn sách | 404 `{ "message": "Book not found" }` |
| POST | `/books` | 201 — sách mới (có `id`) | 400 `{ "message": "title and author are required" }` |
| PUT | `/books/:id` | 200 — sách sau khi sửa | 404 `{ "message": "Book not found" }` |
| DELETE | `/books/:id` | 200 — sách vừa xoá | 404 `{ "message": "Book not found" }` |

Quy tắc:
- `PUT` chỉ cập nhật `title`, `author`, `year` **có trong body**, field không gửi thì giữ nguyên. Client **không được** đổi `id`.
- `id` mới khi `POST` **không bao giờ trùng** với sách đang có, kể cả sau khi đã xoá bớt.

## Tự kiểm tra

Chạy server rồi dùng [requests.http](requests.http) hoặc Postman.

```bash
npm run check -- 3
```

<details>
<summary>Gợi ý</summary>

- `req.params.id` là string, `book.id` là number, nên `book.id === req.params.id` luôn `false`. Ép kiểu bằng `Number(req.params.id)`.
- `books.findIndex(...)` trả về `-1` khi không tìm thấy. `books.splice(index, 1)` xoá và trả về **mảng** phần tử đã xoá.
- **Bẫy trong speaker notes slide 26:** `id: articles.length + 1`. Ví dụ có id `[1, 2, 3]`, xoá 2 còn `[1, 3]`, POST sẽ tạo `length + 1 = 3`, trùng id! Cách an toàn: `Math.max(...books.map(b => b.id)) + 1`.
- **Bẫy trong speaker notes slide 28:** `res.status(204).json(deletedArticle)`. Status **204 No Content** không bao giờ có body, JSON bị bỏ đi âm thầm. Muốn trả về sách đã xoá thì dùng 200.
- **Bẫy trong speaker notes slide 27:** `{ ...articles[index], ...req.body }` cho phép client ghi đè cả `id` (và bất kỳ field lạ nào). Chỉ copy những field cho phép.
- Express 5: `req.body` là `undefined` nếu request không gửi body. Viết `const { title } = req.body || {};` cho an toàn.

</details>

## Mở rộng (không chấm)

- `GET /books?author=Tô Hoài` chỉ trả về sách của tác giả đó (đọc `req.query.author`).
- Restart server: dữ liệu vừa thêm biến mất. Vì sao? (Câu trả lời nằm ở Slot 3.2 — MongoDB.)
