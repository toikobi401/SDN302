# Bài 5: Update

**Slide:** 38–43 · **Thời gian:** 40 phút · Database: `sample_mflix`
Nên chạy `.\scripts\reset-db.ps1` trước khi tự gõ thử các câu trong bài này.

## A. updateOne / updateMany với `$set`, `$unset`, `$inc`, `$mul`, `$rename`

**5.1** *(giống slide 39)* Với phim `"The Favourite"`: đặt `plot` thành `"Nữ hoàng Anne và cuộc tranh sủng của hai người hầu cận."` **và** gán trường `lastUpdated` bằng thời điểm hiện tại, dùng `$currentDate`. Viết trong **một** lệnh.

**5.2** *(giống slide 40)* Với **mọi** phim có `runtime` dưới 106 phút, thêm trường `short: true`.
Phim *Dunkirk* (106 phút) có bị cập nhật không?

**5.3** Tăng `imdb.votes` của phim `"Parasite"` thêm 1000.

**5.4** Sửa `imdb.rating` của phim `"Joker"` thành 8.5, **không làm mất** `imdb.votes`.
Viết `{ $set: { imdb: { rating: 8.5 } } }` thì chuyện gì xảy ra?

**5.5** Xoá trường `plot` khỏi **tất cả** phim năm 1994.

**5.6** Đổi tên trường `num_mflix_comments` thành `comment_count` cho **tất cả** phim.

**5.7** Nhân đôi `imdb.votes` của tất cả phim sản xuất tại `"Vietnam"`.

## B. Mảng

**5.8** Thêm diễn viên `"Park So-dam"` vào cuối `cast` của phim `"Parasite"`.

**5.9** Thêm **hai** điểm 88 và 90 vào `scores` của user có email `an.nguyen@example.com`, trong **một** lệnh.

**5.10** Thêm `"Sci-Fi"` và `"Thriller"` vào `genres` của phim `"Inception"` sao cho **không bị trùng** giá trị đã có. Sau lệnh này, `genres` của *Inception* là gì?

**5.11** Xoá sở thích `"Reading"` khỏi `hobbies` của **mọi** user.

**5.12** Xoá phần tử **cuối cùng** trong `scores` của user `"Vũ Thu Giang"`. Muốn xoá phần tử **đầu tiên** thì sửa thế nào?

**5.13** Với mọi user có sở thích `"Gaming"`, đổi **đúng phần tử đó** thành `"Esports"` (các sở thích khác giữ nguyên).

## C. Điều kiện ngày tháng, upsert, replace

**5.14** Đặt `isActive: false` cho mọi user tạo tài khoản (`createdAt`) **trước** ngày 01/01/2021.

**5.15** Cập nhật phim `"Lật Mặt 7"`: đặt `year: 2024`, `countries: ["Vietnam"]`. **Nếu chưa có phim này thì tạo mới.**
Chạy lệnh đó **2 lần** thì `upsertedCount` và `matchedCount` mỗi lần là bao nhiêu?

**5.16** *(giống slide 42)* Thay **toàn bộ** document phim `"Hai Phượng"` bằng:
`{ title: "Furie", year: 2019, genres: ["Action"], countries: ["Vietnam"] }`.
Sau đó `_id` có đổi không? Trường `runtime` còn không?

**5.17 (tìm lỗi)** Mỗi lệnh sau đều báo lỗi. Giải thích vì sao và sửa lại:
```js
db.movies.updateOne({ title: "Up" }, { year: 2010 })
db.movies.replaceOne({ title: "Up" }, { $set: { year: 2010 } })
db.movies.updateOne({ title: "Up" }, { $set: { year: 2010 }, $set: { runtime: 100 } })   // không lỗi, nhưng sai. Sai ở đâu?
```
