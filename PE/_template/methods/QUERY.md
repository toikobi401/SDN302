# QUERY — Cú pháp truy vấn MongoDB dùng trong Mongoose

> File này chỉ giữ những truy vấn **thực sự hay ra trong PE**. Cú pháp đầy đủ của shell
> xem `practice/slot3.2-mongodb/CHEATSHEET-GIAY.md`.
>
> **Tin tốt:** phần `FILTER` trong shell và trong Mongoose **giống hệt nhau**.
> `db.products.find({ price: { $gt: 1000 } })` → `Product.find({ price: { $gt: 1000 } })`.
> Học thuộc filter một lần là dùng được cả hai.

---

## 1. Chuyển từ shell sang Mongoose

| Shell (Compass / mongosh) | Mongoose (trong `server.js`) |
|---|---|
| `db.products.find(F)` | `await Product.find(F)` |
| `db.products.findOne(F)` | `await Product.findOne(F)` |
| `db.products.find({_id: ObjectId(id)})` | `await Product.findById(id)` |
| `ObjectId("64f...")` | `new mongoose.Types.ObjectId(id)` |
| `ISODate("2024-01-01")` | `new Date('2024-01-01')` |
| `find({}, { name: 1, _id: 0 })` | `.find({}, 'name -_id')` hoặc `.select('name -_id')` |
| `db.products.countDocuments(F)` | `await Product.countDocuments(F)` |
| `db.products.distinct("f")` | `await Product.distinct('f')` |
| `updateOne(F, U)` | `await Product.updateOne(F, U)` |
| `findOneAndUpdate(F, U, {returnDocument:"after"})` | `findOneAndUpdate(F, U, { new: true })` |
| `db.products.aggregate([...])` | `await Product.aggregate([...])` |

**Ba khác biệt phải nhớ:**

```js
// 1. Mongoose PHẢI await. Quên await -> nhận về Query object, res.json() ra rác.
const docs = await Product.find();

// 2. Mongoose ÉP KIỂU filter theo schema -> sai kiểu là THROW, không phải trả rỗng.
await Product.find({ price: 'abc' });   // CastError  -> @ERROR-MAP đổi thành 400
// Shell thì chỉ trả về 0 kết quả, không báo gì.

// 3. Shell trả cursor, in ra là thấy. Mongoose trả document -> res.json(docs).
```

---

## 2. Lọc — so sánh

```js
{ price: 1000 }                           // =
{ price: { $ne: 1000 } }                  // ≠  ⚠️ khớp CẢ doc không có field price
{ price: { $gt: 1000 } }                  // >        $gte  ≥
{ price: { $lt: 1000 } }                  // <        $lte  ≤
{ price: { $gte: 1000, $lte: 5000 } }     // BETWEEN — gộp trong MỘT object
{ status: { $in: ['NEW', 'DONE'] } }      // IN
{ status: { $nin: ['CANCELED'] } }        // NOT IN
```

> ⚠️ `{ price: { $gte: 1000 }, price: { $lte: 5000 } }` → key sau **đè** key trước,
> chỉ còn `$lte`. Phải gộp: `{ price: { $gte: 1000, $lte: 5000 } }`.

## 3. Lọc — AND / OR

```js
{ status: 'NEW', price: { $gt: 100 } }                  // AND = dấu phẩy
{ $or: [ { status: 'NEW' }, { price: { $lt: 100 } } ] } // OR
{ roomId, $or: [ {...}, {...} ] }                       // AND + OR lồng nhau
```

Dựng filter động từ query param — dạng này ra gần như chắc chắn:

```js
const { status, minPrice, maxPrice, keyword } = req.query;
const filter = {};
if (status) filter.status = status;
if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
}
if (keyword) filter.name = { $regex: keyword, $options: 'i' };

const docs = await Product.find(filter);
```

> ⚠️ `if (status)` chứ không phải `if (status !== undefined)` — query param không truyền
> thì là `undefined`, gán thẳng `filter.status = undefined` sẽ lọc sai.

## 4. Lọc — có field / null

```js
{ categoryId: { $exists: true } }    // CÓ field (kể cả = null)
{ categoryId: { $exists: false } }   // KHÔNG có field
{ categoryId: null }                 // = null HOẶC không có field
{ categoryId: { $ne: null } }        // có field và khác null
```

## 5. Lọc — chuỗi (tìm kiếm)

```js
{ name: { $regex: keyword, $options: 'i' } }   // CHỨA, không phân biệt hoa thường ← hay ra nhất
{ name: /^iPhone/ }                            // bắt đầu bằng
{ name: /Pro$/ }                               // kết thúc bằng
```

## 6. Lọc — field lồng & mảng

```js
{ 'specs.ram': { $gte: 16 } }                 // field lồng — BẮT BUỘC ngoặc kép
{ genre: 'Action' }                            // mảng CHỨA 'Action'
{ genre: { $in: ['Action', 'Drama'] } }        // chứa ít nhất 1 trong các giá trị
{ genre: { $all: ['Action', 'Drama'] } }       // chứa CẢ HAI
{ genre: { $size: 0 } }                        // mảng rỗng
{ 'seats._id': 'A1' }                          // mảng object: có phần tử _id = 'A1'
{ seats: { $elemMatch: { _id: 'A1', status: 'FREE' } } }  // CÙNG 1 phần tử thoả cả 2
```

> ⚠️ `{ 'seats._id': 'A1', 'seats.status': 'FREE' }` khớp khi **hai phần tử khác nhau**
> thoả hai điều kiện. Cần cùng một phần tử thì phải `$elemMatch`.

## 7. Lọc — ngày giờ & khoá ngoại

```js
{ createdAt: { $gte: new Date(from), $lte: new Date(to) } }

// Trùng khung giờ — công thức chuẩn, sai một dấu là mất điểm:
{ roomId, startTime: { $lt: endTime }, endTime: { $gt: startTime } }
// PHẢI $lt / $gt. Dùng $lte / $gte sẽ báo trùng cả khi hai suất chỉ CHẠM MÉP nhau.

// Khoá ngoại lúc ObjectId lúc string -> ăn cả hai:
{ movieId: { $in: [id, new mongoose.Types.ObjectId(id)] } }
```

---

## 8. Sắp xếp / phân trang / đếm

```js
await Product.find(filter)
    .sort({ price: -1, name: 1 })     // 1 tăng, -1 giảm; giá bằng nhau thì xếp theo name
    .skip((page - 1) * limit)
    .limit(limit)
    .select('name price -_id')
    .populate('categoryId', 'name')
    .lean();

await Product.countDocuments(filter);   // tổng số, để tính totalPages
await Product.distinct('category');     // các giá trị khác nhau
```

| Đề hỏi | Viết |
|---|---|
| "top 3 đắt nhất" | `.sort({ price: -1 }).limit(3)` |
| "trang p, mỗi trang n" | `.skip((p - 1) * n).limit(n)` |
| "tổng số bản ghi" | `countDocuments(filter)` — **cùng filter** với `find` |

> ⚠️ Sắp xếp **tăng dần** thì doc **thiếu field** đứng **đầu tiên** (đã test).
> Đề bảo "rẻ nhất" mà có doc thiếu `price` là ra sai.

---

## 9. Sửa dữ liệu

```js
{ $set:   { price: 1500, 'specs.ram': 32 } }   // sửa / thêm field, và field lồng
{ $unset: { description: '' } }                // xoá field
{ $inc:   { stock: -1 } }                      // cộng; số âm là trừ
```

> ⚠️ `{ $set: { specs: { ram: 32 } } }` **ghi đè cả object** `specs`, mất các field khác.
> Sửa một field con thì viết `{ $set: { 'specs.ram': 32 } }`.

**Mảng:**

```js
{ $push:     { tags: 'hot' } }                    // thêm vào cuối (cho trùng)
{ $addToSet: { tags: 'hot' } }                    // thêm nếu CHƯA có
{ $pull:     { tags: 'old' } }                    // xoá mọi phần tử khớp
{ $push:     { tags: { $each: ['a', 'b'] } } }    // thêm NHIỀU phần tử
```

> ⚠️ `{ $push: { tags: ['a','b'] } }` thêm **một phần tử là cả cái mảng**, không phải 2 phần tử.

**Sửa một phần tử trong mảng** — filter phải chứa điều kiện của mảng:

```js
await Room.updateOne(
    { _id: roomId, 'seats._id': code },        // ← bắt buộc, để $ biết trỏ vào đâu
    { $set: { 'seats.$.status': 'BOOKED' } }
);
// $     = phần tử ĐẦU TIÊN khớp
// $[]   = MỌI phần tử
// $[x]  = phần tử thoả arrayFilters: [{ 'x.price': { $gt: 10 } }]
```

Kiểm tra kết quả để trả đúng status:

```js
const r = await Room.updateOne(F, U);
if (r.matchedCount === 0) return res.status(404).json({ error: '...' });  // không tìm thấy
// r.modifiedCount === 0 nghĩa là tìm thấy nhưng giá trị vốn đã đúng -> vẫn 200
```

**Trừ kho an toàn** — điều kiện nằm trong filter, không phải trong `if`:

```js
const doc = await Product.findOneAndUpdate(
    { _id: id, stock: { $gte: qty } },     // hết hàng thì không khớp -> trả null
    { $inc: { stock: -qty } },
    { new: true }
);
if (!doc) { /* phân biệt 404 (không có id) vs 409 (không đủ hàng) */ }
```

## 10. Xoá

```js
await Product.findByIdAndDelete(id);              // trả document đã xoá, hoặc null
const r = await Product.deleteMany({ categoryId });   // r.deletedCount
```

> ⚠️ `deleteMany({})` hoặc điều kiện `undefined` → **xoá sạch collection**.
> Luôn kiểm tra biến điều kiện trước khi gọi.

---

## 11. Aggregation — các stage hay ra

```js
await Order.aggregate([
    { $match:   { status: 'PAID' } },                       // WHERE — đặt ĐẦU TIÊN cho nhanh
    { $lookup:  { from: 'products', localField: 'productId',
                  foreignField: '_id', as: 'product' } },    // JOIN → kết quả là MẢNG
    { $unwind:  '$product' },                                // mảng → tách thành từng doc
    { $group:   { _id: '$product.category',
                  total: { $sum: '$amount' },
                  count: { $sum: 1 } } },                    // GROUP BY
    { $match:   { count: { $gte: 2 } } },                    // HAVING — đặt SAU $group
    { $sort:    { total: -1 } },
    { $limit:   5 },
    { $project: { _id: 0, category: '$_id', total: 1, count: 1 } }   // SELECT + đổi tên
]);
```

| Stage | Tương đương SQL | Lưu ý |
|---|---|---|
| `$match` | `WHERE` / `HAVING` | trước `$group` = WHERE, sau `$group` = HAVING |
| `$lookup` | `JOIN` | luôn trả về **mảng**, kể cả khớp 1 bản ghi |
| `$unwind` | — | **bỏ** doc không join được (đã test) |
| `$group` | `GROUP BY` | `_id` chính là khoá gom nhóm |
| `$project` | `SELECT` | `_id: 0` để ẩn `_id` |
| `$addFields` | thêm cột tính toán | giữ nguyên các field cũ |
| `$count: 'total'` | `COUNT(*)` | trả `[{ total: n }]` |

**Accumulator trong `$group`:**

```js
_id: '$category'                      // gom theo field
_id: null                             // gộp TẤT CẢ thành 1 nhóm
_id: { a: '$f1', b: '$f2' }           // gom theo nhiều field

{ $sum: 1 }           // ĐẾM số bản ghi
{ $sum: '$amount' }   // TỔNG
{ $avg: '$price' }    { $min: '$price' }    { $max: '$price' }
{ $addToSet: '$userId' }   // gom thành mảng KHÔNG trùng → đếm số người riêng biệt
{ $push: '$name' }         // gom thành mảng, giữ trùng
{ $first: '$name' }        // phần tử đầu — dùng SAU khi đã $sort
```

**Biểu thức trong `$project` / `$addFields`:**

```js
{ $size: '$empIds' }                              // số phần tử của mảng
{ $round: ['$avgScore', 2] }                      // làm tròn 2 chữ số
{ $multiply: ['$price', 1.1] }   { $divide: [...] }   { $subtract: [...] }
{ $concat: ['$firstName', ' ', '$lastName'] }
{ $ifNull: ['$category', 'N/A'] }
{ $cond: [ { $gte: ['$price', 1000] }, 'expensive', 'cheap' ] }
```

> Field dùng làm **giá trị** phải có `$`: `'$price'`. Field làm **khoá** (bên trái `:`) thì không.

**Hai cách xử lý khi `$lookup` không ra kết quả:**

```js
// Giữ lại doc không join được (hiện null)
{ $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }

// Khoá ngoại lưu dạng STRING, không join được bằng localField -> ép kiểu:
{ $lookup: {
    from: 'products',
    let: { pid: { $toObjectId: '$productId' } },
    pipeline: [ { $match: { $expr: { $eq: ['$_id', '$$pid'] } } } ],
    as: 'product'
} }
```

---

## 12. Mẫu hay ra trong PE

```js
// Đếm số bản ghi theo từng nhóm, kèm TÊN nhóm, sắp giảm dần
await Product.aggregate([
    { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'c' } },
    { $unwind: '$c' },
    { $group: { _id: '$c.name', total: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
    { $sort: { total: -1 } },
    { $project: { _id: 0, categoryName: '$_id', total: 1, avgPrice: { $round: ['$avgPrice', 1] } } }
]);

// Thống kê qua BẢNG TRUNG GIAN: tổng giờ + số người của từng dự án
await WorksOn.aggregate([
    { $group: { _id: '$proId', totalWorkHours: { $sum: '$workHours' }, empIds: { $addToSet: '$empId' } } },
    { $lookup: { from: 'projects', let: { pid: { $toObjectId: '$_id' } },
                 pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }], as: 'project' } },
    { $unwind: '$project' },
    { $sort: { totalWorkHours: -1 } },
    { $project: { _id: 0, projectName: '$project.proName',
                  totalWorkHours: 1, totalEmployees: { $size: '$empIds' } } }
]);

// Nhóm KHÔNG có bản ghi con nào
await Category.aggregate([
    { $lookup: { from: 'products', localField: '_id', foreignField: 'categoryId', as: 'p' } },
    { $match: { p: { $size: 0 } } },
    { $project: { _id: 0, name: 1 } }
]);

// Rẻ nhất của MỖI nhóm
await Product.aggregate([
    { $sort: { price: 1 } },
    { $group: { _id: '$categoryId', cheapest: { $first: '$name' }, price: { $first: '$price' } } }
]);

// Phân trang kèm tổng số trang
const [items, total] = await Promise.all([
    Product.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter)
]);
res.json({ items, page, totalPages: Math.ceil(total / limit), total });
```

---

## 13. Bẫy mất điểm (các mục ✓ đã chạy thử để xác nhận)

| Bẫy | Hiện tượng | Xử lý |
|---|---|---|
| Quên `$` — `{ price: { gt: 5 } }` | **Không báo lỗi**, trả 0 kết quả | Soi lại từng toán tử |
| Lặp key — `{ price: {$gt:1}, price: {$lt:9} }` | Chỉ còn điều kiện sau | Gộp vào 1 object |
| ✓ Sai kiểu — `find({ price: 'abc' })` | Mongoose **throw CastError** | `@ERROR-MAP` đổi thành 400 |
| ✓ `$ne` và doc thiếu field | `{price:{$ne:1000}}` khớp cả doc **không có** `price` | Thêm `$exists: true` nếu cần |
| ✓ Sort tăng dần | Doc **thiếu field** xếp **đầu** | Lọc `{ field: { $exists: true } }` trước |
| ✓ `$avg` và doc thiếu field | Chia cho **số doc CÓ field**, không phải tổng số doc | Tự tính `$sum / $sum:1` nếu đề muốn khác |
| ✓ `$unwind` sau `$lookup` | **Mất** doc không join được | `preserveNullAndEmptyArrays: true` |
| ✓ `$lookup` với khoá ngoại string | Join ra mảng rỗng | `let` + `$toObjectId` + `$expr` |
| `$set` cả object lồng | Ghi đè, mất field anh em | `{ $set: { 'specs.ram': 32 } }` |
| `$push` một mảng | Thành 1 phần tử lồng | `{ $each: [...] }` |
| `$` positional mà filter không có mảng | Không sửa được gì | Filter phải có `'seats._id': code` |
| `deleteMany` điều kiện `undefined` | **Xoá sạch collection** | Kiểm tra biến trước |
| Quên `await` | `res.json()` ra object Query | `await` mọi lệnh truy vấn |
| So `_id` bằng chuỗi trần | Luôn `false` | `String(a) === String(b)` |

---

## Không cần học cho PE

Có trong cheatsheet shell nhưng **chưa từng ra** trong 3 đề đã làm — bỏ qua nếu thiếu thời gian:
`$nor` · `$not` · `$type` · `$mod` · `$mul` · `$rename` · `$currentDate` · `$pop` · `$pullAll` ·
`replaceOne` · `upsert` / `$setOnInsert` · `$slice` trong projection · `$facet` · `$bucket` ·
các lệnh quản trị shell (`show dbs`, `use`, `dropDatabase`, `getSiblingDB`).
