# Luyện tập Slot 3.2: truy vấn MongoDB bằng mongosh (thi viết giấy)

Bộ đề bám sát slide **Slot3.2_NoSQL-Database-With-MongoDB.pptx**: shell (slide 18–29), CRUD (30–44), Mapping Relationships (45–50). Bài 7 (aggregate) nằm **ngoài slide**, làm thêm nếu còn thời gian.

## Cách luyện

1. Mở đề trong [exercises/](exercises/), **viết đáp án ra giấy** như lúc đi thi. Không mở mongosh, không xem [CHEATSHEET.md](CHEATSHEET.md).
2. Chụp ảnh bài làm, gửi vào session Claude Code này để chấm. Claude sẽ chạy từng câu trên DB 27027 và báo đúng/sai, lỗi cú pháp, chỗ cần sửa.
3. Tự gõ lại những câu sai vào mongosh để thấy kết quả thật.
4. Sau những bài có insert/update/delete, **reset dữ liệu** để lần sau làm lại từ đầu.

## Server

| | |
|---|---|
| Địa chỉ | `mongodb://127.0.0.1:27027` |
| Database | `sample_mflix` (movies, users, comments), `library` (patrons, publishers, books), `store` (categories, products) |
| Dữ liệu lưu ở | `%LOCALAPPDATA%\sdn302-mongo\data` (để ngoài OneDrive cho an toàn) |

Server này **chạy riêng**, không ảnh hưởng đến service MongoDB mặc định ở cổng 27017. Khởi động lại máy thì server tắt, cần bật lại:

```powershell
cd practice/slot3.2-mongodb
.\scripts\start-db.ps1     # bật server (lần đầu tự nạp dữ liệu mẫu)
.\scripts\reset-db.ps1     # xoá sạch và nạp lại dữ liệu mẫu
.\scripts\stop-db.ps1      # tắt server
```

> Nếu PowerShell báo *running scripts is disabled*, chạy kiểu này: `powershell -ExecutionPolicy Bypass -File .\scripts\start-db.ps1`

Kết nối:

```powershell
mongosh --port 27027                 # vào database mặc định "test", rồi gõ: use sample_mflix
mongosh mongodb://127.0.0.1:27027/sample_mflix
```

MongoDB Compass: bấm vào connection đã lưu sẵn **SDN302 Practice (27027)** ở thanh bên trái (URI `mongodb://127.0.0.1:27027/`). Nhớ bật server trước bằng `.\scripts\start-db.ps1`.

## Dữ liệu

### `sample_mflix.movies`: 43 document

```js
{
  _id: ObjectId('5f1000000000000000000019'),
  type: 'movie',                    // 'movie' hoặc 'series' (Breaking Bad, Sherlock)
  title: 'Parasite',
  year: 2019,
  rated: 'R',                       // G, PG, PG-13, R, NOT RATED, PASSED, TV-14, TV-MA
  runtime: 132,                     // phút
  genres: ['Comedy', 'Drama', 'Thriller'],
  directors: ['Bong Joon Ho'],
  cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik'],
  countries: ['South Korea'],
  languages: ['Korean', 'English'],
  released: ISODate('2019-05-30T00:00:00.000Z'),
  imdb: { rating: 8.5, votes: 950000 },
  awards: { wins: 310, nominations: 267, text: 'Won 4 Oscars. ...' },
  plot: 'Greed and class discrimination threaten ...',
  num_mflix_comments: 4             // số bình luận trong collection comments
}
```

Những document "đặc biệt" (hay gặp trong đề):
- `Citizen Kane`, `Bố Già`: **không có** trường `rated`.
- `Metropolis`: có trường `rated` nhưng giá trị là **`null`**.
- `Hai Phượng`, `Bố Già`: **không có** trường `awards`.
- 3 phim Việt Nam: `Hai Phượng`, `Mắt Biếc`, `Bố Già` (`countries: ['Vietnam']`).

### `sample_mflix.users`: 12 document

```js
{
  _id: ObjectId('5f2000000000000000000001'),
  name: 'Nguyễn Văn An',
  email: 'an.nguyen@example.com',
  age: 22,                          // "Mai Anh Tuấn" không có age, nhưng có thêm phone
  gender: 'M',
  address: { city: 'Hà Nội', district: 'Cầu Giấy' },
  hobbies: ['Reading', 'Gaming', 'Football'],   // có user hobbies rỗng []
  scores: [78, 85, 92],                         // có user scores rỗng []
  isActive: true,
  createdAt: ISODate('2022-03-15T08:30:00.000Z')
}
```

### `sample_mflix.comments`: 30 document

```js
{
  _id: ObjectId('5f3000000000000000000001'),
  name: 'Nguyễn Văn An',                        // tên và email của người bình luận (trùng users)
  email: 'an.nguyen@example.com',
  movie_id: ObjectId('5f1000000000000000000008'),  // tham chiếu tới movies._id (Inception)
  rating: 10,                                   // 1–10
  text: 'Mind-bending! Xem 3 lần vẫn chưa hiểu hết.',
  date: ISODate('2023-01-05T20:00:00.000Z')
}
```

### `library`: dữ liệu giống slide 46–50

```js
// patrons: embedded (1-1 và 1-n)
{ _id: 'joe', name: 'Joe Bookreader', address: { street: '123 Fake Street', city: 'Faketon', state: 'MA', zip: '12345' } }
{ _id: 'ann', name: 'Ann Reader', addresses: [ { street: '123 Fake Street', city: 'Faketon', ... }, { street: '1 Some Other Street', city: 'Boston', ... } ] }

// publishers: _id là 'oreilly', 'manning', 'nxbkimdong'
{ _id: 'oreilly', name: "O'Reilly Media", founded: 1980, location: 'CA' }

// books (6 cuốn): tham chiếu tới NXB qua publisher_id (slide 50)
{ _id: 123456789, title: 'MongoDB: The Definitive Guide', author: ['Kristina Chodorow', 'Mike Dirolf'],
  published_date: ISODate('2010-09-24'), pages: 216, language: 'English', publisher_id: 'oreilly' }
```

### `store`: cửa hàng điện tử

```js
// categories: 3 document
{ _id: ObjectId('5f4000000000000000000001'), name: 'phone' }
{ _id: ObjectId('5f4000000000000000000002'), name: 'laptop' }
{ _id: ObjectId('5f4000000000000000000003'), name: 'pc' }

// products: 22 document. 18 sản phẩm có category_id (mỗi loại 6 sản phẩm), tham chiếu tới categories._id.
//           4 phụ kiện (tai nghe, chuột, bàn phím, sạc dự phòng) KHÔNG có trường category_id.
{
  _id: ObjectId('5f5000000000000000000001'),
  name: 'iPhone 15 Pro Max 256GB',
  price: 29990000,                                   // VND, không có 2 sản phẩm nào trùng giá
  category_id: ObjectId('5f4000000000000000000001'), // phone
  description: 'Chip A17 Pro, khung titan, camera 48MP, màn hình 6.7 inch.'
}
```

## Lộ trình

| # | Bài | Nội dung | Slide | Số câu | Thời gian |
|---|-----|----------|-------|:---:|:---:|
| 1 | [Shell cơ bản](exercises/bai-01-shell.md) | `db`, `use`, `show`, `getSiblingDB`, tạo/xoá collection & database, ObjectId | 18–29 | 12 | 20' |
| 2 | [find cơ bản](exercises/bai-02-find.md) | điều kiện, projection, `sort`/`skip`/`limit`, `countDocuments`, `distinct`, `findOne` | 33–37 | 16 | 35' |
| 3 | [Toán tử truy vấn](exercises/bai-03-toan-tu.md) | so sánh, logic, `$exists`/`$type`, regex, mảng, `$elemMatch`, ngày tháng | 33–37 | 23 | 50' |
| 4 | [Insert & Delete](exercises/bai-04-insert-delete.md) | `insertOne`/`insertMany`, `ordered`, `deleteOne`/`deleteMany` | 31–32, 44 | 11 | 25' |
| 5 | [Update](exercises/bai-05-update.md) | `$set` `$unset` `$inc` `$mul` `$rename` `$push` `$addToSet` `$pull` `$pop`, `$`, upsert, `replaceOne` | 38–43 | 17 | 40' |
| 6 | [Quan hệ (relationships)](exercises/bai-06-quan-he.md) | embedded vs reference, truy vấn document lồng, `$lookup` | 45–50 | 11 | 30' |
| 7 | [Aggregate](exercises/bai-07-aggregate.md) *(ngoài slide)* | `$match` `$group` `$sort` `$project` `$unwind` `$lookup` `$count` | — | 10 | 40' |
| ★ | [Đề thi thử 01](exercises/de-thi-thu-01.md) | tổng hợp, có tính điểm | toàn bộ | 10 | 45' |

Ôn cú pháp: [CHEATSHEET.md](CHEATSHEET.md). Chỉ xem **sau khi** đã làm bài.
