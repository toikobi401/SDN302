# MODELS — Schema, kiểu dữ liệu, validation, lỗi

> Đọc file này **phút thứ 6-8** của buổi thi, ngay sau khi import DB.
> Khai sai schema thì mọi câu đều sai, sửa logic bao nhiêu cũng vô ích.

## Quy trình bắt buộc trước khi khai model

Mở Compass, xem **1 document của mỗi collection**, trả lời 4 câu:

| Câu hỏi | Nếu sai thì sao |
|---|---|
| Tên field chính xác từng chữ hoa/thường? | `showTimeId` vs `showtimeId` → query trả rỗng |
| Khoá ngoại là `ObjectId(...)` hay `"chuỗi"`? | Khai sai → `populate` trả `null`, `$lookup` rỗng |
| Field thời gian là `Date` hay `String`? | Khai sai → output lệch định dạng |
| Mảng lồng có phần tử nào chứa key tên `type`? | Có → **bắt buộc** `Mixed` |

> ⚠️ **Đừng dùng `JSON.stringify` để kiểm tra kiểu id.** Nó in `ObjectId("65fa...")`
> thành `"65fa..."` y hệt string. Xem trong Compass, hoặc in `doc._id.constructor.name`.

---

## 1. Bảng kiểu dữ liệu

| Dữ liệu trong Compass | Khai trong schema |
|---|---|
| `"Avengers"` | `String` |
| `180` | `Number` |
| `true` | `Boolean` |
| `ObjectId("65fa...")` | `{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }` |
| `"65fa..."` (chuỗi 24 ký tự) | `mongoose.Schema.Types.Mixed` ← **không** khai ObjectId |
| `2026-03-10T18:30:00.000Z` (màu riêng, kiểu Date) | `Date` |
| `"2026-03-10T18:30:00.000Z"` (có nháy) | `String` |
| `["action", "sci-fi"]` | `[String]` |
| `[{ _id: "A1", type: "VIP" }]` | `[mongoose.Schema.Types.Mixed]` ← có key `type` |
| `[{ locId: ObjectId(...) }]` | `[{ _id: false, locId: { type: ..., ref: '...' } }]` |
| `{ city: "HN", zip: "100000" }` | `{ city: String, zip: String }` (object lồng, không ngoặc vuông) |

---

## 2. Bẫy key `type` — bẫy số 1 của môn này

```js
// ❌ SAI — Mongoose hiểu "type: String" là khai báo kiểu cho CẢ object seats[i].
//          Kết quả: s._id và s.type đọc ra undefined, mọi ghế đều AVAILABLE.
seats: [{ _id: String, type: String }]

// ✅ ĐÚNG — Mixed, dữ liệu đi thẳng từ DB ra
seats: [mongoose.Schema.Types.Mixed]

// ✅ ĐÚNG — hoặc đổi từ khoá khai kiểu (ít dùng, dài dòng hơn)
seats: [new mongoose.Schema({ _id: String, type: String }, { typeKey: '$type', _id: false })]
```

**Dấu hiệu nhận biết:** route chạy không lỗi, trả 200, nhưng field nào cũng `undefined` hoặc
`null`, và logic so sánh luôn ra nhánh mặc định.

> Lưu ý phân biệt: `{ type: String, required: true }` ở [mục 4](#4-ràng-buộc-trong-schema) là
> khai báo kiểu **hợp lệ và đúng**. Bẫy chỉ xảy ra khi **dữ liệu thật** có field tên là `type`.

### Khi field là OBJECT ĐƠN, không phải mảng

Bẫy y hệt, nhưng khó thấy hơn — và hậu quả nặng hơn: cả object trả về `undefined`,
không chỉ từng field con.

Giả sử document trong Compass:

```json
{
  "name": "x",
  "meta": { "city": "HN", "zip": "100000" },
  "info": { "type": "VIP", "code": "A1" }
}
```

| Cách khai | `meta.city` | `info` | `info.code` |
|---|---|---|---|
| `info: { type: String, code: String }` | `"HN"` | **`undefined`** | **`undefined`** |
| `info: mongoose.Schema.Types.Mixed` | `"HN"` | `{type:"VIP",code:"A1"}` | `"A1"` |
| `info: { type: { type: String }, code: String }` | `"HN"` | `{type:"VIP",code:"A1"}` | `"A1"` |
| `info: new Schema({type:String,code:String},{typeKey:'$type',_id:false})` | `"HN"` | `{type:"VIP",code:"A1"}` | `"A1"` |

*(Bảng trên là kết quả chạy thật, không phải suy đoán.)*

**Quy tắc:**

```js
// Object đơn KHÔNG có key "type" -> viết thẳng, không vấn đề gì
meta: { city: String, zip: String }

// Object đơn CÓ key "type" -> Mixed (gọn nhất)
info: mongoose.Schema.Types.Mixed

// ...hoặc bọc chính field "type" lại, nếu muốn giữ ràng buộc kiểu
info: { type: { type: String }, code: String }
```

> Vì sao `info` ra `undefined` chứ không phải chuỗi? Mongoose hiểu path `info` có kiểu `String`,
> rồi cố ép object `{type:"VIP",code:"A1"}` thành String, thất bại, nên bỏ qua luôn.

> ⚠️ Khác biệt giữa mảng và object đơn: **mảng object** mặc định sinh thêm `_id` cho từng
> phần tử khi bạn `create`. Muốn bỏ thì khai `[{ _id: false, locId: ... }]`.
> **Object đơn** không sinh `_id`, không cần lo.

---

## 3. Khoá ngoại: ObjectId hay string

```js
// DB lưu ObjectId -> populate chạy được
movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }

// DB lưu string, HOẶC không chắc -> Mixed + query bằng idForms()
proId: mongoose.Schema.Types.Mixed
```

Hai helper phải copy kèm:

```js
const idForms = id => [id, new mongoose.Types.ObjectId(id)];   // khớp cả 2 kiểu
const isId = id => mongoose.Types.ObjectId.isValid(id);
```

| Tình huống | Cách xử lý |
|---|---|
| `find()` theo khoá ngoại | `Link.find({ proId: { $in: idForms(id) } })` |
| `$lookup` trong aggregation | `let: { pid: { $toObjectId: '$_id' } }` + `$expr` |
| Ghi bản ghi mới | Ép cùng kiểu với dữ liệu cũ: `new mongoose.Types.ObjectId(x)` |
| So sánh 2 id trong JS | `String(a) === String(b)` — **không** dùng `===` trực tiếp |

> ⚠️ `ticket.userId === req.user._id` **luôn** `false` vì đang so sánh 2 object.

---

## 4. Ràng buộc trong schema

Dùng khi đề ghi *"Validate input data"* mà không liệt kê rõ từng rule.

```js
const Movie = mongoose.model('Movie', new mongoose.Schema({
    code:  { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: [true, 'title is required'], minlength: 2, maxlength: 100 },
    price: { type: Number, required: true, min: [0, 'price must be >= 0'] },
    status:{ type: String, enum: ['DRAFT', 'ACTIVE', 'STOPPED'], default: 'DRAFT' },
    qty:   { type: Number, default: 0 },
    startAt: Date,
    meta:  { city: String, zip: String }
}, { timestamps: true, versionKey: false }), 'movies');
```

| Option | Tác dụng |
|---|---|
| `required: true` | Thiếu → `ValidationError` |
| `required: [true, 'msg']` | Tự đặt message lỗi |
| `enum: [...]` | Giá trị phải nằm trong danh sách |
| `min` / `max` | Giới hạn số |
| `minlength` / `maxlength` | Giới hạn độ dài chuỗi |
| `default` | Giá trị mặc định khi không gửi |
| `trim`, `lowercase`, `uppercase` | Tự chuẩn hoá chuỗi |
| `timestamps: true` | Tự thêm `createdAt`, `updatedAt` |
| `versionKey: false` | Bỏ `__v` khỏi response |

> ⚠️ Ràng buộc schema **chỉ chạy** với `.create()`, `.save()`, và `findByIdAndUpdate` có
> `{ runValidators: true }`. Thiếu option đó là update ghi được cả giá trị sai enum.

> ⚠️ `versionKey: false` quan trọng cho điểm: đáp án mẫu của đề không có `__v`.
> Nếu trả thẳng document ra mà quên option này là lệch.

---

## 5. Đổi lỗi Mongoose thành status code đúng

Mặc định mọi lỗi rơi vào `catch` → 500. Nhưng id sai định dạng phải là **400**,
vi phạm `unique` phải là **409**. Trả 500 là mất điểm.

```js
const sendError = (res, error) => {
    if (error.name === 'ValidationError') {                       // required/enum/min/maxlength
        return res.status(400).json({
            error: Object.values(error.errors).map(e => e.message).join(', ')
        });
    }
    if (error.name === 'CastError') {                             // "abc" vào field ObjectId/Number
        return res.status(400).json({ error: `Invalid ${error.path}: ${error.value}` });
    }
    if (error.code === 11000) {                                   // trùng unique index
        return res.status(409).json({
            error: `Duplicate value for ${Object.keys(error.keyValue || {}).join(', ')}`
        });
    }
    return res.status(500).json({ error: error.message });
};

// Dùng:  catch (error) { return sendError(res, error); }
```

| Lỗi | `error.name` / `code` | Status đúng |
|---|---|---|
| Thiếu field `required` | `ValidationError` | 400 |
| Sai giá trị `enum` | `ValidationError` | 400 |
| `price: -5` vi phạm `min` | `ValidationError` | 400 |
| `findById("abc")` | `CastError` | 400 |
| `{ price: "abc" }` vào field Number | `CastError` | 400 |
| Trùng email có `unique: true` | `code: 11000` | 409 |
| Mất kết nối DB | khác | 500 |

> ✅ Đã test thật: `GET /api/children-filter?minPrice=abc` → `Number('abc')` ra `NaN`
> → Mongo ném `CastError` → `sendError` trả **400** `{"error":"Invalid price: NaN"}`.
> Không có `sendError` thì câu này trả 500.

---

## 6. Bắt route không tồn tại

```js
// ⚠️ PHẢI đặt SAU tất cả route, ngay trước app.listen
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Middleware xử lý lỗi BẮT BUỘC đủ 4 tham số, thiếu next thì Express không gọi
app.use((error, req, res, next) => sendError(res, error));
```

> ⚠️ Đặt 2 khối này ở đầu file thì chúng nuốt hết mọi request → toàn bộ API trả 404.

---

## 7. Import dữ liệu

### Cách chính thức (đề yêu cầu): Compass

```
Create Database → tên DB ĐÚNG như ảnh trong đề
→ tạo từng collection đúng tên trong ảnh
→ mỗi collection: ADD DATA → Import JSON → chọn đúng file
```

### Lưu ý về Extended JSON

File đề cho dùng Extended JSON — Compass hiểu, nhưng script tự viết thì không:

```json
{ "_id": { "$oid": "65fa00000000000000000001" },
  "startAt": { "$date": "2026-03-10T18:30:00Z" } }
```

- `$oid` → phải thành `ObjectId`, **không phải** string
- `$date` → phải thành `Date`

`JSON.parse` thường sẽ biến chúng thành object `{ $oid: "..." }` → sai hoàn toàn.
Nếu tự viết script import thì dùng `EJSON`:

```js
const { EJSON } = require('bson');       // bson đi kèm mongoose, không cần cài thêm
const docs = EJSON.parse(fs.readFileSync(file, 'utf8'));
await db.collection(name).insertMany(docs);
```

### Kiểm tra sau khi import

```js
const one = await db.collection('tickets').findOne();
console.log(one.showTimeId.constructor.name);   // 'ObjectId' hay 'String'?
console.log(Object.keys(one));                  // tên field chính xác
```

---

## 8. Bẫy hay gặp

| Bẫy | Hiện tượng | Cách xử lý |
|---|---|---|
| Key `type` trong mảng lồng | Field đọc ra `undefined` | `[Mixed]` |
| Khoá ngoại khai ObjectId nhưng DB lưu string | `find` trả `[]`, `populate` trả `null` | `Mixed` + `idForms()` |
| Quên tham số thứ 3 của `mongoose.model` | Mongoose tự đoán tên collection, có thể sai | Luôn ghi tên thật |
| Tên collection số ít | Mongoose đoán `movies` nhưng DB tên `movie` | Ghi rõ |
| Quên `versionKey: false` | `__v` thừa trong response | Thêm option |
| Quên `runValidators` khi update | Ghi được giá trị sai enum | Thêm option |
| `JSON.stringify` để đoán kiểu id | ObjectId in ra giống hệt string | Xem Compass |
| `!price` để kiểm tra thiếu field số | `price: 0` bị báo thiếu | `typeof price !== 'number'` |
| Mọi lỗi trả 500 | Mất điểm case 400/409 | Dùng `sendError` |

---

## 9. Checklist sau khi khai model

- [ ] Tham số thứ 3 = **tên collection thật** trong Compass?
- [ ] Tên field copy **trực tiếp** từ Compass, không gõ tay?
- [ ] Khoá ngoại khai đúng kiểu (`ObjectId` hay `Mixed`)?
- [ ] Mảng lồng có key `type` → đã dùng `Mixed`?
- [ ] Có `versionKey: false` ở model sẽ trả thẳng ra response?
- [ ] Đã có 2 helper `idForms` và `isId`?
- [ ] Đã có `sendError` nếu đề yêu cầu validate nhiều?
- [ ] Thử 1 route GET đơn giản để xác nhận đọc được dữ liệu **trước khi** viết tiếp?
