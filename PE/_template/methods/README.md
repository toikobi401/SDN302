# TRA CỨU THEO HTTP METHOD

| Method | File | Dùng khi | Tag trong `server.js` |
|---|---|---|---|
| GET | [GET.md](GET.md) | Lấy dữ liệu, không đổi gì trong DB | `@GET-*` `@REPORT-AGG` `@PAGINATION` |
| POST | [POST.md](POST.md) | Tạo mới, hoặc hành động có tác dụng phụ | `@POST-CREATE` `@LOGIN-JWT` |
| PUT | [PUT.md](PUT.md) | Thay **toàn bộ** một bản ghi | `@PUT-UPDATE` |
| PATCH | [PATCH.md](PATCH.md) | Sửa **một phần**, thường là đổi trạng thái | `@PATCH-STATUS` |
| DELETE | [DELETE.md](DELETE.md) | Xoá bản ghi | `@DELETE` |

---

## Bảng status code — học thuộc bảng này

| Code | Tên | Khi nào dùng | Method hay gặp |
|---|---|---|---|
| **200** | OK | Thành công, **có** body trả về | GET, PUT, PATCH, DELETE |
| **201** | Created | Tạo mới thành công | POST |
| **204** | No Content | Thành công, **không** có body | DELETE |
| **400** | Bad Request | Input sai: thiếu field, sai định dạng ObjectId, sai giá trị enum | tất cả |
| **401** | Unauthorized | **Chưa biết bạn là ai**: thiếu token, token sai/hết hạn | route có bảo vệ |
| **403** | Forbidden | **Biết bạn là ai nhưng không đủ quyền**: sai role | route có bảo vệ |
| **404** | Not Found | Tài nguyên không tồn tại trong DB | GET/:id, PUT, PATCH, DELETE |
| **409** | Conflict | Xung đột: trùng dữ liệu, chỗ đã bị chiếm, còn ràng buộc | POST, DELETE |
| **500** | Server Error | Lỗi không lường trước — rơi vào `catch` | tất cả |

### 401 hay 403?

Chuẩn REST: **401** = chưa xác thực, **403** = đã xác thực nhưng không đủ quyền.

> ⚠️ **Nhưng trong phòng thi, đề nói gì thì làm đúng vậy.**
> Đề PE Spring 2026 bắt trả **403 cho cả ba** trường hợp: thiếu `access_key`,
> `access_key` sai, và sai role. Nếu bạn trả 401 cho case đầu vì "đúng chuẩn" thì **mất điểm**.

---

## Quy tắc đặt URL (đề luôn cho sẵn, nhưng cần hiểu để không nhầm route)

```
/api/movies                       danh sách movies
/api/movies/:id                   một movie cụ thể
/api/movies/:id/showtimes         các showtime THUỘC VỀ movie đó  (sub-resource)
/api/showtimes/:id/seats          các seat THUỘC VỀ showtime đó
/api/reports/projects/work-hours  báo cáo — đường dẫn cố định, không có tham số
```

**Danh từ số nhiều, không dùng động từ.** `/api/getMovies` hay `/api/deleteMovie/:id` là sai.

### ⚠️ Thứ tự khai báo route rất quan trọng

Express khớp route **từ trên xuống, gặp cái nào trước dùng cái đó**.

```js
// SAI — mọi request đều rơi vào route :id
app.get('/api/projects/:id', ...);
app.get('/api/projects/report', ...);   // không bao giờ chạy tới, ":id" đã nuốt "report"

// ĐÚNG — đường dẫn cố định phải đặt TRƯỚC đường dẫn có tham số
app.get('/api/projects/report', ...);
app.get('/api/projects/:id', ...);
```

---

## Khung chuẩn — mọi handler đều có hình dạng này

```js
app.<method>('<đường dẫn>', /* middleware nếu có */, async (req, res) => {
    try {
        // 1. Lấy input:  req.params / req.query / req.body / req.headers
        // 2. Validate input                        -> 400
        // 3. Kiểm tra tài nguyên có tồn tại không  -> 404
        // 4. Kiểm tra luật nghiệp vụ               -> 409 / 400
        // 5. Đọc hoặc ghi DB
        // 6. Trả JSON đúng hình dạng đề vẽ         -> 200 / 201 / 204
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

**Thứ tự 4 bước kiểm tra là điểm số.** Làm sai thứ tự sẽ trả nhầm status code:
ví dụ kiểm tra "ghế đã bị đặt chưa" (409) **trước khi** kiểm tra "suất chiếu có tồn tại không" (404)
thì test case 404 của đề sẽ nhận về 409.

---

## Lấy input từ đâu

| Nguồn | Cú pháp | Ví dụ URL / request |
|---|---|---|
| Path param | `req.params.id` | `/api/movies/:id` |
| Query string | `req.query.status` | `/api/movies?status=NOW_SHOWING` |
| Body (JSON) | `req.body.seats` | body của POST/PUT/PATCH |
| Header | `req.headers['access_key']` | header `access_key: abc123` |

> ⚠️ Tên header đọc ra **luôn là chữ thường**: `req.headers['access_key']`, không phải `['Access_Key']`.
> ⚠️ Thiếu `app.use(express.json())` thì `req.body` là `undefined` ở mọi route POST/PUT/PATCH.

---

## Các method khác (HEAD, OPTIONS)

Không cần làm. `HEAD` do Express tự xử lý dựa trên route `GET` tương ứng,
`OPTIONS` do middleware `cors` lo. Đề PE SDN302 chỉ hỏi 5 method ở bảng trên.
