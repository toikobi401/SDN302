# Bối cảnh và yêu cầu backend quản lý mua bán sách online

> Bản yêu cầu ban đầu, chỉ có COD. Hiện trạng và các quyết định mới nhất nằm ở [../context.md](../context.md).

## 1. Mục đích tài liệu

Tài liệu này tổng hợp yêu cầu ban đầu, làm cơ sở thiết kế dữ liệu và API cho backend trong thư mục `server/`. Đây là đặc tả dự kiến, chưa phải mô tả chức năng đã được triển khai hoặc kiểm chứng.

## 2. Mục tiêu và công nghệ

- Xây dựng website giúp chủ cửa hàng quản lý việc mua và bán sách.
- Hiển thị danh mục sách trực quan, sinh động.
- Thực hiện đặt mua và xử lý đơn hàng trực tuyến.
- Cho phép chủ cửa hàng chỉnh sửa thông tin sách và quản lý tồn kho.
- Backend: Node.js, ExpressJS.
- Cơ sở dữ liệu: MongoDB.
- Giao tiếp với frontend qua REST API, dữ liệu JSON.

Giao diện thuộc trách nhiệm frontend. Backend cung cấp dữ liệu như ảnh bìa, mô tả, danh mục, giá bán và tình trạng còn hàng.

## 3. Giả định và phạm vi ban đầu

Tạm hiểu “mua và bán sách” gồm hai luồng:

1. Khách hàng đặt mua sách trên website.
2. Chủ cửa hàng nhập sách từ nhà cung cấp để bán.

Luồng nhập hàng được thiết kế đơn giản trong phiên bản đầu. Cách hiểu này và các lựa chọn nghiệp vụ bên dưới cần được xác nhận khi chốt phạm vi sản phẩm.

Phiên bản đầu hỗ trợ thanh toán khi nhận hàng (COD). Chưa bao gồm thanh toán online, mã giảm giá, đánh giá sách, đổi trả/hoàn tiền và tích hợp đơn vị vận chuyển.

## 4. Vai trò sử dụng

### Khách truy cập

- Xem danh sách và chi tiết sách.
- Tìm kiếm, lọc và sắp xếp sách.
- Đăng ký, đăng nhập.

### Khách hàng — CUSTOMER

- Quản lý thông tin cá nhân và địa chỉ nhận hàng.
- Quản lý giỏ hàng.
- Đặt mua sách và xem lịch sử đơn hàng của mình.
- Hủy đơn khi đơn chưa được xác nhận.

### Chủ cửa hàng — ADMIN

- Quản lý sách, danh mục và nhà cung cấp.
- Quản lý nhập hàng và tồn kho.
- Xác nhận, xử lý và cập nhật trạng thái đơn hàng.
- Xem thống kê đơn hàng và doanh thu.

## 5. Yêu cầu chức năng

### FR01 — Tài khoản và phân quyền

- Hỗ trợ đăng ký, đăng nhập, đăng xuất.
- Lưu mật khẩu dưới dạng băm.
- Xác thực bằng JWT và phân quyền CUSTOMER, ADMIN.
- Khách hàng chỉ được truy cập giỏ hàng, địa chỉ và đơn hàng của mình.
- API quản trị phải kiểm tra quyền ADMIN.

### FR02 — Danh mục và tra cứu sách

- Danh sách sách có phân trang.
- Tìm kiếm theo tên sách, tác giả hoặc ISBN.
- Lọc theo danh mục, khoảng giá và tình trạng còn hàng.
- Sắp xếp theo giá, tên hoặc thời gian thêm.
- Chi tiết sách gồm tên, tác giả, nhà xuất bản, ISBN, mô tả, ảnh bìa, giá bán và tồn kho.

### FR03 — Quản lý sách

- Admin thêm, sửa và ngừng bán sách.
- Admin quản lý danh mục sách.
- Sách đã xuất hiện trong giao dịch phải giữ được lịch sử; sử dụng trạng thái ngừng bán thay cho xóa vĩnh viễn.
- Điều chỉnh tồn kho phải có lý do và lịch sử thay đổi.

### FR04 — Giỏ hàng

- Thêm sách, xóa sách và thay đổi số lượng.
- Hiển thị tổng tiền tạm tính.
- Thêm sách vào giỏ chưa giữ hàng.
- Khi đặt hàng, kiểm tra lại giá và khả năng đáp ứng tồn kho.

### FR05 — Đặt hàng

- Khách hàng cung cấp người nhận, số điện thoại, địa chỉ và ghi chú.
- Backend tính tiền hàng, phí vận chuyển và tổng thanh toán từ dữ liệu hợp lệ.
- Lưu thông tin sách và giá tại thời điểm đặt hàng để việc chỉnh sửa sách sau này không thay đổi đơn cũ.
- Hỗ trợ COD trong phiên bản đầu.
- Khách hàng xem danh sách, chi tiết và trạng thái đơn hàng của mình.

### FR06 — Xử lý đơn hàng

Luồng trạng thái chính:

`PENDING → CONFIRMED → SHIPPING → COMPLETED`

- Khách hàng được hủy đơn PENDING.
- Admin được hủy đơn PENDING hoặc CONFIRMED, kèm lý do.
- Đơn bị hủy chuyển sang CANCELLED.
- Lưu lịch sử cập nhật trạng thái.
- Trạng thái thanh toán được quản lý riêng với trạng thái giao hàng.
- Không cho phép chuyển trạng thái ngoài luồng đã quy định.

### FR07 — Nhập hàng

- Admin quản lý nhà cung cấp.
- Lập phiếu nhập gồm sách, số lượng và giá nhập.
- Phiếu nháp chưa làm tăng tồn kho.
- Xác nhận đã nhận hàng làm tăng tồn kho đúng một lần.
- Phiếu đã xác nhận không được sửa trực tiếp; sai lệch được xử lý bằng nghiệp vụ điều chỉnh có lưu lịch sử.

### FR08 — Thống kê

- Thống kê số đơn theo trạng thái và khoảng thời gian.
- Thống kê doanh thu từ đơn hoàn thành, đã thanh toán.
- Liệt kê sách bán chạy và sách sắp hết hàng.

## 6. Quy tắc nghiệp vụ và tính nhất quán

- Giá và số lượng phải hợp lệ; tồn kho không được âm.
- Khi tạo đơn thành công, giữ hàng bằng cách trừ số lượng khả dụng.
- Hủy đơn phải hoàn lại số lượng khả dụng đúng một lần.
- Nhiều khách đặt cùng một sách không được gây bán vượt tồn kho.
- Tạo đơn và cập nhật tồn kho phải nhất quán; MongoDB cần cấu hình hỗ trợ transaction cho các thao tác liên quan.
- Yêu cầu tạo đơn hoặc xác nhận nhập hàng gửi lặp lại không được tạo giao dịch trùng.
- Tiền VND được lưu bằng số nguyên.
- Thay đổi thông tin hoặc giá sách không làm thay đổi dữ liệu đã chốt trong đơn hàng.

## 7. Dữ liệu chính dự kiến

- `users`: tài khoản, vai trò và địa chỉ.
- `books`: thông tin sách, giá, tồn kho và trạng thái bán.
- `categories`: danh mục sách.
- `carts`: giỏ hàng theo khách hàng.
- `orders`: người nhận, các dòng sách, tổng tiền, trạng thái và lịch sử cập nhật.
- `suppliers`: nhà cung cấp.
- `purchaseReceipts`: phiếu nhập sách.
- `inventoryMovements`: lịch sử nhập, bán, hoàn kho do hủy đơn và điều chỉnh kho.

Danh sách này là định hướng ban đầu; schema chi tiết và quan hệ dữ liệu sẽ được thiết kế ở bước tiếp theo.

## 8. Yêu cầu kỹ thuật

- API REST, dữ liệu JSON.
- Kiểm tra dữ liệu đầu vào và trả lỗi theo cấu trúc thống nhất.
- Xác thực JWT và kiểm tra quyền tại các API cần bảo vệ.
- Phân trang và tạo index cho các truy vấn thường dùng.
- Lưu thông tin bí mật trong biến môi trường.
- Có log lỗi, log thao tác quản trị và tài liệu API.
- Giới hạn tần suất đăng nhập và kích thước dữ liệu gửi lên.

## 9. Tiêu chí nghiệm thu phiên bản đầu

- Khách có thể tìm sách, thêm vào giỏ, đặt đơn COD và theo dõi đơn.
- Admin có thể quản lý sách, nhập hàng và xử lý đơn.
- Thay đổi giá sách không làm thay đổi giá trong đơn đã tạo.
- Đặt hàng đồng thời không làm tồn kho âm.
- Hủy đơn hoàn kho đúng một lần.
- Xác nhận phiếu nhập lặp lại không tăng tồn kho nhiều lần.
- Khách hàng không truy cập được dữ liệu riêng của người khác hoặc API quản trị.

Các tiêu chí trên là yêu cầu nghiệm thu, chưa phải kết quả kiểm thử.

## 10. Các điểm cần chốt trước khi triển khai

- Xác nhận phạm vi nhập hàng từ nhà cung cấp.
- Công thức phí vận chuyển và khu vực giao hàng.
- Danh sách trạng thái thanh toán và quy trình ghi nhận thu tiền COD.
- Thời hạn xử lý hoặc tự hủy đơn PENDING đang giữ hàng.
- Ngưỡng cảnh báo sách sắp hết hàng.
- Cách lưu và tải lên ảnh bìa sách.
- Quy tắc ISBN bắt buộc hoặc tùy chọn và cách quản lý các phiên bản sách.
- Cơ chế thu hồi phiên khi đăng xuất và thời hạn JWT.

## 11. Bước tiếp theo

1. Chốt các quyết định nghiệp vụ còn mở.
2. Thiết kế schema MongoDB và index.
3. Thiết kế danh sách API, request/response và mã lỗi.
4. Xây dựng cấu trúc backend trong `server/` và triển khai theo phạm vi đã chốt.
