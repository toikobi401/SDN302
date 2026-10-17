# Đề thi thử 01: Truy vấn MongoDB (mongosh)

**Thời gian:** 45 phút · **Tổng:** 10 điểm · Không dùng tài liệu, không dùng máy.
Database `sample_mflix`, collections `movies`, `users`, `comments` (cấu trúc xem ở [README](../README.md)).
*"Hiển thị a, b"* = chỉ hiện a, b và ẩn `_id`. Mỗi câu viết **một** lệnh, trừ khi đề ghi khác.

---

**Câu 1 (0.5đ)** Chuyển sang database `sample_mflix`, rồi liệt kê các collection trong đó.

**Câu 2 (1đ)** Tìm các phim ra mắt năm **2016 hoặc 2017** có `imdb.rating` **từ 8 trở lên**. Hiển thị `title`, `year`, `imdb.rating`, sắp theo `imdb.rating` giảm dần; bằng nhau thì theo `title` A→Z.

**Câu 3 (1đ)** Đếm số bình luận (`comments`) chấm **10** điểm (`rating`) được viết **trong năm 2023** (trường `date`).

**Câu 4 (1đ)** Lấy **3** user **trẻ tuổi nhất**, chỉ xét những user **có** trường `age`. Hiển thị `name`, `age`.
*(Nếu quên điều kiện "có trường age" thì kết quả sai ở đâu?)*

**Câu 5 (1đ)** Tìm phim có diễn viên `"Tom Hardy"` nhưng **không** do `"Christopher Nolan"` đạo diễn. Hiển thị `title`, `directors`.

**Câu 6 (1đ)** User `Lý Thảo Vy` (email `vy.ly@example.com`) bình luận phim *Coco* (`_id: ObjectId('5f1000000000000000000025')`): 9 điểm, nội dung `"Remember me~"`, lúc **01/10/2026 21:00 UTC**. Thêm bình luận này.

**Câu 7 (1đ)** Với các phim năm **2018** có `imdb.votes` **từ 800000 trở lên**, thêm thể loại `"Blockbuster"` vào `genres`, **không để trùng** nếu đã có.

**Câu 8 (1đ)** Với mọi user sống ở `"Đà Nẵng"`: **tăng** `age` thêm 1 **và** đặt `updatedAt` là `ISODate("2026-10-05")`, trong **một** lệnh.

**Câu 9 (1đ)** Xoá tất cả bình luận của user có email `cuong.le@example.com` mà có `rating` **dưới 8**.

**Câu 10 (1.5đ)** Lấy 3 phim có **nhiều bình luận nhất** (`num_mflix_comments`) trong số các phim có `rated` là `"R"` hoặc `"PG-13"`. Hiển thị `title`, `rated`, `num_mflix_comments`, sắp theo số bình luận giảm dần; bằng nhau thì theo `title` A→Z.
