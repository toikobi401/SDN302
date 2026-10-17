# Bài 6: Mapping Relationships

**Slide:** 45–50 · **Thời gian:** 30 phút · Database: `library` (trừ câu 6.10)

Dữ liệu có sẵn (xem thêm [README](../README.md)):
- `patrons`: `joe` (1 địa chỉ, trường `address`), `ann` (nhiều địa chỉ, mảng `addresses`)
- `publishers`: `_id` là `oreilly`, `manning`, `nxbkimdong`
- `books`: mỗi sách có `publisher_id` tham chiếu tới `publishers._id`

**6.1 (LT)**
- a) Khi nào nên dùng **embedded document**, khi nào nên dùng **reference**? Nêu 1 ví dụ cho mỗi loại.
- b) Slide 49 lưu mảng `books: [123456789, ...]` **trong publisher**; slide 50 lưu `publisher_id` **trong book**. Cách của slide 50 tránh được vấn đề gì?

**6.2** Chuyển sang database `library`, rồi thêm patron `_id: "jane"`, tên `"Jane Doe"`, có **một** địa chỉ nhúng (1-1): `street: "12 Tràng Tiền"`, `city: "Hà Nội"`, `zip: "100000"`.

**6.3** Thêm patron `_id: "bob"`, tên `"Bob Smith"`, có **hai** địa chỉ nhúng (1-n):
- `1 Lê Lợi`, `Huế`, `530000`
- `9 Nguyễn Huệ`, `Hồ Chí Minh`, `700000`

**6.4** Tìm patron có **một trong các** địa chỉ ở thành phố `"Boston"`.

**6.5** Tìm patron có địa chỉ ở `"Faketon"`, bất kể lưu dạng `address` (1 địa chỉ) hay `addresses` (mảng). Hiển thị `_id` và `name`.

**6.6** Thêm NXB `{ _id: "nxbtre", name: "NXB Trẻ", founded: 1981, location: "Hồ Chí Minh" }`, rồi thêm sách *"Cho tôi xin một vé đi tuổi thơ"* (`_id: 789012345`, tác giả `Nguyễn Nhật Ánh`, xuất bản 01/01/2008, 220 trang, tiếng `Vietnamese`) **thuộc NXB đó**, theo mô hình slide 50.

**6.7** Liệt kê sách của NXB `oreilly`, sắp theo số trang giảm dần. Hiển thị `title`, `pages`.

**6.8** Viết **một** lệnh (không chạy 2 lần riêng) để lấy thông tin **NXB** của sách `"MongoDB in Action"`.
Gợi ý: có thể lồng `findOne` vào trong điều kiện của một `findOne` khác.

**6.9** Dùng `$lookup` để "join" `books` với `publishers`, đặt kết quả vào trường `publisher`. Hiển thị `title` và `publisher.name`, ẩn `_id`.

**6.10** (database `sample_mflix`) Dùng `$lookup` lấy phim `"Parasite"` kèm **danh sách bình luận** của nó (collection `comments`, nối `movies._id` với `comments.movie_id`), đặt vào trường `comments`. Chỉ hiển thị `title`, `comments.name`, `comments.text`.

**6.11** Theo mô hình **slide 49**: gán cho NXB `oreilly` trường `books` là mảng `_id` các sách của NXB này (`123456789, 234567890, 345678901`). Sau đó viết lệnh thêm sách có `_id` `999999999` vào mảng đó.
