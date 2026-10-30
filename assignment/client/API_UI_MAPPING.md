# API → UI mapping

| UI | Endpoint | Mapping |
| --- | --- | --- |
| New Arrivals / Discover a Book | `GET /api/books?sort=newest` | Sách mới nhất; không phải xếp hạng bán chạy |
| Browse Books | `GET /api/books?q=&category=&page=&limit=8` | Tìm theo tên/tác giả/ISBN, thể loại, phân trang |
| Tabs thể loại | `GET /api/categories?limit=100` | `_id` làm filter, `name` làm nhãn |
| ProductItem | Book document | `_id → id`, `authors → author`, `coverImageUrl → image`, `price` là VND, `stock` điều khiển nút mua |
| Account | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | Đăng ký/đăng nhập, phục hồi phiên; Bearer token trong sessionStorage |
| Cart / Add to Cart | `GET /api/cart`, `PUT /api/cart/items/:bookId`, `DELETE /api/cart/items/:bookId` | PUT gửi số lượng tuyệt đối; tổng tiền lấy từ server |

## Chạy local

Server hiện dùng cổng 3000. Client đặt cổng 3001 qua `.env.development`; `src/setupProxy.js` proxy `/api` tới `http://localhost:3000`. Chạy `npm start` ở mỗi thư mục. Restart client khi thay đổi proxy hoặc biến môi trường.

Deploy: reverse proxy `/api` tới Express hoặc cấu hình `REACT_APP_API_URL` (bao gồm `/api`). Nếu gọi khác origin, cấu hình `CORS_ORIGINS` phía server.

## Phạm vi chưa có màn hình/API tương ứng

- Banner, logo đối tác, quotation, bài viết, download app và newsletter vẫn dùng nội dung template; chưa có endpoint tương ứng. Newsletter chưa gửi dữ liệu.
- Khối SpecialOffer được ẩn vì Book chưa có trường giảm giá/khuyến mãi.
- API orders, admin catalog, inventory, reports và upload ảnh chưa được nối vì client hiện chưa có màn hình checkout/đơn hàng/admin. Cart hiện cho phép xem, thay đổi số lượng và xóa sản phẩm.
- Categories hiện tải tối đa 100 mục theo giới hạn API; cần phân trang nếu danh mục vượt mức này.

## Trạng thái

Browse Books có loading, lỗi kèm thử lại, danh sách rỗng và phân trang. Lỗi auth/cart hiển thị trong panel hoặc thông báo trang. Sách hết hàng không thêm được; server vẫn là nguồn xác thực giá và tồn kho.
