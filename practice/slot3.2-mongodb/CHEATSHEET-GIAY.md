# MONGODB: TÀI LIỆU CHÉP TAY ĐỂ MANG VÀO THI

> Ví dụ dùng `products { name, price, category_id, description, tags[], specs{ram, cpu} }` và `categories { _id, name }`.
> Mẹo chép: mỗi mục một khung, đánh số ①②③… ở lề để lật tìm nhanh. Phần ⑰ (mẫu đề) nên chép ra trang riêng.

---

## ① KHUNG LỆNH

```js
use shopDB                                   // chuyển database
db.products.find( FILTER, PROJECTION ).sort( {..} ).skip( n ).limit( n )
db.products.findOne( FILTER, PROJECTION )                // 1 document hoặc null
db.products.countDocuments( FILTER )                     // đếm
db.products.distinct( "field", FILTER )                  // các giá trị khác nhau
db.products.insertOne( {..} )      /  insertMany( [ {..}, {..} ] )
db.products.updateOne( FILTER, { $set: {..} } )   /  updateMany( FILTER, UPDATE, { upsert: true } )
db.products.replaceOne( FILTER, { doc mới } )            // KHÔNG có $
db.products.deleteOne( FILTER )    /  deleteMany( FILTER )
db.products.aggregate( [ { $stage1 }, { $stage2 } ] )
```

FILTER rỗng `{}` = tất cả · `1` = hiện / tăng dần · `-1` = giảm dần · `0` = ẩn

---

## ② SHELL

```js
db                          // database đang dùng
show dbs                    // liệt kê database
use shopDB                  // chuyển / tạo database
show collections            // = db.getCollectionNames()
db.createCollection("logs") // tạo collection rỗng
db.logs.drop()              // xoá collection
db.dropDatabase()           // xoá database đang dùng
db.getSiblingDB("other").products.find()   // đọc database khác, không cần use
ObjectId("...").getTimestamp()             // thời điểm tạo của ObjectId
```

---

## ③ LỌC: SO SÁNH

```js
{ price: 1000 }                              // =
{ price: { $ne: 1000 } }                     // ≠ (khớp cả doc KHÔNG có field)
{ price: { $gt: 1000 } }                     // >       $gte  ≥
{ price: { $lt: 1000 } }                     // <       $lte  ≤
{ price: { $gte: 1000, $lte: 5000 } }        // BETWEEN (gộp trong 1 object)
{ name: { $in: ["A", "B"] } }                // IN
{ name: { $nin: ["A", "B"] } }               // NOT IN
```

## ④ LỌC: AND / OR / NOT

```js
{ price: { $gt: 1000 }, name: "A" }                         // AND (dấu phẩy)
{ $and: [ { price: { $gt: 1000 } }, { price: { $ne: 2000 } } ] }
{ $or:  [ { price: { $lt: 1000 } }, { name: "A" } ] }       // OR
{ $nor: [ { price: { $lt: 1000 } }, { name: "A" } ] }       // không thoả cái nào
{ price: { $not: { $gt: 1000 } } }                          // NOT (bọc toán tử)
{ name: { $not: /^A/ } }                                    // NOT regex
{ category_id: X, $or: [ {..}, {..} ] }                     // AND + OR
```

## ⑤ LỌC: TỒN TẠI / NULL / KIỂU

```js
{ category_id: { $exists: true } }     // CÓ field (kể cả khi = null)
{ category_id: { $exists: false } }    // KHÔNG có field
{ category_id: null }                  // = null HOẶC không có field
{ category_id: { $type: "null" } }     // CHỈ = null
{ category_id: { $ne: null } }         // có field và khác null
{ price: { $type: "number" } }         // "string" "bool" "date" "array" "object" "objectId"
```

## ⑥ LỌC: CHUỖI (REGEX)

```js
{ name: /^iPhone/ }          // bắt đầu bằng        LIKE 'iPhone%'
{ name: /Pro$/ }             // kết thúc bằng       LIKE '%Pro'
{ name: /phone/ }            // chứa                LIKE '%phone%'
{ name: /phone/i }           // chứa, không phân biệt hoa thường
{ name: { $regex: "phone", $options: "i" } }     // cách viết khác
{ name: { $in: [ /^iPhone/, /^Samsung/ ] } }     // nhiều mẫu
```

`^` đầu · `$` cuối · `.` 1 ký tự · `.*` chuỗi bất kỳ · `\.` dấu chấm thật · `\d` chữ số

## ⑦ LỌC: OBJECT LỒNG & MẢNG

```js
{ "specs.ram": 16 }                          // field lồng: PHẢI có ngoặc kép
{ "specs.ram": { $gte: 16 } }
{ tags: "sale" }                             // mảng CHỨA "sale"
{ tags: ["sale", "new"] }                    // mảng ĐÚNG BẰNG (cả thứ tự)
{ tags: { $all: ["sale", "new"] } }          // chứa CẢ HAI, thứ tự tuỳ ý
{ tags: { $in: ["sale", "hot"] } }           // chứa ÍT NHẤT 1
{ tags: { $size: 2 } }                       // đúng 2 phần tử (chỉ nhận số)
{ "tags.0": "sale" }                         // phần tử đầu tiên
{ "tags.1": { $exists: true } }              // có ≥ 2 phần tử
{ scores: { $elemMatch: { $gte: 8, $lt: 10 } } }        // CÙNG 1 phần tử thoả cả 2 điều kiện
{ items: { $elemMatch: { name: "A", qty: { $gt: 2 } } } } // mảng object
{ "items.name": "A" }                        // mảng object: có phần tử name = "A"
```

## ⑧ LỌC: NGÀY / ID / SO 2 FIELD

```js
{ createdAt: { $gte: ISODate("2024-01-01"), $lt: ISODate("2025-01-01") } }  // trong năm 2024
{ _id: ObjectId("5f5000000000000000000001") }
{ category_id: ObjectId("5f4000000000000000000002") }
{ $expr: { $gt: [ "$price", "$cost" ] } }          // so 2 field (field có $ phía trước)
```

---

## ⑨ PROJECTION / SORT / LIMIT / COUNT

```js
find( {}, { name: 1, price: 1, _id: 0 } )        // chỉ hiện name, price
find( {}, { description: 0 } )                   // ẩn description
// KHÔNG trộn 1 và 0 (trừ _id) · _id luôn hiện nếu không ghi _id: 0
find( {}, { "specs.ram": 1 } )                   // field lồng
find( {}, { tags: { $slice: 2 } } )              // 2 phần tử đầu của mảng

.sort( { price: 1 } )                 // tăng dần
.sort( { price: -1, name: 1 } )       // giá giảm dần, cùng giá thì name A→Z
.limit( 5 )                           // lấy 5
.skip( 10 ).limit( 5 )                // trang 3, mỗi trang 5: skip = (trang - 1) × 5

db.products.countDocuments( { price: { $gt: 1000 } } )
db.products.distinct( "category_id" )
```

---

## ⑩ INSERT

```js
db.products.insertOne( { name: "A", price: 1000, category_id: ObjectId("..."), tags: ["new"] } )

db.products.insertMany( [
  { name: "A", price: 1000 },
  { name: "B", price: 2000 }
] )

db.categories.insertOne( { _id: "phone", name: "Phone" } )   // tự đặt _id
db.products.insertMany( [ .. ], { ordered: false } )          // lỗi 1 doc vẫn chèn tiếp
// Không có _id → tự sinh ObjectId · trùng _id → lỗi E11000
```

## ⑪ UPDATE: TOÁN TỬ TRÊN FIELD

```js
db.products.updateOne( { name: "A" }, { $set: { price: 1500, stock: 10 } } )   // sửa / thêm field
db.products.updateOne( { name: "A" }, { $set: { "specs.ram": 32 } } )          // sửa field lồng
db.products.updateMany( {}, { $unset: { description: "" } } )                  // xoá field
db.products.updateMany( {}, { $inc: { price: 500 } } )                         // cộng (âm = trừ)
db.products.updateMany( {}, { $mul: { price: 1.1 } } )                         // nhân (tăng 10%)
db.products.updateMany( {}, { $rename: { desc: "description" } } )             // đổi tên field
db.products.updateOne( { name: "A" }, { $currentDate: { updatedAt: true } } )  // gán ngày giờ hiện tại
db.products.updateOne( { name: "A" }, { $min: { price: 900 } } )               // chỉ ghi nếu nhỏ hơn ($max: lớn hơn)
db.products.updateOne( { name: "A" }, { $set: { price: 1 }, $inc: { stock: -1 } } )  // nhiều toán tử: 1 object
```

## ⑫ UPDATE: MẢNG

```js
{ $push: { tags: "hot" } }                          // thêm vào cuối
{ $push: { tags: { $each: ["a", "b"] } } }          // thêm nhiều
{ $push: { scores: { $each: [9], $sort: -1, $slice: 3 } } }   // thêm, sắp xếp, giữ 3 phần tử
{ $addToSet: { tags: "hot" } }                      // thêm nếu CHƯA có
{ $addToSet: { tags: { $each: ["a", "b"] } } }
{ $pull: { tags: "old" } }                          // xoá mọi phần tử = "old"
{ $pull: { scores: { $lt: 5 } } }                   // xoá phần tử thoả điều kiện
{ $pullAll: { tags: ["a", "b"] } }
{ $pop: { tags: 1 } }                               // xoá phần tử cuối (-1: phần tử đầu)
// Sửa phần tử:
updateMany( { tags: "old" }, { $set: { "tags.$": "new" } } )   // $ = phần tử đầu tiên khớp (filter PHẢI có tags)
updateMany( { scores: { $exists: true } }, { $inc: { "scores.$[]": 1 } } )      // $[] = mọi phần tử
updateMany( { scores: { $exists: true } }, { $set: { "scores.$[x]": 10 } },
            { arrayFilters: [ { x: { $gt: 10 } } ] } )                          // $[x] = phần tử thoả x
// $[] / $[x]: filter PHẢI loại doc không có mảng, nếu không sẽ lỗi "path 'scores' must exist"
```

## ⑬ UPSERT / REPLACE / FIND & MODIFY

```js
db.products.updateOne( { name: "Z" }, { $set: { price: 1 } }, { upsert: true } )   // chưa có thì tạo
db.products.updateOne( { name: "Z" }, { $set: { price: 1 }, $setOnInsert: { stock: 0 } }, { upsert: true } )
db.products.replaceOne( { name: "A" }, { name: "A2", price: 1 } )       // thay toàn bộ, giữ _id
db.products.findOneAndUpdate( { name: "A" }, { $inc: { stock: -1 } }, { returnDocument: "after" } )
db.products.findOneAndDelete( { name: "A" } )
```

## ⑭ DELETE

```js
db.products.deleteOne( { name: "A" } )                         // xoá doc khớp ĐẦU TIÊN
db.products.deleteMany( { price: { $lt: 1000 } } )
db.products.deleteMany( { category_id: { $exists: false } } )
db.products.deleteMany( {} )                                   // xoá hết, giữ collection
db.products.drop()                                             // xoá luôn collection
```

---

## ⑮ AGGREGATE: STAGE

```js
db.products.aggregate( [
  { $match:   { price: { $gt: 1000 } } },                        // WHERE (giống filter)
  { $lookup:  { from: "categories", localField: "category_id",
                foreignField: "_id", as: "category" } },           // JOIN (kết quả là MẢNG)
  { $unwind:  "$category" },                                     // mảng → từng doc
  { $group:   { _id: "$category.name", total: { $sum: 1 } } },   // GROUP BY
  { $match:   { total: { $gte: 2 } } },                          // HAVING
  { $sort:    { total: -1 } },                                   // ORDER BY
  { $skip: 0 }, { $limit: 5 },                                   // LIMIT
  { $project: { _id: 0, category: "$_id", total: 1 } }           // SELECT / đổi tên
] )
{ $count: "total" }                                              // → [ { total: n } ]
{ $addFields: { vat: { $multiply: ["$price", 0.1] } } }          // thêm field tính toán
{ $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }   // giữ cả doc không join được
```

## ⑯ AGGREGATE: ACCUMULATOR & BIỂU THỨC

```js
// trong $group:
_id: "$field"   |   _id: { a: "$f1", b: "$f2" }   |   _id: null (gộp tất cả)
{ $sum: 1 }  đếm     { $sum: "$price" }  tổng      { $avg: "$price" }  trung bình
{ $min: "$price" }   { $max: "$price" }   { $push: "$name" }  gom mảng   { $addToSet: "$name" }
{ $first: "$name" }  { $last: "$name" }   (dùng $first/$last sau khi đã $sort)

// trong $project / $addFields:
{ $add: ["$a", "$b"] }  { $subtract: [..] }  { $multiply: [..] }  { $divide: ["$a", 2] }
{ $round: ["$avg", 2] }   { $concat: ["$name", " - ", "$x"] }   { $toUpper: "$name" }
{ $size: "$tags" }   { $year: "$createdAt" }   { $ifNull: ["$category_id", "N/A"] }
{ $cond: [ { $gte: ["$price", 1000] }, "đắt", "rẻ" ] }
```

> Field dùng làm GIÁ TRỊ phải có `$`: `"$price"`. Field làm KHOÁ (bên trái dấu `:`) thì không.

---

## ⑰ MẪU ĐỀ HAY GẶP (copy là dùng)

```js
// 1. Sắp xếp theo giá tăng dần
db.products.find().sort( { price: 1 } )

// 2. Top 3 sản phẩm đắt nhất
db.products.find().sort( { price: -1 } ).limit(3)

// 3. NHỮNG sản phẩm có giá thấp nhất (có thể nhiều sản phẩm cùng giá)
db.products.find( { price: db.products.find().sort({ price: 1 }).limit(1).toArray()[0].price } )
//   (giá cao nhất: đổi thành sort({ price: -1 }))

// 4. Giá thấp nhất / cao nhất / trung bình / tổng
db.products.aggregate( [ { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" },
                                     avg: { $avg: "$price" }, sum: { $sum: "$price" } } } ] )

// 5. Đếm số sản phẩm theo từng category (sản phẩm không có category_id → nhóm _id: null)
db.products.aggregate( [ { $group: { _id: "$category_id", total: { $sum: 1 } } } ] )

// 6. Sản phẩm KÈM tên category (join)
db.products.aggregate( [
  { $lookup: { from: "categories", localField: "category_id", foreignField: "_id", as: "category" } },
  { $unwind: "$category" },   // BỎ sản phẩm không có category; muốn giữ thì viết:
                              // { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }
  { $project: { _id: 0, name: 1, price: 1, categoryName: "$category.name" } }
] )

// 7. Sản phẩm thuộc category "laptop" (chỉ biết tên category)
db.products.find( { category_id: db.categories.findOne( { name: "laptop" } )._id } )

// 8. Đếm sản phẩm theo TÊN category, sắp giảm dần
db.products.aggregate( [
  { $lookup: { from: "categories", localField: "category_id", foreignField: "_id", as: "c" } },
  { $unwind: "$c" },
  { $group: { _id: "$c.name", total: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
  { $sort: { total: -1 } }
] )

// 9. Sản phẩm rẻ nhất / đắt nhất của MỖI category
db.products.aggregate( [ { $sort: { price: 1 } },
  { $group: { _id: "$category_id", cheapest: { $first: "$name" }, price: { $first: "$price" } } } ] )

// 10. Category KHÔNG có sản phẩm nào
db.categories.aggregate( [
  { $lookup: { from: "products", localField: "_id", foreignField: "category_id", as: "p" } },
  { $match: { p: { $size: 0 } } } ] )

// 11. Sản phẩm KHÔNG có category_id
db.products.find( { category_id: { $exists: false } } )

// 12. Giá từ 10 đến 20 triệu, tên chứa "pro" (không phân biệt hoa thường), chỉ hiện name, price
db.products.find( { price: { $gte: 10000000, $lte: 20000000 }, name: /pro/i }, { name: 1, price: 1, _id: 0 } )

// 13. Phân trang: trang p, mỗi trang n
db.products.find().sort( { name: 1 } ).skip( (p - 1) * n ).limit( n )

// 14. Tăng giá 10% cho mọi sản phẩm của category "phone"
db.products.updateMany( { category_id: db.categories.findOne({ name: "phone" })._id },
                        { $mul: { price: 1.1 } } )

// 15. Gán category "pc" cho các sản phẩm chưa có category
db.products.updateMany( { category_id: { $exists: false } },
                        { $set: { category_id: db.categories.findOne({ name: "pc" })._id } } )

// 16. Xoá sản phẩm giá dưới 1 triệu
db.products.deleteMany( { price: { $lt: 1000000 } } )

// 17. Số sản phẩm có giá lớn hơn giá trung bình
db.products.countDocuments( { price: { $gt:
  db.products.aggregate([ { $group: { _id: null, avg: { $avg: "$price" } } } ]).toArray()[0].avg } } )
```

---

## ⑱ BẪY HAY MẤT ĐIỂM

- Quên `$` (`{ price: { gt: 5 } }`) → **không lỗi, ra 0 kết quả**.
- `{ price: { $gt: 1 }, price: { $lt: 9 } }` → key sau đè key trước. Phải gộp: `{ price: { $gt: 1, $lt: 9 } }`.
- Update thiếu `$set` → lỗi. `replaceOne` có `$set` → lỗi.
- `{ $set: { specs: { ram: 32 } } }` → ghi đè cả object `specs`. Phải viết `{ $set: { "specs.ram": 32 } }`.
- `{ $set: {..}, $set: {..} }` → chỉ `$set` sau có tác dụng. Gộp vào 1 `$set`.
- `{ $push: { tags: ["a", "b"] } }` → thêm **1 phần tử là mảng**. Muốn thêm 2 phần tử thì dùng `$each`.
- `sort().limit(1)` chỉ trả **1** document. Đề hỏi "những sản phẩm có giá thấp nhất" thì dùng mẫu 3.
- `$lookup` trả về **mảng**. Muốn lấy `category.name` gọn gàng thì `$unwind` trước. `$unwind` sẽ **bỏ** doc không join được.
- `"arr.$[]"` / `"arr.$[x]"` với filter `{}` → lỗi nếu có doc không có `arr`. Filter thêm `{ arr: { $exists: true } }`.
- Sort tăng dần: doc **thiếu field** đứng **đầu**.
- `findOne()` không gọi tiếp được `.sort()` / `.limit()`.
- `"5"` ≠ `5`: chuỗi khác số. Chỉ số, `true`/`false`, `null` là không có ngoặc kép.
- So sánh với `_id` / `category_id` phải dùng `ObjectId("...")`, không dùng chuỗi trần.
