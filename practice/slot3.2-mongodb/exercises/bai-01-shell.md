# Bài 1: Shell cơ bản

**Slide:** 18–29 · **Thời gian:** 20 phút · Viết lệnh mongosh cho mỗi câu. Câu **(LT)** là lý thuyết, trả lời bằng lời.

> Giả sử vừa mở `mongosh --port 27027`, chưa gõ lệnh nào.

**1.1** Hiển thị tên database đang làm việc. Lúc vừa mở mongosh, kết quả là gì?

**1.2** Liệt kê tất cả database trên server.

**1.3** Chuyển sang database `sample_mflix`.

**1.4** Liệt kê các collection của database hiện tại. Viết **2 cách**: một lệnh helper của shell và một lệnh gọi method trên `db`.

**1.5** Đang ở `sample_mflix`, **không dùng `use`**, hãy đếm số document trong collection `books` của database `library`.

**1.6** Tạo database mới tên `shop` và trong đó có collection `products`, bằng cách chèn document `{ name: "Bút bi", price: 5000 }`. Viết đủ các lệnh cần thiết.
Sau khi chạy `use shop` mà chưa chèn gì thì `show dbs` có hiện `shop` không? Vì sao?

**1.7** Trong `shop`, tạo một collection **rỗng** tên `categories` (không chèn document nào).

**1.8** Xoá collection `categories`.

**1.9** Xoá toàn bộ database `shop`.

**1.10** Phim *Parasite* có `_id: ObjectId('5f1000000000000000000019')`. Viết lệnh lấy **thời điểm tạo** được mã hoá bên trong ObjectId đó.

**1.11 (LT)** ObjectId dài bao nhiêu byte? Theo slide 29, các phần của nó gồm những gì, mỗi phần bao nhiêu byte?

**1.12 (LT)**
- a) Ghép cặp khái niệm MongoDB với SQL: *database, collection, document, field* ↔ *database, table, row, column*.
- b) Kể tên 6 kiểu dữ liệu BSON.
- c) Muốn dừng một truy vấn đang chạy quá lâu trong mongosh thì làm gì?
