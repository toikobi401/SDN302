# Bài 4: Insert & Delete

**Slide:** 31–32, 44 · **Thời gian:** 25 phút · Database: `sample_mflix`
Làm lần lượt từ trên xuống. Làm xong (hoặc khi muốn làm lại), chạy `.\scripts\reset-db.ps1`.

## A. Insert

**4.1** Thêm phim sau vào `movies`:

| Trường | Giá trị |
|---|---|
| title | Mai |
| year | 2024 |
| rated | R |
| runtime | 131 |
| genres | Drama, Romance |
| directors | Trấn Thành |
| countries | Vietnam |
| languages | Vietnamese |
| type | movie |

**4.2** Thêm **cùng lúc** 2 user sau vào `users` bằng **một** lệnh:
- `Trương Gia Bảo`, email `bao.truong@example.com`, 20 tuổi, sống ở Hà Nội, quận Tây Hồ, sở thích: Chess, đang hoạt động.
- `Hồ Ngọc Hà`, email `ha.ho@example.com`, 23 tuổi, sống ở Huế, phường Vỹ Dạ, chưa có sở thích nào, đang hoạt động.

(Dùng đúng cấu trúc trường như các user có sẵn: `name, email, age, address{city, district}, hobbies, isActive`.)

**4.3** User `Nguyễn Văn An` (email `an.nguyen@example.com`) bình luận phim *Inception* (`_id` là `ObjectId('5f1000000000000000000008')`): chấm **9** điểm, nội dung `"Xem lại lần thứ 4 vẫn hay."`, thời gian **05/10/2026 20:00 UTC**. Thêm bình luận này vào `comments`.

**4.4** Thêm user có `_id` là chuỗi `"admin"`, tên `"Quản trị viên"`, email `admin@example.com`, đang hoạt động.

**4.5** Thêm 3 user sau bằng **một** lệnh `insertMany`:
`{ _id: "mod1", name: "Moderator 1" }`, `{ _id: "admin", name: "Admin trùng" }`, `{ _id: "mod2", name: "Moderator 2" }`.
Yêu cầu: dù document thứ 2 bị lỗi trùng `_id` thì document **thứ 3 vẫn phải được chèn**.
Nếu **không** thêm tuỳ chọn đó thì những document nào được chèn?

## B. Delete

**4.6** Xoá **một** bình luận của user có email `an.nguyen@example.com`. User này có nhiều bình luận, vậy `deleteOne` sẽ xoá cái nào?

**4.7** Xoá tất cả phim bộ (`type: "series"`).

**4.8** Xoá tất cả bình luận có `rating` **nhỏ hơn** 5.

**4.9** Xoá các user **không hoạt động** (`isActive: false`) **và** trên 40 tuổi.

**4.10** Xoá tất cả bình luận của phim *Frozen* (`_id` là `ObjectId('5f1000000000000000000021')`).

**4.11** Xoá **tất cả** document trong `comments` nhưng **giữ lại** collection. So sánh với `db.comments.drop()`.
