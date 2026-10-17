# Cheat sheet: cú pháp truy vấn mongosh

> Chỉ đọc sau khi đã tự làm bài. Đi thi viết giấy thì phải nhớ được, không mở ra xem.
> Mọi hành vi ghi trong file này đã được chạy thử trên mongosh 2.12 / MongoDB 8.3.

**Mục lục:**
[0. Viết giấy cho đúng](#0-viết-giấy-cho-đúng) ·
[1. Shell](#1-shell) ·
[2. Kiểu dữ liệu](#2-kiểu-dữ-liệu) ·
[3. Khung chung của một lệnh](#3-khung-chung-của-một-lệnh) ·
[4. Filter](#4-filter-điều-kiện-lọc) ·
[5. Toán tử truy vấn](#5-toán-tử-truy-vấn) ·
[6. Projection](#6-projection-chọn-trường-hiển-thị) ·
[7. Cursor](#7-cursor-sort-skip-limit-đếm) ·
[8. SQL → MongoDB](#8-sql--mongodb) ·
[9. Insert](#9-insert) ·
[10. Update](#10-update) ·
[11. Delete](#11-delete) ·
[12. Quan hệ](#12-quan-hệ-slide-4550) ·
[13. Aggregate](#13-aggregate-ngoài-slide) ·
[14. Lỗi thường gặp](#14-thông-báo-lỗi-thường-gặp)

---

## 0. Viết giấy cho đúng

Đọc lại từng câu theo checklist này trước khi nộp:

1. Mỗi **toán tử** đều bắt đầu bằng `$`: `$gt`, `$set`, `$in`… Quên `$` thì **không báo lỗi** mà trả về **0 kết quả**, nên rất khó phát hiện. Tên **trường** thì không có `$` (trừ trong aggregate, xem mục 13).
2. Đường dẫn có dấu chấm thì **phải nằm trong ngoặc kép**: `"imdb.rating"`, `"address.city"`, `"cast.0"`, `"hobbies.$"`.
3. Chuỗi phải có ngoặc kép, **số và `true`/`false`/`null` thì không**: `{ year: 2018 }` khác hoàn toàn `{ year: "2018" }`.
4. `$in`, `$nin`, `$all`, `$or`, `$and`, `$nor`, `insertMany`, `aggregate` đều nhận **mảng `[ ]`**.
5. Đếm đủ cặp ngoặc: `find( { ... }, { ... } )`. Mỗi `{` phải có `}`, mỗi `[` phải có `]`.
6. Giữa các cặp `key: value` có **dấu phẩy**. Sau phần tử cuối cùng không bắt buộc có.
7. Đúng **tên method**: `insertOne`, `insertMany`, `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany`, `countDocuments` (chữ cái đầu mỗi từ sau viết hoa, gọi là camelCase).
8. Update **phải có toán tử** (`$set`…). Replace thì **không được có**.
9. Ngày tháng viết `ISODate("2023-01-01")` hoặc `new Date("2023-01-01")`. Đừng so sánh ngày với chuỗi `"2023-01-01"`.
10. Đề có ghi "ẩn _id" thì nhớ thêm `_id: 0` vào projection.

---

## 1. Shell

```js
db                                   // tên database hiện tại (mới mở mongosh: test)
show dbs                             // liệt kê database (database rỗng không hiện)
use sample_mflix                     // chuyển database; chưa có thì tạo khi chèn document đầu tiên
show collections                     // = db.getCollectionNames()
db.getSiblingDB("library").books.find()   // dùng database khác mà không cần use
db.getCollection("movies").find()    // giống db.movies.find(), dùng khi tên collection có dấu "-" hoặc khoảng trắng
db.createCollection("logs")          // tạo collection rỗng
db.logs.drop()                       // xoá collection (trả về true)
db.dropDatabase()                    // xoá database ĐANG dùng
db.movies.help()                     // xem các method của collection
// Ctrl + C: dừng lệnh đang chạy · it: xem tiếp 20 document kế tiếp của cursor
```

Kết nối khi chạy mongosh: `mongosh` (cổng mặc định 27017), `mongosh --port 27027`, `mongosh "mongodb://127.0.0.1:27027/sample_mflix"`.

---

## 2. Kiểu dữ liệu

| Kiểu | Cách viết trong mongosh | Ghi chú |
|---|---|---|
| String | `"Parasite"` hoặc `'Parasite'` | |
| Number | `2018`, `8.5` | mặc định là double/int; `NumberInt(5)`, `NumberLong("5")`, `NumberDecimal("9.99")` khi cần đúng kiểu |
| Boolean | `true`, `false` | không có ngoặc kép |
| Null | `null` | |
| Array | `["Drama", "Comedy"]` | |
| Object (embedded) | `{ city: "Hà Nội", district: "Cầu Giấy" }` | |
| ObjectId | `ObjectId("5f1000000000000000000019")` | 24 ký tự hex = 12 byte |
| Date | `ISODate("2023-01-01")`, `ISODate("2023-01-01T08:30:00Z")`, `new Date("2023-01-01")`, `new Date()` (bây giờ) | `Date()` không có `new` chỉ trả về **chuỗi**, không phải Date |
| Regex | `/^The/i` | |

**ObjectId** gồm 12 byte (slide 29): 4 byte timestamp, 3 byte machine id, 2 byte process id, 3 byte bộ đếm. `ObjectId("...").getTimestamp()` trả về thời điểm tạo.

**Thứ tự khi sort** các giá trị khác kiểu (tăng dần):
`thiếu trường / null` < `số` < `chuỗi` < `object` < `array` < `ObjectId` < `boolean` < `Date`

---

## 3. Khung chung của một lệnh

```js
db.<collection>.<method>( <filter>, <tham số 2>, <options> )

db.movies.find(      { year: 2018 },  { title: 1, _id: 0 } )         // filter, projection
db.movies.updateOne( { title: "Up" }, { $set: { year: 2010 } }, { upsert: true } )   // filter, update, options
db.movies.deleteMany({ year: { $lt: 1950 } })                         // filter
```

- **filter** là một object mô tả điều kiện. `{}` hoặc bỏ trống nghĩa là "tất cả".
- Một điều kiện có dạng `{ <trường>: <giá trị> }` (so bằng) hoặc `{ <trường>: { <toán tử>: <giá trị> } }`.

---

## 4. Filter: điều kiện lọc

### 4.1 Bằng, và AND ngầm định

```js
{ year: 2018 }                                   // year == 2018
{ year: 2018, rated: "PG-13" }                   // nhiều trường cách nhau dấu phẩy = AND
{ year: { $gte: 2010, $lte: 2015 } }             // nhiều toán tử trên CÙNG trường: gộp trong 1 object = AND
```

> ⚠ `{ year: { $gte: 2010 }, year: { $lte: 2015 } }` **sai**: object JS không có 2 key trùng tên, nên key sau **ghi đè** key trước và chỉ còn `$lte: 2015`.

### 4.2 Trường lồng (embedded document)

```js
{ "address.city": "Hà Nội" }                     // dot notation: chỉ so trường city (nên dùng cách này)
{ "imdb.rating": { $gte: 8 } }
{ address: { city: "Hà Nội", district: "Cầu Giấy" } }   // so KHỚP NGUYÊN object
```

> ⚠ Cách so nguyên object chỉ khớp khi object **đúng y hệt**: đủ trường, không thừa trường, và **đúng thứ tự trường**.
> `{ address: { city: "Hà Nội" } }` sẽ **không** khớp `{ city: "Hà Nội", district: "Cầu Giấy" }`.

### 4.3 Mảng

| Viết | Nghĩa |
|---|---|
| `{ genres: "Drama" }` | mảng **chứa** phần tử "Drama" |
| `{ genres: ["Drama", "Romance"] }` | mảng **đúng bằng** `["Drama", "Romance"]`, đúng cả thứ tự |
| `{ genres: { $all: ["Romance", "Drama"] } }` | mảng chứa **cả hai**, không quan tâm thứ tự |
| `{ genres: { $in: ["Drama", "War"] } }` | mảng chứa **ít nhất một** trong các giá trị |
| `{ "cast.0": "Tom Hanks" }` | phần tử ở **vị trí 0** (index bắt đầu từ 0) |
| `{ "scores.1": { $gt: 90 } }` | phần tử thứ 2 lớn hơn 90 |
| `{ genres: { $size: 2 } }` | mảng có **đúng 2** phần tử |
| `{ scores: { $gt: 90 } }` | **có ít nhất 1** phần tử > 90 |
| `{ scores: { $gte: 90, $lt: 95 } }` | mỗi điều kiện có thể khớp với **một phần tử khác nhau** |
| `{ scores: { $elemMatch: { $gte: 90, $lt: 95 } } }` | **cùng một** phần tử thoả cả hai điều kiện |

**Mảng chứa object**, ví dụ `addresses: [{ city, zip }, ...]`:

```js
{ "addresses.city": "Boston" }                                  // có ít nhất 1 địa chỉ ở Boston
{ "addresses.city": "HN", "addresses.zip": "2" }                // city và zip có thể thuộc 2 địa chỉ KHÁC nhau
{ addresses: { $elemMatch: { city: "HN", zip: "2" } } }         // city và zip thuộc CÙNG 1 địa chỉ
```

> Có từ 2 điều kiện trở lên trên cùng một phần tử mảng thì dùng `$elemMatch`.

---

## 5. Toán tử truy vấn

### 5.1 So sánh

| Toán tử | Nghĩa | Ví dụ |
|---|---|---|
| `$eq` | = | `{ year: { $eq: 2018 } }` (viết gọn: `{ year: 2018 }`) |
| `$ne` | ≠ | `{ rated: { $ne: "R" } }` |
| `$gt` / `$gte` | > / ≥ | `{ runtime: { $gt: 120 } }` |
| `$lt` / `$lte` | < / ≤ | `{ year: { $lte: 2000 } }` |
| `$in` | thuộc danh sách | `{ rated: { $in: ["PG", "PG-13"] } }` |
| `$nin` | không thuộc danh sách | `{ rated: { $nin: ["G", "PG"] } }` |

- `$ne` và `$nin` **cũng khớp** document **không có** trường đó.
- So sánh có phân biệt kiểu: `{ v: 5 }` **không** khớp `v: "5"`.
- `$in` nhận được cả regex: `{ title: { $in: [/^The/, /^A /] } }`.

### 5.2 Logic

```js
// $or, $and, $nor: nhận MẢNG các điều kiện
{ $or:  [ { year: { $lt: 1960 } }, { "imdb.rating": { $gte: 9 } } ] }
{ $and: [ { genres: "Drama" }, { genres: { $ne: "Romance" } } ] }
{ $nor: [ { year: { $lt: 2000 } }, { runtime: { $gt: 150 } } ] }       // KHÔNG thoả cái nào trong mảng

// AND + OR: AND ngầm định ở ngoài, $or ở trong
{ year: 2018, $or: [ { rated: "PG" }, { runtime: { $lt: 100 } } ] }

// $not: đặt TRONG trường, bọc một biểu thức toán tử hoặc regex
{ runtime: { $not: { $gt: 120 } } }
{ title: { $not: /^The/ } }
```

- `$and` **bắt buộc dùng** khi cần 2 điều kiện cùng toán tử trên cùng một trường (ví dụ 2 cái `$ne`), hoặc khi kết hợp 2 khối `$or`:
  `{ $and: [ { $or: [...] }, { $or: [...] } ] }`
- `$not` **không** nhận giá trị trần: `{ v: { $not: 5 } }` báo lỗi. Phải viết `{ v: { $not: { $eq: 5 } } }`, hoặc dùng `$ne`.
- `$not` cũng khớp document **không có** trường đó. Ví dụ `{ runtime: { $not: { $gt: 120 } } }` lấy cả phim không có `runtime`.

### 5.3 Phần tử: `$exists`, `$type`, và null

| Filter | Khớp với |
|---|---|
| `{ rated: { $exists: true } }` | có trường `rated` (**kể cả** khi giá trị là `null`) |
| `{ rated: { $exists: false } }` | **không có** trường `rated` |
| `{ rated: null }` | `rated` là `null` **hoặc không có** trường `rated` |
| `{ rated: { $type: "null" } }` | **chỉ** những document có `rated: null` |
| `{ rated: { $ne: null } }` | có `rated` và giá trị khác `null` |

`$type` nhận tên kiểu: `"string"`, `"number"` (khớp mọi kiểu số), `"int"`, `"double"`, `"bool"`, `"date"`, `"object"`, `"array"`, `"objectId"`, `"null"`. Cũng nhận mã số, ví dụ `2` là string.
Có thể truyền mảng: `{ v: { $type: ["string", "null"] } }`.

### 5.4 Regex (tìm theo chuỗi)

```js
{ title: /^The/ }                              // bắt đầu bằng "The"
{ title: /Kingdom$/ }                          // kết thúc bằng "Kingdom"
{ title: /man/i }                              // chứa "man", i = không phân biệt hoa thường
{ title: { $regex: "^the", $options: "i" } }   // cách viết tương đương, dùng chuỗi
{ title: { $regex: /^the/, $options: "i" } }   // cũng hợp lệ
{ email: /@example\.com$/ }                    // dấu "." phải escape thành "\."
```

Ký hiệu hay dùng: `^` đầu chuỗi · `$` cuối chuỗi · `.` một ký tự bất kỳ · `.*` chuỗi bất kỳ · `\d` chữ số · `[abc]` một trong a, b, c · `(a|b)` a hoặc b.
Như SQL `LIKE '%abc%'` thì viết `/abc/`, còn `LIKE 'abc%'` thì viết `/^abc/`.

### 5.5 Mảng: `$all`, `$size`, `$elemMatch`

```js
{ genres: { $all: ["Animation", "Comedy"] } }
{ genres: { $size: 1 } }                              // CHỈ nhận số, KHÔNG viết được { $size: { $gt: 1 } }
{ "genres.1": { $exists: true } }                     // mẹo cho "có từ 2 phần tử trở lên"
{ scores: { $elemMatch: { $gte: 90, $lt: 95 } } }     // mảng số
{ addresses: { $elemMatch: { city: "HN", zip: "2" } } }   // mảng object
```

### 5.6 `$expr`: so sánh 2 trường trong cùng document

```js
{ $expr: { $gt: ["$awards.wins", "$awards.nominations"] } }    // wins > nominations
{ $expr: { $eq: ["$year", { $year: "$released" }] } }          // year trùng với năm của released
```

Trong `$expr`, tên trường dùng làm giá trị phải có `$` phía trước và đặt trong ngoặc kép, ví dụ `"$runtime"`.

---

## 6. Projection: chọn trường hiển thị

```js
db.movies.find({}, { title: 1, year: 1 })              // chỉ title, year (và _id)
db.movies.find({}, { title: 1, year: 1, _id: 0 })      // chỉ title, year
db.movies.find({}, { plot: 0, cast: 0 })               // tất cả TRỪ plot, cast
db.movies.find({}, { "imdb.rating": 1, _id: 0 })       // → { imdb: { rating: 8.5 } }
```

Quy tắc:
- **Không được trộn** `1` và `0` trong một projection, **trừ `_id`**. Ví dụ `{ title: 1, plot: 0 }` báo lỗi *Cannot do exclusion on field plot in inclusion projection*.
- `_id` **luôn hiện**, trừ khi ghi `_id: 0`.
- Projection là **tham số thứ 2** của `find`/`findOne`. Viết `find({ title: 1 })` thì đó là **filter**, không phải projection.

Projection trên mảng:

```js
{ scores: { $slice: 2 } }          // 2 phần tử đầu
{ scores: { $slice: -1 } }         // phần tử cuối
{ scores: { $slice: [1, 2] } }     // bỏ 1 phần tử, lấy 2 phần tử
{ addresses: { $elemMatch: { city: "Boston" } } }    // chỉ phần tử ĐẦU TIÊN khớp
db.patrons.find({ "addresses.city": "Boston" }, { "addresses.$": 1 })   // phần tử khớp với filter
```

> Projection **chỉ có** `$slice` thì vẫn trả về **mọi trường khác**. Muốn ẩn các trường còn lại thì thêm trường cần lấy, ví dụ `{ title: 1, scores: { $slice: 2 } }`.

---

## 7. Cursor: sort, skip, limit, đếm

```js
db.movies.find(filter, projection)
  .sort({ "imdb.rating": -1, title: 1 })   // 1 = tăng (A→Z), -1 = giảm; các khoá xét lần lượt từ trái sang phải
  .skip(10)                                 // bỏ qua 10 document
  .limit(5)                                 // lấy tối đa 5 document (limit(0) = không giới hạn)

// Phân trang: trang p, mỗi trang n document
db.movies.find().sort({ title: 1 }).skip((p - 1) * n).limit(n)
```

- Server **luôn** làm theo thứ tự `sort` → `skip` → `limit`, dù bạn viết chúng theo thứ tự nào.
- Muốn phân trang hoặc lấy "top N" ổn định thì nên `sort` theo một khoá duy nhất (thêm `_id` hoặc `title` làm khoá phụ).

| Method | Trả về |
|---|---|
| `find(...)` | **cursor** (mongosh in ra 20 document đầu, gõ `it` để xem tiếp) |
| `findOne(...)` | **1 document** hoặc `null`. Không gọi được `.sort()` / `.limit()` sau nó |
| `find(...).toArray()` | mảng document |
| `find(...).forEach(d => print(d.title))` | duyệt từng document |
| `find(...).map(d => d.title)` | biến đổi từng document |
| `find(...).pretty()` | in đẹp (mongosh đã in đẹp sẵn) |
| `countDocuments(filter)` | **số** document khớp, ví dụ `db.movies.countDocuments({ year: 1994 })` |
| `estimatedDocumentCount()` | ước lượng tổng số document, không nhận filter |
| `find(filter).count()` | cách cũ, **deprecated**. Khi đi thi nên viết `countDocuments` |
| `distinct("field", filter?)` | **mảng** các giá trị khác nhau, ví dụ `db.movies.distinct("genres", { year: 2018 })` |

---

## 8. SQL → MongoDB

| SQL | MongoDB |
|---|---|
| `SELECT * FROM movies` | `db.movies.find()` |
| `SELECT title, year FROM movies` | `db.movies.find({}, { title: 1, year: 1, _id: 0 })` |
| `WHERE year = 2018 AND rated = 'PG'` | `find({ year: 2018, rated: "PG" })` |
| `WHERE year = 2018 OR rated = 'PG'` | `find({ $or: [ { year: 2018 }, { rated: "PG" } ] })` |
| `WHERE rated IN ('PG', 'G')` | `find({ rated: { $in: ["PG", "G"] } })` |
| `WHERE year BETWEEN 2010 AND 2015` | `find({ year: { $gte: 2010, $lte: 2015 } })` |
| `WHERE title LIKE 'The%'` | `find({ title: /^The/ })` |
| `WHERE rated IS NULL` | `find({ rated: null })` (gồm cả trường hợp không có trường) |
| `ORDER BY year DESC, title ASC` | `.sort({ year: -1, title: 1 })` |
| `LIMIT 5 OFFSET 10` | `.skip(10).limit(5)` |
| `SELECT COUNT(*) ... WHERE ...` | `db.movies.countDocuments({ ... })` |
| `SELECT DISTINCT rated` | `db.movies.distinct("rated")` |
| `INSERT INTO movies VALUES (...)` | `db.movies.insertOne({ ... })` |
| `UPDATE movies SET a = 1 WHERE ...` | `db.movies.updateMany({ ... }, { $set: { a: 1 } })` |
| `DELETE FROM movies WHERE ...` | `db.movies.deleteMany({ ... })` |
| `GROUP BY rated` + `COUNT(*)` | `aggregate([{ $group: { _id: "$rated", n: { $sum: 1 } } }])` |
| `JOIN` | `aggregate([{ $lookup: { ... } }])` |

---

## 9. Insert

```js
db.movies.insertOne({ title: "Mai", year: 2024, genres: ["Drama", "Romance"] })
// → { acknowledged: true, insertedId: ObjectId('...') }

db.users.insertMany([
  { name: "A", age: 20 },
  { name: "B", age: 23 }
])
// → { acknowledged: true, insertedIds: { '0': ObjectId('...'), '1': ObjectId('...') } }

db.users.insertOne({ _id: "admin", name: "Quản trị viên" })   // tự đặt _id (kiểu gì cũng được, miễn không trùng)
db.users.insertMany([ ... ], { ordered: false })
```

- Không ghi `_id` thì MongoDB **tự sinh** ObjectId.
- Trùng `_id` thì báo lỗi `E11000 duplicate key error`.
- `insertMany` mặc định `ordered: true`: gặp lỗi là **dừng**, những document đứng trước đã được chèn, những document sau thì không. Với `ordered: false` thì nó **bỏ qua** document lỗi và chèn tiếp phần còn lại.
- Collection hoặc database chưa tồn tại thì sẽ được **tự tạo** ở lần chèn đầu tiên.

---

## 10. Update

### 10.1 Cú pháp

```js
db.c.updateOne(  <filter>, <update>, <options> )   // sửa document khớp ĐẦU TIÊN
db.c.updateMany( <filter>, <update>, <options> )   // sửa MỌI document khớp; updateMany({}, ...) = tất cả
db.c.replaceOne( <filter>, <document mới>, <options> )  // thay TOÀN BỘ nội dung, giữ nguyên _id

// <update> = { $toánTử1: { trường: giá trị, ... }, $toánTử2: { ... } }
db.movies.updateOne(
  { title: "The Favourite" },
  { $set: { plot: "..." }, $currentDate: { lastUpdated: true } }
)
// → { acknowledged: true, insertedId: null, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 }
```

- `matchedCount`: số document khớp filter. `modifiedCount`: số document **thật sự bị thay đổi**; đặt lại đúng giá trị cũ thì không tính.
- options: `{ upsert: true }`, `{ arrayFilters: [...] }`.

### 10.2 Toán tử trên trường

| Toán tử | Ví dụ | Ghi chú |
|---|---|---|
| `$set` | `{ $set: { "imdb.rating": 8.5, short: true } }` | trường chưa có thì **tạo mới**, kể cả đường dẫn lồng như `"a.b.c"` |
| `$unset` | `{ $unset: { plot: "", tmp: "" } }` | xoá trường; giá trị ghi gì cũng được (`""`, `1`) |
| `$inc` | `{ $inc: { "imdb.votes": 1000, age: -1 } }` | cộng (số âm là trừ); trường chưa có thì tạo với giá trị đó; trường không phải số thì **lỗi** |
| `$mul` | `{ $mul: { price: 1.1 } }` | nhân |
| `$min` / `$max` | `{ $max: { highScore: 95 } }` | chỉ ghi nếu giá trị mới nhỏ hơn / lớn hơn giá trị hiện tại |
| `$rename` | `{ $rename: { num_mflix_comments: "comment_count" } }` | đổi tên trường |
| `$currentDate` | `{ $currentDate: { lastUpdated: true } }` | gán bằng thời điểm hiện tại (kiểu Date) |
| `$setOnInsert` | `{ $setOnInsert: { createdAt: new Date() } }` | chỉ ghi khi upsert **tạo mới** document |

### 10.3 Toán tử trên mảng

| Toán tử | Ví dụ | Kết quả |
|---|---|---|
| `$push` | `{ $push: { cast: "Park So-dam" } }` | thêm vào **cuối** (kể cả khi đã có rồi) |
| `$push` + `$each` | `{ $push: { scores: { $each: [88, 90] } } }` | thêm **nhiều** phần tử |
| `$push` + modifier | `{ $push: { scores: { $each: [99], $sort: -1, $slice: 3 } } }` | thêm, sắp giảm dần, giữ 3 phần tử đầu (top 3) |
| | `{ $push: { scores: { $each: [1], $position: 0 } } }` | chèn vào **đầu** mảng |
| `$addToSet` | `{ $addToSet: { genres: "Thriller" } }` | thêm nếu **chưa có** |
| `$addToSet` + `$each` | `{ $addToSet: { genres: { $each: ["Sci-Fi", "Thriller"] } } }` | thêm nhiều phần tử, bỏ qua phần tử đã có |
| `$pop` | `{ $pop: { scores: 1 } }` / `{ $pop: { scores: -1 } }` | xoá phần tử **cuối** / **đầu** |
| `$pull` | `{ $pull: { hobbies: "Reading" } }` | xoá **mọi** phần tử bằng giá trị đó |
| `$pull` + điều kiện | `{ $pull: { scores: { $lt: 60 } } }` | xoá mọi phần tử < 60 |
| | `{ $pull: { addresses: { city: "Boston" } } }` | xoá các object có `city` là Boston |
| `$pullAll` | `{ $pullAll: { tags: ["a", "b"] } }` | xoá mọi phần tử nằm trong danh sách |

> ⚠ `{ $push: { scores: [88, 90] } }` thêm **một phần tử là mảng** `[88, 90]`, không phải 2 số. Muốn thêm 2 số thì dùng `$each`.

### 10.4 Sửa phần tử trong mảng: positional operator

```js
// $   : phần tử ĐẦU TIÊN khớp filter. Filter BẮT BUỘC phải có điều kiện trên mảng đó
db.users.updateMany({ hobbies: "Gaming" }, { $set: { "hobbies.$": "Esports" } })
db.patrons.updateOne({ _id: "ann", "addresses.city": "Boston" }, { $set: { "addresses.$.zip": "02101" } })

// $[] : TẤT CẢ phần tử
db.users.updateMany({}, { $inc: { "scores.$[]": 5 } })

// $[x] + arrayFilters : các phần tử thoả điều kiện x
db.users.updateMany({}, { $set: { "scores.$[s]": 100 } }, { arrayFilters: [ { s: { $gte: 95 } } ] })
// ⚠ $[] và $[x] báo lỗi "The path 'scores' must exist" nếu có document KHÔNG có mảng scores.
//   Filter {} ở trên chạy được chỉ vì user nào cũng có scores; an toàn hơn: { scores: { $exists: true } }

// Theo vị trí cố định
db.movies.updateOne({ title: "Up" }, { $set: { "cast.0": "Edward Asner" } })
```

### 10.5 Upsert

```js
db.movies.updateOne(
  { title: "Lật Mặt 7" },                          // không tìm thấy thì...
  { $set: { year: 2024 }, $setOnInsert: { views: 0 } },
  { upsert: true }                                 // ...tạo mới: { _id, title: "Lật Mặt 7", year: 2024, views: 0 }
)
// Lần 1: upsertedCount 1, insertedId = _id mới · Lần 2: matchedCount 1, upsertedCount 0
```

Document được tạo ra gồm các trường **so bằng** trong filter cộng với các trường của `$set` / `$setOnInsert`.

### 10.6 replaceOne và findOneAnd…

```js
db.movies.replaceOne({ title: "Hai Phượng" }, { title: "Furie", year: 2019 })
// Giữ _id cũ, MẤT mọi trường không có trong document mới. Không được chứa $set...

db.movies.findOneAndUpdate({ title: "Up" }, { $inc: { "imdb.votes": 1 } })
// → trả về document TRƯỚC khi sửa (mặc định)
db.movies.findOneAndUpdate({ title: "Up" }, { $inc: { "imdb.votes": 1 } }, { returnDocument: "after" })
// → trả về document SAU khi sửa
db.movies.findOneAndReplace(filter, doc, { returnDocument: "after" })
db.movies.findOneAndDelete(filter)          // → document vừa bị xoá (hoặc null)
```

### 10.7 Lỗi hay gặp khi update

| Viết sai | Hậu quả |
|---|---|
| `updateOne({ title: "Up" }, { year: 2010 })` | lỗi *Update document requires atomic operators*, vì thiếu `$set` |
| `replaceOne({ ... }, { $set: { ... } })` | lỗi *Replacement document must not contain atomic operators* |
| `{ $set: { imdb: { rating: 8.5 } } }` | **ghi đè** cả object `imdb`, làm mất `votes`. Phải viết `{ $set: { "imdb.rating": 8.5 } }` |
| `{ $set: { a: 1 }, $set: { b: 2 } }` | không báo lỗi, nhưng chỉ còn `b` được set. Phải gộp: `{ $set: { a: 1, b: 2 } }` |
| `{ $set: { name: "x" }, $unset: { name: "" } }` | lỗi *would create a conflict*, vì 2 toán tử cùng sửa một trường |
| `{ $set: { _id: 10 } }` | lỗi, vì `_id` không được sửa |
| `{ $set: { "hobbies.$": "x" } }` mà filter không có điều kiện trên `hobbies` | lỗi *The positional operator did not find the match needed from the query* |
| `updateOne` khi muốn sửa nhiều document | chỉ document đầu tiên bị sửa |

---

## 11. Delete

```js
db.comments.deleteOne({ email: "an.nguyen@example.com" })   // xoá document khớp ĐẦU TIÊN
db.comments.deleteMany({ rating: { $lt: 5 } })              // xoá mọi document khớp
// → { acknowledged: true, deletedCount: 2 }

db.comments.deleteMany({})     // xoá HẾT document; collection và index vẫn còn
db.comments.drop()             // xoá luôn cả collection lẫn index
db.dropDatabase()              // xoá database đang dùng
```

- `deleteOne({})` chỉ xoá **1** document.
- Không tìm thấy gì để xoá thì vẫn **không báo lỗi**, chỉ trả về `deletedCount: 0`.

---

## 12. Quan hệ (slide 45–50)

| Mô hình | Khi nào dùng | Ví dụ |
|---|---|---|
| **Embedded 1-1** | dữ liệu luôn được đọc cùng nhau | `patron.address: { street, city, ... }` |
| **Embedded 1-n** | "n" nhỏ, ít thay đổi, chỉ thuộc về document cha | `patron.addresses: [ {...}, {...} ]` |
| **Reference** | dữ liệu dùng chung, hay thay đổi, "n" rất lớn | `book.publisher_id: "oreilly"` (slide 50) |

- Slide 49 lưu mảng `books: [id1, id2, ...]` **trong publisher**. Nhược điểm: mảng cứ phình to mãi, phải sửa publisher mỗi lần thêm sách, dữ liệu có thể bị lặp.
- Slide 50 lưu `publisher_id` **trong book**: mỗi cuốn sách chỉ trỏ tới 1 NXB, không có mảng nào phình to.

```js
// Truy vấn embedded
db.patrons.find({ "address.city": "Faketon" })
db.patrons.find({ "addresses.city": "Boston" })

// "Join" thủ công, viết trong 1 lệnh
db.publishers.findOne({ _id: db.books.findOne({ title: "MongoDB in Action" }).publisher_id })

// Join bằng $lookup
db.books.aggregate([
  { $lookup: {
      from: "publishers",          // collection cần nối
      localField: "publisher_id",  // trường của books
      foreignField: "_id",         // trường của publishers
      as: "publisher"              // tên trường kết quả (luôn là MẢNG)
  } },
  { $unwind: "$publisher" },       // (tuỳ chọn) đổi mảng 1 phần tử thành object
  { $project: { _id: 0, title: 1, "publisher.name": 1 } }
])
```

---

## 13. Aggregate (ngoài slide)

```js
db.collection.aggregate([ { stage1 }, { stage2 }, ... ])   // kết quả của stage trước là đầu vào của stage sau
```

| Stage | Cú pháp | Giống SQL |
|---|---|---|
| `$match` | `{ $match: { year: { $gte: 2015 } } }` (cú pháp giống filter của find) | `WHERE` / `HAVING` |
| `$project` | `{ $project: { _id: 0, title: 1, hours: { $divide: ["$runtime", 60] } } }` | `SELECT` |
| `$addFields` / `$set` | `{ $addFields: { decade: { $subtract: ["$year", { $mod: ["$year", 10] }] } } }` | thêm cột |
| `$group` | `{ $group: { _id: "$rated", total: { $sum: 1 }, avg: { $avg: "$imdb.rating" } } }` | `GROUP BY` |
| `$sort` | `{ $sort: { total: -1, _id: 1 } }` | `ORDER BY` |
| `$limit` / `$skip` | `{ $limit: 5 }`, `{ $skip: 10 }` | `LIMIT` / `OFFSET` |
| `$unwind` | `{ $unwind: "$genres" }` | tách mỗi phần tử mảng thành 1 document |
| `$lookup` | xem mục 12 | `JOIN` |
| `$count` | `{ $count: "total" }` → `[{ total: 14 }]` | `COUNT(*)` |

**`$group`**
- `_id` là khoá nhóm: `"$rated"`, hoặc nhóm theo nhiều trường `{ r: "$rated", y: "$year" }`, hoặc `null` để gộp tất cả thành một nhóm.
- Accumulator: `$sum` (`$sum: 1` để đếm, `$sum: "$pages"` để cộng), `$avg`, `$min`, `$max`, `$push` (gom vào mảng), `$addToSet` (gom, không trùng), `$first`, `$last`.
- Sau `$group`, document chỉ còn `_id` và các trường bạn vừa tính.

**Biểu thức thường dùng** trong `$project`, `$addFields`, `$group`:
- Toán học: `$add`, `$subtract`, `$multiply`, `$divide`, `$mod`, `$round: ["$x", 2]`
- Chuỗi: `$concat: ["$a", " - ", "$b"]`, `$toUpper`, `$toLower`
- Mảng: `$size: "$genres"`, `$avg: "$scores"` (trung bình của một mảng), `$first: "$arr"`
- Ngày: `$year: "$released"`, `$month`, `$dayOfMonth`
- Điều kiện: `$cond: [ { $gte: ["$imdb.rating", 8] }, "hay", "thường" ]`, `$ifNull: ["$rated", "N/A"]`

> Trong aggregate, tên trường dùng làm **giá trị** phải có `$`: `"$genres"`, `"$imdb.rating"`. Tên trường làm **khoá** (bên trái dấu `:`) thì không có `$`.

```js
// Ví dụ đầy đủ: top 5 thể loại có điểm trung bình cao nhất trong các phim từ năm 2000, chỉ xét thể loại có ≥ 3 phim
db.movies.aggregate([
  { $match: { year: { $gte: 2000 } } },
  { $unwind: "$genres" },
  { $group: { _id: "$genres", count: { $sum: 1 }, avg: { $avg: "$imdb.rating" } } },
  { $match: { count: { $gte: 3 } } },
  { $sort: { avg: -1, _id: 1 } },
  { $limit: 5 },
  { $project: { _id: 0, genre: "$_id", count: 1, avg: { $round: ["$avg", 2] } } }
])
```

---

## 14. Thông báo lỗi thường gặp

| Thông báo | Nguyên nhân |
|---|---|
| `SyntaxError: Unexpected token` | thiếu hoặc thừa dấu `,` `{` `}` `[` `]` `(` `)`, hoặc thiếu ngoặc kép |
| `Update document requires atomic operators` | update không có `$set`… (hoặc update rỗng `{}`) |
| `Replacement document must not contain atomic operators` | `replaceOne` chứa `$set`… |
| `Cannot do exclusion on field X in inclusion projection` | projection trộn `1` và `0` |
| `$not argument must be a regex or an object` | viết `{ $not: 5 }` thay vì `{ $not: { $eq: 5 } }` |
| `Failed to parse $size. Expected a number` | viết `{ $size: { $gt: 1 } }` |
| `unknown operator: $xyz` | gõ sai tên toán tử, ví dụ `$gtt` |
| *(không lỗi, nhưng 0 kết quả)* | **quên `$`**: `{ year: { gt: 2000 } }` bị hiểu là "year bằng object `{ gt: 2000 }`" |
| `E11000 duplicate key error` | trùng `_id` (hoặc trùng giá trị của unique index) |
| `Cannot apply $inc to a value of non-numeric type` | `$inc` / `$mul` vào trường không phải số |
| `Updating the path 'x' would create a conflict` | 2 toán tử cùng sửa một trường trong một lệnh |
| `would modify the immutable field '_id'` | cố sửa `_id` |
| `The positional operator did not find the match needed from the query` | dùng `"arr.$"` mà filter không có điều kiện trên `arr` |
| `ReferenceError: xyz is not defined` | quên ngoặc kép quanh chuỗi, ví dụ `{ title: Parasite }` |
