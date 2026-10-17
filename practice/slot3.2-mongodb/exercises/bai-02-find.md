# Bài 2: find cơ bản

**Slide:** 33–37 · **Thời gian:** 35 phút · Database: `sample_mflix` · Collection: `movies` (trừ khi đề ghi khác)

> Quy ước chung cho mọi bài: *"hiển thị a, b"* nghĩa là **chỉ** hiện các trường a, b và **ẩn `_id`**, trừ khi đề ghi khác.

**2.1** Lấy toàn bộ phim. *(tương đương `SELECT * FROM movies`)*

**2.2** Tìm phim có `title` là `"Jurassic World: Fallen Kingdom"`.

**2.3** Tìm các phim năm 2018. Hiển thị `title`, `year`.

**2.4** Tìm các phim có `rated` là `"PG"` hoặc `"PG-13"`, **dùng `$in`**. Hiển thị `title`, `rated`.

**2.5** Viết lại câu 2.4, lần này **dùng `$or`** thay cho `$in`.

**2.6** Tìm các phim có thể loại (`genres`) `"Action"` **và** thời lượng (`runtime`) **ít nhất** 100 phút. Hiển thị `title`, `runtime`.

**2.7** Tìm các phim do `"Christopher Nolan"` đạo diễn (`directors`), sắp xếp theo `year` **tăng dần**. Hiển thị `title`, `year`.

**2.8** Tìm **5** phim có điểm IMDb (`imdb.rating`) cao nhất. Hiển thị `title` và `imdb.rating`.

**2.9** Phân trang: sắp phim theo `title` A→Z, mỗi trang 5 phim. Lấy **trang 3**. Chỉ hiển thị `title`.

**2.10** Đếm số phim năm 1994.

**2.11** Liệt kê tất cả giá trị **khác nhau** của trường `rated`.

**2.12** Tìm các phim có diễn viên `"Tom Hanks"` (trường `cast`). Hiển thị `title`, `cast`.

**2.13** Chỉ lấy **một** document (không phải cursor): phim `"Parasite"`, hiển thị `directors` và `cast`.

**2.14** Tìm các phim có sản xuất ở `"Japan"` (trường `countries`), sắp theo `year` **giảm dần**. Hiển thị `title`, `year`, `countries`.

**2.15** Đếm số phim bộ (`type` là `"series"`).

**2.16** Chuyển câu SQL sau sang MongoDB:
```sql
SELECT title, year FROM movies
WHERE year = 2016 AND rated = 'PG'
ORDER BY title DESC
```
