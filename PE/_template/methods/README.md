# TRA CỨU THEO HTTP METHOD

| Method | File | Dùng khi | Tag trong `server.js` |
|---|---|---|---|
| **(đọc trước tiên)** | [MODELS.md](MODELS.md) | Khai schema, kiểu dữ liệu, validation, map lỗi → status | `@MODEL-*` `@HELPER` `@ERROR-MAP` |
| *(mọi method)* | [QUERY.md](QUERY.md) | Cú pháp filter / update / aggregation — tra khi bí cách viết câu truy vấn | dùng chung mọi khối |
| *(dự phòng)* | [JS-JOIN.md](JS-JOIN.md) | Bỏ populate/aggregation, ghép dữ liệu bằng JavaScript thuần | `@GET-JS` |
| GET | [GET.md](GET.md) | Lấy dữ liệu, không đổi gì trong DB | `@GET-*` `@REPORT-AGG` `@REPORT-AGG2` `@PAGINATION` |
| POST | [POST.md](POST.md) | Tạo mới, hoặc hành động có tác dụng phụ | `@POST-CREATE` `@POST-OVERLAP` `@POST-CAPACITY` |
| PUT | [PUT.md](PUT.md) | Thay **toàn bộ** một bản ghi | `@PUT-UPDATE` |
| PATCH | [PATCH.md](PATCH.md) | Sửa **một phần**, đổi trạng thái, sửa phần tử mảng | `@PATCH-STATUS` `@PATCH-ARRAY` `@INC` |
| DELETE | [DELETE.md](DELETE.md) | Xoá bản ghi | `@DELETE` |
| *(mọi method)* | [AUTH.md](AUTH.md) | Route có bảo vệ: `access_key` hoặc JWT, phân quyền role | `@AUTH-KEY` `@AUTH-JWT` `@AUTH-ROLE` `@LOGIN-JWT` |

## Tra ngược: đề ra dạng này → mở file nào

| Đề nhắc tới | Mở |
|---|---|
| "between", "from/to", khoảng ngày | [GET.md §9a](GET.md#9a-khoảng-thời-gian) |
| "genre contains", mảng chứa giá trị | [GET.md §9b](GET.md#9b-mảng-chứa-giá-trị) |
| "average", "highest", "top 5", "percentage" | [GET.md §11](GET.md#11-biến-thể-aggregation-đề-có-thể-ra) |
| "same room at the same time", "schedule conflict" | [POST.md §8](POST.md#8-chống-trùng-lịch--trùng-khung-giờ) |
| "exceeds capacity", "sold out", "hết chỗ" | [POST.md §9](POST.md#9-kiểm-tra-sức-chứa) |
| "already registered", email trùng | [POST.md §10](POST.md#10-trùng-dữ-liệu-unique) |
| "update a seat", sửa 1 phần tử trong mảng | [PATCH.md §5](PATCH.md#5-sửa-một-phần-tử-cụ-thể-bên-trong-mảng) |
| "stock", "remaining", trừ kho | [PATCH.md §6](PATCH.md#6-tăng--giảm-số-lượng-tồn) |
| "cancel", "approve", đổi trạng thái | [PATCH.md §2](PATCH.md#2-đổi-trạng-thái-có-ràng-buộc) |
| "replace all employees of" | [PUT.md §6](PUT.md#6-thay-toàn-bộ-mảng-con) |
| "cannot delete if", còn ràng buộc | [DELETE.md §2](DELETE.md#2-chặn-xoá-khi-còn-ràng-buộc) |
| "remove a seat from the room" | [DELETE.md §6](DELETE.md#6-xoá-một-phần-tử-bên-trong-mảng) |
| "Validate input data" (không nói rõ rule) | [MODELS.md §4](MODELS.md#4-ràng-buộc-trong-schema) |
| Không nhớ cú pháp `$gte` / `$regex` / `$group` / `$lookup` | [QUERY.md](QUERY.md) |
| `populate` trả về `null`, hoặc bí `$lookup` / aggregation | [JS-JOIN.md](JS-JOIN.md) — ghép bằng JS thuần |
| Chép câu truy vấn từ Compass vào code | [QUERY.md §1](QUERY.md#1-chuyển-từ-shell-sang-mongoose) |

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

### ⚠️ express 5 đổi cú pháp đường dẫn

Kiểm tra `"express"` trong `package.json` trước. Nếu là `^5.x`, ba cách viết dưới đây
làm **app throw ngay lúc khởi động** (`Missing parameter name` / `Unexpected ?`) —
không phải lỗi lúc gọi API, mà là app không chạy được → đúng điều kiện 0 điểm.

| Express 4 | Express 5 |
|---|---|
| `app.get('*', ...)` | `app.use((req, res) => ...)` |
| `app.get('/old/*', ...)` | `app.get('/old/*splat', ...)` — wildcard phải **có tên** |
| `app.get('/x/:id?', ...)` | `app.get('/x{/:id}', ...)` |

Vẫn chạy nguyên trên cả hai: `app.get('/x/:id', ...)` và `app.get(['/a/:id', '/b/:id'], ...)`.

Express 5 bù lại: handler `async` **throw** lỗi sẽ tự động rơi vào error middleware,
không cần `.catch(next)`. Nhưng vẫn giữ `try/catch` vì còn phải map sang 400/404/409.

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
