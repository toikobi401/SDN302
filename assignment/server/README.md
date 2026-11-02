# Backend quản lý mua bán sách online

Node.js, ExpressJS, MongoDB/Mongoose, JWT, Cloudinary và payOS. Mã nguồn dùng CommonJS.

## Chạy dự án

1. Cài dependencies: `npm install`.
2. Bổ sung cấu hình từ `.env.example` vào `.env` hiện có. Không ghi đè thông tin kết nối đã điền.
3. Đặt `JWT_SECRET` ngẫu nhiên ít nhất 32 ký tự. Điều chỉnh `CORS_ORIGINS`, `SHIPPING_FEE_VND`, `PORT` nếu cần.
4. Dùng MongoDB replica set hoặc Atlas để hỗ trợ transaction; MongoDB cài mặc định (standalone) không đặt được đơn. URI mẫu giả định replica set `rs0` đã được cấu hình. Với MongoDB trên máy: thêm `replication:` và `  replSetName: rs0` vào `mongod.cfg`, khởi động lại service, rồi chạy `mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})"` một lần.
5. Chạy `npm run db:init` để tạo 8 collection và các unique index bắt buộc.
6. Điền `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, chạy `npm run db:seed` để tạo admin, danh mục và sách mẫu, rồi xóa ADMIN_PASSWORD khỏi `.env`. Chạy lại không đổi dữ liệu đã có. Có key Cloudinary thì ảnh mẫu được tải lên Cloudinary, chưa có thì dùng ảnh trong `client/public`.
7. Điền `PAYOS_*` để bật thanh toán online. Để trống thì COD vẫn chạy, còn đặt đơn payOS trả 503. Đăng ký webhook trên my.payos.vn với URL `https://<domain>/api/payments/payos/webhook`.
8. Chạy `npm run db:import` để nhập 213 sách trong `data/books/catalog.json`. Database chỉ lưu đường dẫn và link, không lưu file.
9. Chạy `npm start`. API có tiền tố `/api`. Client chạy cổng 3001 bằng `npm start` trong `client/`.

Khởi tạo DB không xóa dữ liệu. Nếu dữ liệu cũ vi phạm unique index, cần xử lý trước khi chạy lại. Script khởi tạo có thể hoàn tất một phần trước khi gặp lỗi; có thể chạy lại sau khi sửa nguyên nhân.

## Chức năng đã viết

- Đăng ký/đăng nhập JWT, phân quyền, thu hồi token khi logout, cập nhật profile và địa chỉ.
- Tra cứu sách, phân trang, lọc/sắp xếp, quản trị sách/danh mục/nhà cung cấp.
- Giỏ hàng theo tài khoản, giá tạm tính và trạng thái đáp ứng tồn kho.
- Tạo và áp dụng mã giảm giá, giới hạn lượt dùng và thời gian.
- Bán bản in và PDF trong cùng đơn, tải PDF có kiểm tra quyền sau khi thanh toán.
- Đặt đơn COD hoặc payOS, snapshot giá, xác nhận/giao/hoàn thành/hủy đơn, ghi nhận thu tiền COD, webhook và sync payOS, tự hủy đơn quá hạn thanh toán, ghi nhận hoàn tiền.
- Phiếu nhập nháp, chỉnh sửa, xác nhận nhận hàng hoặc hủy.
- Điều chỉnh tồn kho có lý do, nhật ký nhập/bán/hoàn kho.
- Thống kê trạng thái đơn, doanh thu, sách bán chạy và cảnh báo tồn thấp.
- Cấp chữ ký để admin tải ảnh trực tiếp lên Cloudinary, kiểm tra nguồn ảnh, xóa ảnh không còn dùng.
- JSON error thống nhất, request ID, log request/thao tác admin, giới hạn body và tần suất xác thực/cấp chữ ký.

Chi tiết endpoint, request body, trạng thái và giả định nghiệp vụ: [API.md](API.md). Yêu cầu gốc: [CONTEXT.md](CONTEXT.md).

## Cấu trúc

- `index.js`: đọc cấu hình, kết nối DB, khởi động server và quét đơn hết hạn.
- `app.js`: cấu hình Express.
- `config/db.js`: kết nối MongoDB.
- `models/`: 9 collection và schema dùng chung.
- `middleware/`: `auth.js` (JWT, phân quyền, rate limit), `error.js` (xử lý lỗi).
- `lib/http.js`: validation và phân trang.
- `routes/index.js`: toàn bộ route và quyền truy cập.
- `controllers/`: xử lý request theo từng nhóm API.
- `services/`: `commerce.js` (transaction đơn, nhập hàng, kho), `payos.js` (thanh toán), `cloudinary.js` (ký, xóa ảnh).
- `scripts/`: khởi tạo DB, dữ liệu mẫu và kiểm tra Cloudinary.
- `test/api.test.js`: các kiểm thử offline.

## Kiểm tra

- `npm test`: kiểm thử offline, không mở HTTP listener, không gọi mạng hoặc kết nối MongoDB. Các thao tác DB được mô phỏng.
- `npm run cloudinary:check`: gọi Cloudinary để xác minh thông tin xác thực, cần mạng.

Đã chạy thử các luồng HTTP với MongoDB replica set thật và một server payOS giả có ký chữ ký bằng SDK, gồm đặt hàng đồng thời, webhook sai chữ ký, sync, hết hạn và hoàn tiền. Chưa chạy với tài khoản payOS và Cloudinary thật.

## Các lựa chọn và giới hạn hiện tại

- COD và payOS; hoàn tiền thực hiện thủ công ngoài hệ thống; phí vận chuyển cố định theo SHIPPING_FEE_VND (mặc định 0).
- Đơn payOS tự hủy sau 15 phút nếu chưa trả tiền; đơn COD PENDING chưa tự hết hạn. Chưa có đổi trả hoặc tích hợp vận chuyển.
- Giỏ hàng không tự xóa sau đặt đơn; frontend có thể xóa sau khi nhận kết quả thành công.
- Rate limit lưu trong bộ nhớ từng tiến trình; cần kho dùng chung khi chạy nhiều instance.
- Ảnh bị thay hoặc bỏ khỏi sách được xóa trên Cloudinary. Ảnh đã tải nhưng lưu sách thất bại vẫn nằm lại, cần dọn thủ công. Giới hạn 5 MB chỉ kiểm tra ở client.
- Validation ở Mongoose/API; không có MongoDB JSON Schema validator cho ghi trực tiếp. Không cung cấp quyền ghi DB trực tiếp cho client.
- Index unique là bắt buộc cho chống trùng; cần chạy db:init trước khi dùng API.
- Order/PurchaseReceipt cũ chưa có requestHash cần được backfill trước khi sửa trạng thái qua API mới.
