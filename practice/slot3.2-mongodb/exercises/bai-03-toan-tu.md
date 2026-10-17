# Bài 3: Toán tử truy vấn

**Slide:** 33–37 · **Thời gian:** 50 phút · Database: `sample_mflix`
*"Hiển thị a, b"* = chỉ hiện a, b và ẩn `_id`.

## A. So sánh (collection `movies`)

**3.1** Phim có `runtime` **dưới** 90 phút, sắp theo `runtime` tăng dần. Hiển thị `title`, `runtime`.

**3.2** Phim có `year` từ 2010 đến 2015 (**tính cả** 2010 và 2015), sắp theo `year` tăng dần; cùng năm thì theo `title` A→Z. Hiển thị `title`, `year`.

**3.3** Đếm số phim có `rated` **khác** `"R"` (dùng `$ne`). Kết quả có tính cả phim **không có** trường `rated` không? Giải thích.

**3.4** Phim có `rated` **không thuộc** `G, PG, PG-13, R`. Hiển thị `title`, `rated`.

## B. Logic

**3.5** Phim ra đời **trước** năm 1960 **hoặc** có `imdb.rating` **từ 9 trở lên**. Hiển thị `title`, `year`, `imdb.rating`.

**3.6** Đếm số phim có thể loại `"Drama"` nhưng **không** có `"Romance"`.

**3.7** Phim **không có** trường `rated`. Hiển thị `title`.

**3.8** Phim **có** trường `rated` nhưng giá trị là `null`. Hiển thị `title`.
Sau đó cho biết `db.movies.find({ rated: null })` trả về những phim nào, và vì sao khác câu 3.7 / 3.8.

**3.9** Phim **không có** trường `awards`. Hiển thị `title`.

## C. Chuỗi, regex

**3.10** Phim có `title` **bắt đầu** bằng `"The"`. Hiển thị `title`.

**3.11** Phim có `title` **chứa** chữ `"the"`, **không phân biệt hoa thường**. Hiển thị `title`. So với câu 3.10, có thêm phim nào? Vì sao?

**3.12** Đếm số phim có `title` **không** bắt đầu bằng `"The"` (dùng `$not`).

## D. Mảng

**3.13** Phim có `genres` chứa **cả** `"Animation"` và `"Comedy"` (không quan tâm thứ tự). Hiển thị `title`, `genres`.

**3.14** Phim có `genres` gồm **đúng 1** phần tử. Hiển thị `title`, `genres`.

**3.15** Phim có diễn viên **đứng đầu** danh sách `cast` là `"Leonardo DiCaprio"`. Hiển thị `title`.

**3.16** Phim có `languages` chứa `"Korean"` **hoặc** `"Japanese"`. Hiển thị `title`, `languages`.

## E. Document lồng (embedded)

**3.17** Phim có số giải thắng (`awards.wins`) **lớn hơn** 200, sắp theo số giải giảm dần. Hiển thị `title`, `awards.wins`.

**3.18** (collection `users`) User sống ở thành phố `"Hà Nội"` (`address.city`) **và** trên 20 tuổi. Hiển thị `name`, `age`, `address`.

**3.19** (collection `users`) User có **ít nhất một** điểm trong `scores` nằm trong khoảng **[90, 95)**, tức `>= 90` và `< 95`. Hiển thị `name`, `scores`.
Nếu viết `{ scores: { $gte: 90, $lt: 95 } }` (không có `$elemMatch`) thì có thêm user nào? Vì sao?

**3.20** (collection `users`) User có `hobbies` **rỗng** hoặc `scores` **rỗng**. Hiển thị `name`.

**3.21** (collection `users`) User tạo tài khoản (`createdAt`) **trong năm 2023**. Hiển thị `name`, `createdAt`.

**3.22** (collection `users`) User **không** sống ở `"Hà Nội"` và cũng **không** sống ở `"Hồ Chí Minh"`. Hiển thị `name`, `address.city`.

## F. Nâng cao ★

**3.23** Phim có số giải thắng **lớn hơn** số đề cử (`awards.wins > awards.nominations`). Gợi ý: so sánh hai trường **của cùng một document**. Hiển thị `title`, `awards`.
