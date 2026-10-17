# ★ Thử thách — Student Management API

**Kiến thức:** toàn bộ Slot 3.1 (routing, RESTful, router, middleware, error handling)
**Mục tiêu:** tự dựng một REST API hoàn chỉnh **từ file trống**, chỉ dựa vào đặc tả. Đây là dạng bài hay gặp trong bài kiểm tra thực hành.

## Dữ liệu

[data/students.js](data/students.js): 4 sinh viên `{ id, name, email, gpa }`.

## Cấu trúc bắt buộc

```
challenge-student-api/
├── app.js
├── data/students.js           (có sẵn)
├── routes/studentRouter.js    ← BẮT BUỘC, export express.Router()
├── middlewares/               ← tuỳ bạn tổ chức (gợi ý: requestId.js, validateStudent.js, errorHandler.js)
└── utils/                     ← tuỳ chọn (gợi ý: createError.js)
```

`app.js` gắn `studentRouter` tại **`/api/students`**.

## Định dạng lỗi

Mọi lỗi đều là JSON: `{ "status": <mã>, "message": "<thông báo>" }`
Lỗi validate có thêm mảng `errors`: `{ "status": 400, "message": "Validation failed", "errors": ["...", "..."] }`

## Middleware

| Middleware | Yêu cầu |
|---|---|
| `requestId` | Mỗi request được gán `req.id` tăng dần 1, 2, 3, ... và **mọi** response (kể cả lỗi) có header `X-Request-Id` |
| `validateStudent` | **POST**: bắt buộc đủ 3 field. **PUT**: chỉ kiểm tra field có gửi lên, nhưng phải có ít nhất 1 field. Mỗi field sai thêm 1 chuỗi vào `errors` và chuỗi đó **phải chứa tên field** (`name`, `email`, `gpa`) |
| error handler | Gom mọi lỗi theo định dạng trên. Body JSON sai cú pháp → 400 `Invalid JSON body` |

Luật validate:
- `name`: string, không rỗng sau khi `trim()`
- `email`: string đúng dạng email (có `@` và dấu `.` sau `@`)
- `gpa`: kiểu **number** (chuỗi `"3.5"` là sai), từ 0 đến 4

## Endpoints

| Method | Path | Thành công | Lỗi |
|---|---|---|---|
| GET | `/api/students` | 200 `{ "count": 4, "data": [...] }` | |
| GET | `/api/students?minGpa=3.5` | 200 chỉ sinh viên `gpa >= 3.5` | `minGpa` không phải số → 400 `minGpa must be a number` |
| GET | `/api/students/:id` | 200 sinh viên | id không phải số nguyên dương → 400 `Invalid student id: <id>` · không có → 404 `Student not found` |
| POST | `/api/students` | 201 sinh viên mới (`id` không trùng) | validate → 400 · email đã tồn tại (**không phân biệt hoa thường**) → 409 `Email already exists` |
| PUT | `/api/students/:id` | 200 sinh viên sau khi sửa (không đổi `id`) | validate → 400 · 404 · trùng email **người khác** → 409 |
| DELETE | `/api/students/:id` | **204**, không có body | 404 |
| PUT | `/api/students` | | 403 `PUT operation not supported on /api/students` |
| DELETE | `/api/students` | | 403 `DELETE operation not supported on /api/students` |
| * | *route khác* | | 404 `Route <METHOD> <url> not found` |

## Tự kiểm tra

```bash
node exercises/challenge-student-api/app.js    # thử với requests.http
npm run check -- challenge                      # 19 test
```

<details>
<summary>Gợi ý (chỉ mở khi bí)</summary>

- **Middleware factory** là một hàm *trả về* middleware, giống `morgan('dev')` hay `express.static('public')`. Bạn có thể viết `validateStudent({ partial: true })` để dùng chung một hàm cho cả POST lẫn PUT.
- Gắn middleware vào **một route cụ thể**: `router.route('/').post(validateStudent(), handler)`. Một route có thể nhận nhiều handler nối tiếp nhau.
- Trong handler đồng bộ có thể `throw createError(404, ...)`, Express tự chuyển lỗi tới error handler.
- `res.status(204).end()`: đừng dùng `.json()` với 204.
- So sánh email không phân biệt hoa thường: `a.toLowerCase() === b.toLowerCase()`.
- Khi PUT giữ nguyên email của chính mình thì không tính là trùng. Loại trừ chính sinh viên đó khi kiểm tra.

</details>
