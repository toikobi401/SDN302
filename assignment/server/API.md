# Bookstore REST API

Base URL: `/api`. Body và response là JSON; trừ upload ảnh, body thông thường nên nhỏ. Request tối đa 8 MiB. Các ID là MongoDB ObjectId. Tiền tính bằng số nguyên VND.

## Cấu hình và khởi động

1. Cài dependencies bằng `npm install` nếu chưa cài.
2. Bổ sung các biến trong `.env.example` vào `.env` hiện tại; giữ nguyên thông tin MongoDB và Cloudinary đã điền.
3. Đặt `JWT_SECRET` là chuỗi ngẫu nhiên ít nhất 32 ký tự, không dùng giá trị mẫu. Có thể sinh bằng `node -p "require('node:crypto').randomBytes(48).toString('hex')"`.
4. MongoDB phải là replica set hoặc Atlas để hỗ trợ transaction. Chạy `npm run db:init` trước khi sử dụng để tạo collection và unique index.
5. Tạo admin: điền `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `.env`, chạy `npm run admin:create`, rồi xóa `ADMIN_PASSWORD` khỏi `.env`. Không tự nâng quyền tài khoản đã tồn tại.
6. Chạy `npm start`. Server chỉ lắng nghe sau khi kết nối MongoDB thành công.

`SHIPPING_FEE_VND` là phí vận chuyển cố định, mặc định 0. Chưa có tính phí theo khu vực. Đơn PENDING giữ hàng đến khi được xử lý/hủy; chưa có tự hết hạn. Đây là lựa chọn tạm cho những điểm còn mở trong CONTEXT.md.

## Quy ước

- Response chi tiết: `{ "data": ... }`.
- Danh sách: `{ "data": [], "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 } }`.
- Lỗi: `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
- Phân trang: `page` từ 1, `limit` từ 1 đến 100, mặc định 20.
- API cần đăng nhập sử dụng `Authorization: Bearer <token>`.
- Các đường dẫn `/admin/...` yêu cầu vai trò ADMIN.
- POST tạo đơn, tạo phiếu nhập, điều chỉnh kho cần header `Idempotency-Key` dài tối đa 128 ký tự. Gửi lại cùng khóa và nội dung trả lại giao dịch hiện có; nội dung khác trả 409. Giữ nguyên khóa khi retry do mất kết nối.
- Lọc thời gian dùng `from`, `to` là ISO timestamp có múi giờ, hai đầu bao gồm. Với ngày kết thúc, truyền thời điểm cuối ngày cần thống kê.
- DELETE sách/danh mục/nhà cung cấp là ngừng bán hoặc ngừng hoạt động, không xóa lịch sử.

## Tài khoản

- `POST /auth/register`: `{ "name": "Nguyen Van A", "email": "a@example.com", "password": "a-strong-password" }`. Chỉ tạo CUSTOMER; mật khẩu ít nhất 8 ký tự, tối đa 72 byte UTF-8.
- `POST /auth/login`: `{ "email": "a@example.com", "password": "a-strong-password" }`. Trả token và user, không trả passwordHash.
- `POST /auth/logout`: thu hồi tất cả token hiện có của tài khoản.
- `GET /auth/me`: thông tin người dùng hiện tại.
- `PATCH /auth/me`: cho phép `name`, `phone`, `addresses`. Không cho thay role, email hoặc mật khẩu qua API này.

Địa chỉ trong profile:

```json
{
  "addresses": [{
    "label": "Nhà riêng",
    "address": {
      "recipientName": "Nguyen Van A",
      "phone": "0900000000",
      "addressLine": "123 Nguyen Trai",
      "ward": "Phường ...",
      "province": "TP. Hồ Chí Minh"
    }
  }]
}
```

PATCH addresses thay thế toàn bộ danh sách, tối đa 20 địa chỉ. JWT hết hạn mặc định sau 1 ngày. Rate limit đăng nhập/đăng ký: tổng 15 lần/15 phút/IP trong mỗi tiến trình; cần giải pháp dùng chung khi chạy nhiều instance. Chưa tự tin cậy header proxy; cần cấu hình trust proxy theo môi trường triển khai thực tế.

## Sách và danh mục công khai

- `GET /books`: chỉ sách ACTIVE. Query: `q` (tên/tác giả/ISBN), `category`, `minPrice`, `maxPrice`, `inStock=true|false`, `sort=newest|price_asc|price_desc|title`, `page`, `limit`.
- `GET /books/:id`: chi tiết sách đang bán.
- `GET /categories`: danh mục đang hoạt động.
- `GET /categories/:id`: chi tiết danh mục đang hoạt động.

Tìm kiếm dùng chuỗi regex được escape, không phân biệt hoa thường; chưa có tìm kiếm bỏ dấu hoặc xếp hạng độ liên quan. Text index được chuẩn bị cho việc tối ưu sau này.

## Quản trị sách, danh mục và nhà cung cấp

- `GET /admin/books`: danh sách mọi sách, các query như công khai và thêm `status=ACTIVE|DISCONTINUED`.
- `GET /admin/books/:id`.
- `POST /admin/books`.
- `PATCH /admin/books/:id`.
- `DELETE /admin/books/:id`: ngừng bán.

Ví dụ tạo sách:

```json
{
  "title": "Lập trình Node.js",
  "slug": "lap-trinh-nodejs",
  "authors": ["Nguyen Van A"],
  "publisher": "NXB ...",
  "description": "Giới thiệu sách",
  "categories": ["<categoryId>"],
  "price": 150000,
  "lowStockThreshold": 5
}
```

ISBN tùy chọn và duy nhất nếu có; hiện kiểm tra định dạng ISBN-10/13, chưa kiểm tra checksum. `stock` luôn bắt đầu từ 0; API tạo/sửa sách từ chối sửa trực tiếp stock. Nhập hàng hoặc điều chỉnh kho để cập nhật.

Danh mục và nhà cung cấp đều hỗ trợ `GET /admin/<resource>`, `GET /admin/<resource>/:id`, `POST`, `PATCH /:id`, `DELETE /:id`, với resource là `categories` hoặc `suppliers`.

- Category: `name`, `slug` duy nhất, `description`, `imageUrl`, `isActive`.
- Supplier: `code` duy nhất, `name`, `contactName`, `email`, `phone`, `address`, `note`, `isActive`.

Có thể dùng PATCH để kích hoạt lại. Sách được giữ lại khi danh mục bị ngừng hoạt động; không cho gán mới danh mục đang ngừng hoạt động.

## Upload ảnh Cloudinary

- `POST /admin/books/:id/images`: `{ "image": "data:image/png;base64,...", "kind": "cover" }`. `kind` là `cover` hoặc `gallery`.
- `POST /admin/categories/:id/image`: `{ "image": "data:image/jpeg;base64,..." }`.

Chấp nhận JPEG, PNG, WebP tối đa 5 MiB/file; tối đa 20 ảnh gallery. Backend kiểm tra MIME/signature, upload Cloudinary rồi lưu secure URL và public ID vào document tương ứng. Frontend gửi data URI, không gửi đường dẫn file máy cá nhân.

Ảnh sách: `coverImageUrl`, `coverImagePublicId`, `imageUrls`, `imagePublicIds`; ảnh danh mục: `imageUrl`, `imagePublicId`. Các public ID gallery theo dõi tài sản do endpoint upload tạo; ảnh URL bên ngoài có thể không có public ID tương ứng.

Ảnh cũ được giữ trên Cloudinary khi thay bìa để URL trong đơn cũ tiếp tục hoạt động. Nếu lưu database thất bại sau upload, backend cố xóa ảnh vừa upload và log nếu dọn dẹp thất bại. MongoDB và Cloudinary không có transaction chung; cần quy trình dọn tài sản mồ côi khi vận hành. Chưa cung cấp API xóa ảnh vĩnh viễn.

## Giỏ hàng — cần đăng nhập

- `GET /cart`: các dòng sách, khả năng đáp ứng và tổng tạm tính.
- `PUT /cart/items/:bookId`: `{ "quantity": 2 }`, thêm mới hoặc đặt số lượng chính xác.
- `DELETE /cart/items/:bookId`: xóa dòng.
- `DELETE /cart`: xóa toàn bộ giỏ.

Giỏ không giữ hàng và không chốt giá, tối đa 100 sách khác nhau. Khi đặt đơn, frontend gửi danh sách book/quantity; giỏ không tự xóa để tránh xóa nhầm thay đổi đồng thời của người dùng. Có thể xóa giỏ bằng API sau khi đặt hàng thành công.

## Đơn hàng — cần đăng nhập

- `POST /orders`, có `Idempotency-Key`.
- `GET /orders`: chỉ đơn của mình, lọc `status`, `from`, `to`, phân trang.
- `GET /orders/:id`: chỉ đơn của mình.
- `POST /orders/:id/cancel`: `{ "reason": "Đặt nhầm sách" }`, chỉ khi PENDING.

Ví dụ đặt hàng:

```json
{
  "items": [{ "book": "<bookId>", "quantity": 2 }],
  "shippingAddress": {
    "recipientName": "Nguyen Van A",
    "phone": "0900000000",
    "addressLine": "123 Nguyen Trai",
    "province": "TP. Hồ Chí Minh"
  },
  "paymentMethod": "COD",
  "note": "Giao giờ hành chính"
}
```

Backend lấy giá/thông tin sách từ DB, tự tính subtotal/shippingFee/total. Không dùng giá và tổng tiền client gửi. Tạo đơn, trừ tồn khả dụng và ghi movement SALE trong cùng transaction. Hủy đơn hoàn tồn và ghi CANCELLATION trong cùng transaction; không trừ lần nữa khi giao hàng.

## Quản trị đơn hàng và thanh toán

- `GET /admin/orders`, `GET /admin/orders/:id`.
- `PATCH /admin/orders/:id/status`: `{ "status": "CONFIRMED" }`.
- `POST /admin/orders/:id/payment`: xác nhận đã thu tiền COD, chỉ khi SHIPPING hoặc COMPLETED. Gửi lại không thu/ghi nhận thêm.

Luồng: PENDING → CONFIRMED → SHIPPING → COMPLETED. Admin hủy PENDING/CONFIRMED bằng `{ "status": "CANCELLED", "reason": "..." }`. Không cho hủy đơn đã thu tiền vì chưa có nghiệp vụ hoàn tiền. Trạng thái thanh toán độc lập, COMPLETED có thể UNPAID cho đến khi admin xác nhận thu tiền. Mỗi thay đổi lưu người thực hiện và thời gian.

## Nhập hàng

- `GET /admin/purchase-receipts`, lọc status/from/to và phân trang.
- `GET /admin/purchase-receipts/:id`.
- `POST /admin/purchase-receipts`, có `Idempotency-Key`.
- `PATCH /admin/purchase-receipts/:id`: sửa `supplier`, `items`, `note` chỉ ở DRAFT.
- `PATCH /admin/purchase-receipts/:id/status`: `{ "status": "RECEIVED" }` hoặc `CANCELLED`.

```json
{
  "supplier": "<supplierId>",
  "items": [{ "book": "<bookId>", "quantity": 10, "unitCost": 90000 }],
  "note": "Nhập sách đợt 1"
}
```

Nhận hàng tăng tồn và ghi movement PURCHASE trong cùng transaction; gọi xác nhận lại không tăng thêm. Không sửa/hủy phiếu RECEIVED, phải tạo điều chỉnh tồn kèm lý do. Khóa idempotency của POST ghi nhớ nội dung tạo ban đầu, ngay cả sau khi phiếu được chỉnh sửa.

## Kho và thống kê

- `POST /admin/books/:id/stock-adjustments`, có `Idempotency-Key`: `{ "quantityChange": -2, "reason": "Sách hỏng" }`. Số nguyên khác 0; không cho tồn âm hoặc vượt giới hạn số nguyên an toàn.
- `GET /admin/inventory-movements`: lọc `book`, `type=PURCHASE|SALE|CANCELLATION|ADJUSTMENT`, `from`, `to`, phân trang.
- `GET /admin/reports/summary`: số đơn theo trạng thái dựa trên createdAt; doanh thu đơn COMPLETED + PAID dựa trên completedAt. Trả tiền sách, phí vận chuyển và tổng thu riêng.
- `GET /admin/reports/best-sellers`: số lượng và doanh thu sách của đơn COMPLETED + PAID, lọc theo completedAt, phân trang.
- `GET /admin/reports/low-stock`: sách ACTIVE có stock <= lowStockThreshold, phân trang.
- `GET /health`: tiến trình HTTP hoạt động; không phải phép kiểm tra kết nối DB liên tục.

## Giới hạn kiểm chứng và vận hành

Các kiểm tra offline không thay thế kiểm thử tích hợp với MongoDB replica set và Cloudinary. Cần kiểm tra thực tế tạo đơn đồng thời, retry, rollback, quyền sở hữu, tải ảnh, log và thống kê trước triển khai. Không có network call nào được chạy trong bước kiểm tra offline.

Index unique là bắt buộc cho idempotency và email/slug/ISBN. Không ghi trực tiếp từ client vào MongoDB; model ref không phải khóa ngoại. API giới hạn trường được ghi và dùng transaction cho nghiệp vụ nhiều document. Dữ liệu cũ của Order/PurchaseReceipt cần bổ sung requestHash trước khi sử dụng các API sửa trạng thái nếu được tạo trước phiên bản này.
