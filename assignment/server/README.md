# Backend quản lý mua bán sách online

Node.js, ExpressJS, MongoDB/Mongoose, JWT và Cloudinary. Mã nguồn dùng CommonJS.

## Chạy dự án

1. Cài dependencies: `npm install`.
2. Bổ sung cấu hình từ `.env.example` vào `.env` hiện có. Không ghi đè thông tin kết nối đã điền.
3. Đặt `JWT_SECRET` ngẫu nhiên ít nhất 32 ký tự. Điều chỉnh `CORS_ORIGINS`, `SHIPPING_FEE_VND`, `PORT` nếu cần.
4. Dùng MongoDB replica set hoặc Atlas để hỗ trợ transaction. URI mẫu giả định replica set `rs0` đã được cấu hình.
5. Chạy `npm run db:init` để tạo 8 collection và các unique index bắt buộc.
6. Điền `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, chạy `npm run admin:create`, rồi xóa ADMIN_PASSWORD khỏi `.env`.
7. Chạy `npm start`. API có tiền tố `/api`.

Khởi tạo DB không xóa dữ liệu. Nếu dữ liệu cũ vi phạm unique index, cần xử lý trước khi chạy lại. Script khởi tạo có thể hoàn tất một phần trước khi gặp lỗi; có thể chạy lại sau khi sửa nguyên nhân.

## Chức năng đã viết

- Đăng ký/đăng nhập JWT, phân quyền, thu hồi token khi logout, cập nhật profile và địa chỉ.
- Tra cứu sách, phân trang, lọc/sắp xếp, quản trị sách/danh mục/nhà cung cấp.
- Giỏ hàng theo tài khoản, giá tạm tính và trạng thái đáp ứng tồn kho.
- Đặt đơn COD, snapshot giá, xác nhận/giao/hoàn thành/hủy đơn, ghi nhận thu tiền.
- Phiếu nhập nháp, chỉnh sửa, xác nhận nhận hàng hoặc hủy.
- Điều chỉnh tồn kho có lý do, nhật ký nhập/bán/hoàn kho.
- Thống kê trạng thái đơn, doanh thu, sách bán chạy và cảnh báo tồn thấp.
- Upload ảnh Cloudinary từ admin, lưu secure URL và public ID.
- JSON error thống nhất, request ID, log request/thao tác admin, giới hạn body và tần suất xác thực/upload.

Chi tiết endpoint, request body, trạng thái và giả định nghiệp vụ: [API.md](API.md). Yêu cầu gốc: [CONTEXT.md](CONTEXT.md).

## Cấu trúc

- `index.js`: đọc cấu hình, kết nối DB rồi khởi động server.
- `src/app.js`: cấu hình Express và các router.
- `src/config/database.js`: kết nối MongoDB; dùng chung biến MONGO_URI với cấu hình cũ trong config/db.js.
- `src/models/`: 8 collection và schema dùng chung.
- `src/middleware/auth.js`: JWT, phân quyền, rate limit.
- `src/lib/http.js`: validation, phân trang và xử lý lỗi.
- `src/routes/`: các nhóm API.
- `src/services/commerce.js`: transaction đặt/hủy đơn, nhập hàng và điều chỉnh kho.
- `scripts/`: khởi tạo DB, tạo admin và kiểm tra Cloudinary.
- `test/api.test.js`: các kiểm thử offline.

## Kiểm tra

- `npm test`: kiểm thử offline, không mở HTTP listener, không gọi mạng hoặc kết nối MongoDB. Các thao tác DB được mô phỏng.
- `npm run cloudinary:check`: gọi Cloudinary để xác minh thông tin xác thực, cần mạng.

Đã chạy 10 kiểm thử offline thành công trong quá trình triển khai. Chưa chạy kiểm thử tích hợp các API với MongoDB/Cloudinary thực tế. Cần kiểm tra transaction rollback, đặt hàng đồng thời, unique index, upload thực và các luồng HTTP trước khi triển khai.

## Các lựa chọn và giới hạn hiện tại

- Chỉ COD; phí vận chuyển cố định theo SHIPPING_FEE_VND (mặc định 0).
- Đơn PENDING chưa tự hết hạn. Chưa có đổi trả/hoàn tiền, thanh toán online, giảm giá hoặc tích hợp vận chuyển.
- Giỏ hàng không tự xóa sau đặt đơn; frontend có thể xóa sau khi nhận kết quả thành công.
- Rate limit lưu trong bộ nhớ từng tiến trình; cần kho dùng chung khi chạy nhiều instance.
- Ảnh cũ được giữ để bảo toàn URL trong đơn cũ; cần quy trình dọn tài sản mồ côi. Chưa có API xóa ảnh vĩnh viễn.
- Validation ở Mongoose/API; không có MongoDB JSON Schema validator cho ghi trực tiếp. Không cung cấp quyền ghi DB trực tiếp cho client.
- Index unique là bắt buộc cho chống trùng; cần chạy db:init trước khi dùng API.
- Order/PurchaseReceipt cũ chưa có requestHash cần được backfill trước khi sửa trạng thái qua API mới.
