# Bài 7: Aggregation pipeline *(ngoài slide 3.2, làm thêm)*

**Thời gian:** 40 phút · Database: `sample_mflix` (trừ câu 7.9)
Cú pháp: `db.collection.aggregate([ { stage1 }, { stage2 }, ... ])`

**7.1** Đếm số phim theo **từng năm**, chỉ xét phim từ năm 2015 trở đi. Kết quả dạng `{ _id: <năm>, count: <số phim> }`, sắp theo năm tăng dần.

**7.2** Tính điểm IMDb **trung bình** (`imdb.rating`) theo từng loại `rated`. Bỏ qua phim không có `rated` hoặc `rated` là `null`. Kết quả dạng `{ _id: <rated>, avgRating, total }`, sắp theo `avgRating` giảm dần; bằng nhau thì theo `_id` A→Z.

**7.3** Đếm số phim của **từng thể loại** (một phim có nhiều thể loại thì tính vào mỗi thể loại). Kết quả `{ _id: <thể loại>, count }`, sắp theo `count` giảm dần; bằng nhau thì theo `_id` A→Z.

**7.4** Tìm các đạo diễn có **từ 2 phim trở lên**. Kết quả `{ _id: <đạo diễn>, movies: [<các title>], count }`, sắp theo `count` giảm dần.

**7.5** Với các phim năm 2018, hiển thị `title` và `runtimeHours` là thời lượng tính bằng **giờ**, làm tròn 1 chữ số thập phân (ví dụ 128 phút → 2.1). Ẩn `_id`.

**7.6** (collection `comments`) Với mỗi phim: đếm số bình luận (`total`) và điểm bình luận trung bình (`avgRating`). Lấy **3** phim có nhiều bình luận nhất (bằng nhau thì `avgRating` cao hơn đứng trước), rồi `$lookup` sang `movies` để lấy tên phim. Kết quả dạng `{ title, total, avgRating }`.

**7.7** (collection `users`) Đếm số user theo **thành phố** (`address.city`), sắp theo số lượng giảm dần; bằng nhau thì theo tên thành phố A→Z.

**7.8** Đếm số phim có `imdb.rating` từ 8.5 trở lên **bằng stage `$count`**. Kết quả dạng `[{ total: <số> }]`.

**7.9** (database `library`) Với mỗi NXB (`publisher_id`), tính **số sách** (`totalBooks`) và **tổng số trang** (`totalPages`). Sắp theo `totalBooks` giảm dần.

**7.10** (collection `users`) Hiển thị `name` và `avgScore` là điểm trung bình của mảng `scores`, sắp theo `avgScore` giảm dần. Ẩn `_id`.
User có `scores` rỗng thì `avgScore` bằng bao nhiêu, và đứng ở đâu trong kết quả?
