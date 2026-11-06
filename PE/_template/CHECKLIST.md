# CHECKLIST 10 PHÚT ĐẦU GIỜ THI — SDN302 PE

Làm đúng thứ tự. Chưa xong bước này thì chưa sang bước sau.

---

## PHÚT 0–2 · Dựng project

```
1. Giải nén đề → mở thư mục SDN302_given/resource bằng VS Code
2. Mở terminal tại đó:  npm install
3. Copy server.js của template này đè lên server.js của đề
```

> Nếu `npm install` lỗi/không có mạng: copy cả thư mục `node_modules` từ một project SDN302 cũ sang (dependencies giống hệt nhau).

---

## PHÚT 2–5 · Database — **đây là nơi mất 0 điểm nhiều nhất**

```
1. Mở MongoDB Compass → Create Database
   → TÊN DB phải ĐÚNG như ảnh trong đề  (vd: Spr26_B5 / spr25db)

2. Tạo từng collection đúng tên trong ảnh (số nhiều, chữ thường)

3. Import từng file .json trong thư mục given vào đúng collection
   ADD DATA → Import JSON

4. Mở file .env, sửa đúng 1 dòng:
   MONGO_URI=mongodb://127.0.0.1:27017/<TÊN_DB_CỦA_ĐỀ>
```

**Hai điều kiện cho 0 điểm — kiểm tra lại ngay:**

- [ ] `.env` có `MONGO_URI` và code đọc nó qua `require('dotenv').config()`
- [ ] App chạy ở `http://localhost:9999` (`PORT=9999` trong `.env`)

---

## PHÚT 5–6 · Chạy thử trước khi viết dòng code nào

```
npm start
```

Mở trình duyệt vào `http://localhost:9999` → phải thấy:

```json
{ "message": "Welcome to Practical Exam!" }
```

Terminal phải in `MongoDB connected successfully`. Chưa thấy thì **dừng lại sửa**, đừng viết tiếp.

---

## PHÚT 6–8 · Soi dữ liệu thật (quyết định cách viết schema)

Trong Compass, mở 1 document của **mỗi** collection và ghi ra giấy:

| Cần xem | Vì sao |
|---|---|
| Tên field **chính xác từng chữ hoa/thường** | `showTimeId` ≠ `showtimeId` — đề 2 đã dính |
| Khoá ngoại là `ObjectId(...)` hay `"chuỗi"` | Quyết định có `populate` được không |
| Field thời gian là `Date` hay `String` | Để sai kiểu → output sai định dạng |
| Mảng lồng có key tên `type` không | Nếu có → **bắt buộc** dùng `Mixed` |

> Compass hiển thị ObjectId khác string rõ ràng. Đừng tin `JSON.stringify` — nó in ObjectId y hệt string.

---

## PHÚT 8–10 · Đổi tên model trong template

Mở `server.js`, Ctrl+H đổi 5 tên model theo bảng ở đầu file:

```
Parent → ...   Child → ...   Link → ...   Side → ...   User → ...
```

Sửa luôn tham số thứ 3 của mỗi `mongoose.model(...)` thành **tên collection thật**.

Xoá các khối `@...` không dùng tới cho gọn.

---

## LÀM TỪNG CÂU

Với mỗi câu, theo đúng 4 bước:

```
1. Đọc Business Rules → gạch chân từng dòng, mỗi dòng là 1 điều kiện if
2. Ctrl+F mã tag phù hợp trong server.js (bảng tra ở đầu file)
3. Copy khối đó xuống, sửa tên model / tên field / message lỗi
4. Test NGAY bằng Thunder Client, đủ cả 3 case: 200 / 400 / 404
```

**Bí chỗ nào thì mở `methods/`** — mỗi HTTP method có 1 file riêng, gồm code mẫu đầy đủ,
bảng liệt kê mọi case kèm status code, và bẫy hay gặp:

| | |
|---|---|
| [methods/README.md](methods/README.md) | Bảng status code, 401 vs 403, thứ tự route, **tra ngược "đề ra dạng này → mở file nào"** |
| [methods/MODELS.md](methods/MODELS.md) | **Đọc ở phút 6-8.** Kiểu dữ liệu, bẫy key `type`, validation, map lỗi → status |
| [methods/GET.md](methods/GET.md) | 8 dạng GET: lọc, populate, bảng trung gian, aggregation, phân trang |
| [methods/POST.md](methods/POST.md) | Thứ tự validate, kiểm tra mảng id, chống trùng, tính tiền server |
| [methods/PUT.md](methods/PUT.md) | `new: true`, `runValidators`, chặn sửa theo trạng thái |
| [methods/PATCH.md](methods/PATCH.md) | Bảng chuyển trạng thái, sửa field lẻ, thao tác mảng |
| [methods/DELETE.md](methods/DELETE.md) | 200 vs 204, chặn ràng buộc, cascade, xoá mềm |
| [methods/AUTH.md](methods/AUTH.md) | `access_key` vs JWT, login/bcrypt, phân quyền role — **"0 points if no authorization"** |

**Copy y nguyên message lỗi trong đề, từng dấu câu.** Đề viết `Movie with id = X not found`
thì không được viết `Movie with _id='X' not found`. Hai câu khác nhau trong cùng một đề
có thể dùng format khác nhau — đề 2 đã như vậy.

---

## TRƯỚC KHI NỘP

- [ ] Test lại **toàn bộ** endpoint một lượt cuối (dữ liệu có thể đã bị đổi khi test câu sau)
- [ ] Xoá dữ liệu rác do test POST tạo ra, nếu đề chấm bằng báo cáo thống kê
- [ ] So từng response với đáp án mẫu: **đúng tên field, đúng thứ tự, không thừa `__v` hay `_id`**
- [ ] **Xoá thư mục `node_modules`** (đề bắt buộc, để vừa dung lượng PEA_Client)
- [ ] Xoá hết comment tiếng Việt của template
- [ ] Nộp bằng PEA_Client, trỏ vào thư mục `resource`

---

## 6 BẪY ĐÃ DÍNH THẬT

| Bẫy | Dấu hiệu | Cách xử lý |
|---|---|---|
| Key `type` trong mảng lồng | Field đọc ra `undefined`, mọi ghế đều AVAILABLE | `items: [mongoose.Schema.Types.Mixed]` |
| Khoá ngoại lưu dạng string | Query trả mảng rỗng dù Compass có dữ liệu | Schema để `Mixed`, query bằng `idForms()` |
| `$lookup` không join được | Pipeline trả mảng rỗng | Thêm `$toObjectId` vào `let` |
| `__v` thừa trong response | Lệch so với đáp án mẫu | `{ versionKey: false }` khi khai schema |
| Thiếu `app.use(express.json())` | `req.body` là `undefined` ở route POST | Thêm ngay sau `const app = express()` |
| Hoa/thường trong tên field | `showTimeId` vs `showtimeId` | Copy tên field trực tiếp từ Compass |
