# Booksaw — UI Rules & Design Language

## 1. Phạm vi và nguồn tham chiếu

Tài liệu này là chuẩn thiết kế UI cho React client của dự án cửa hàng sách. Thiết kế kế thừa Booksaw HTML template trong `client/template` và các component đã chuyển sang React trong `client/src/components`.

- Tham chiếu bố cục: `template/index.html`.
- Tham chiếu token và style gốc: `template/style.css`.
- CSS đang được ứng dụng sử dụng: `public/style.css`, `public/css`, `public/icomoon`; override React nằm trong `src/App.css` và `src/index.css`.
- Dữ liệu giao diện tạm: `src/data/placeholders.js`.
- Các mục “quy tắc” dưới đây là hướng dẫn cho thiết kế tiếp theo; không có nghĩa mọi trạng thái đã được triển khai.

## 2. Design language

**Tinh thần:** hiệu sách mang phong cách biên tập, cổ điển nhẹ, ấm và thoáng. Ảnh bìa sách là điểm nhấn; typography serif tạo cá tính, sans-serif giữ nội dung dễ đọc.

- Dùng nền màu giấy, chữ tối và màu nâu be làm accent.
- Ưu tiên khoảng trắng, bố cục theo hàng/cột, tiêu đề rõ và đường phân cách mảnh.
- Nút, input và khối nội dung thiên về góc vuông. Hạn chế bóng đổ, gradient, màu bão hòa và card bo tròn lớn.
- Pattern lá và họa tiết góc chỉ dùng cho section nổi bật như Best Selling và Download App; tránh lặp ở mọi khối.
- Ngôn ngữ nội dung hiện tại là tiếng Anh. Nếu chuyển sang tiếng Việt, chuyển nhất quán cả nhãn, thông báo và định dạng tiền.

## 3. Design tokens

### Màu sắc kế thừa template

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| `--accent-color` | `#C5A992` | Điểm nhấn, viền/nút, trạng thái tương tác |
| `--secondary-color` | `#C5A992` | Màu phụ hiện dùng cùng accent |
| `--light-color` | `#F3F2EC` | Nền giấy chính |
| `--dark-color` | `#2F2F2F` | Màu tối chủ đạo |
| `--dark-text-color` | `#2F2F2F` | Tiêu đề/chữ nhấn |
| `--body-text-color` | `#757575` | Nội dung phụ |
| `--light-text-color` | `#AFAFAF` | Chữ ít nổi bật, không dùng cho nội dung quan trọng nếu thiếu tương phản |
| `--bs-body-color` | `#333333` | Nội dung theo Bootstrap |

Quy tắc: ưu tiên biến CSS hiện có; không tạo mã màu riêng cho từng component. Accent sáng cần được kiểm tra tương phản khi dùng cho chữ nhỏ. Trạng thái lỗi/thành công cần màu ngữ nghĩa riêng và luôn kèm chữ hoặc icon.

### Typography

| Vai trò | Font khai báo | Quy tắc |
| --- | --- | --- |
| Heading | Prata, Georgia, serif | Tiêu đề trang, section, tên sách; weight 400 |
| Body | Raleway, sans-serif | Đoạn văn, menu, nhãn, form |
| Secondary | Playfair Display, Georgia, serif | Chỉ dùng khi phù hợp với style phụ của template |
| Body Bootstrap | 0.9rem, weight 400, line-height 1.7 | Mốc nội dung mặc định |
| Heading display | line-height 1.1 | Dùng cho tiêu đề lớn, tránh cắt chữ |

Prata và Raleway được nạp từ Google Fonts trong `public/index.html` và có đủ dấu tiếng Việt. Body dùng `lining-nums` để số 0 của Raleway không giống chữ o. Mỗi trang có một `h1`; section dùng `h2`, tên sản phẩm dùng `h3`.

### Layout và spacing

- Kế thừa Bootstrap 5.3.1 và hệ lưới 12 cột đang có trong template.
- `.container-fluid` có `max-width: 1800px`; gutter container hiện là `2.5rem`.
- Giữ `container → row → col-*` cho nội dung theo lưới; tránh đặt chiều rộng cố định khiến màn hình nhỏ tràn ngang.
- Các section danh sách dùng khoảng cách rộng như `py-5 my-5`; dùng cùng nhịp cho section tương đương.
- Quy ước bổ sung cho khoảng cách nhỏ: dùng thang 4, 8, 12, 16, 24, 32, 48, 64px thay vì giá trị tùy ý.
- Chiều cao header token: 160px, thu gọn 80px; dưới 600px token header là 100px. Đây là token gốc, không phải chiều cao bắt buộc cho mọi nội dung.

## 4. Mapping UI sang React

| Khu vực template | Component / nguồn React | Quy tắc thiết kế |
| --- | --- | --- |
| `#header-wrap`, `#header` | `Navbar.js` | Logo trái, menu phải; utility bar cho account/cart/search; mobile có hamburger |
| `#billboard` | `Billboard.js` | Nội dung và ảnh bìa chia hai vùng; previous/next và dots đồng bộ slide |
| `#client-holder` | `ClientHolder` trong `HomeSections.js` | Hàng logo đối tác, giữ tỉ lệ và khoảng thở |
| `#featured-books` | `FeaturedBooks` | Eyebrow + heading giữa, lưới sách và link xem tất cả |
| Sản phẩm trong các danh sách | `BookCard.js` | Ảnh → tên sách → tác giả → giá; cùng cấu trúc ở mọi danh sách |
| `#best-selling` | `BestSelling` | Ảnh lớn cạnh thông tin và CTA; nền pattern nhẹ |
| `#popular-books` | `PopularBooks` | Tabs thể loại nằm trên lưới; tab active phải dễ nhận biết |
| `#quotation` | `Quotation` | Quote giữa trang và tên tác giả, chiều rộng đọc vừa phải |
| `#special-offer` | `SpecialOffer` | Dùng BookCard; giá cũ gạch ngang, giá mới nổi bật |
| `#subscribe` | `Subscribe` | Tiêu đề và mô tả/form hai cột trên desktop |
| `#latest-blog` | `LatestBlog` | Ảnh, ngày, tiêu đề, category; ba bài mỗi hàng desktop |
| `#download-app` | `DownloadApp` | Ảnh thiết bị cạnh nội dung và badge cửa hàng ứng dụng |
| `#footer`, `#footer-bottom` | `Footer.js` | Nhóm liên kết rõ, logo/mô tả, social và credit template |
| Toàn trang | `App.js` | Ghép component theo thứ tự template, nội dung chính trong `main` |

## 5. Quy tắc component và tương tác

### Product card

- Dùng `BookCard` chung thay vì viết lại card cho từng section.
- Giữ ảnh đúng tỉ lệ, không kéo méo; khung ảnh nhất quán trong cùng danh sách.
- Tên sách dài được xuống dòng; không che giá hoặc tác giả.
- CTA Add to Cart phải dùng được bằng bàn phím và trên cảm ứng; không chỉ xuất hiện khi hover.
- Giá cũ phải lớn hơn giá bán khi thể hiện giảm giá. Dữ liệu placeholder hiện cần được rà soát trước khi dùng làm dữ liệu thật.

### Buttons và links

- Nút thực hiện hành động; link chuyển trang hoặc đến section.
- CTA theo style outline/góc vuông, chữ rõ, có thể kèm icon mũi tên Icomoon.
- Icon-only button cần accessible name. Active, hover, focus và disabled phải phân biệt được.
- Không dùng link hash tới vị trí không tồn tại cho tính năng hoàn chỉnh. Tính năng đang chờ API cần thông báo tạm hoặc trạng thái disabled có giải thích.

### Forms, search và tabs

- Input có label hoặc accessible name; placeholder chỉ là gợi ý.
- Email dùng `type="email"`; kiểm tra dữ liệu và hiển thị lỗi sát trường nhập.
- Tabs dùng button, hỗ trợ bàn phím và biểu thị tab đang chọn; giữ danh sách khớp thể loại.
- Search đóng/mở không làm vỡ header; khi mở nên focus vào ô tìm kiếm.
- Submit placeholder không được báo thành công như đã gửi dữ liệu lên server.

### Motion

- Template dùng transition link 0.3s ease-out; giữ chuyển động nhẹ và nhất quán.
- Tôn trọng `prefers-reduced-motion`; tránh tự động chuyển slide quá nhanh.

## 6. Responsive và accessibility

- Desktop: featured/popular ưu tiên 4 sách/hàng; blog 3 bài/hàng.
- Quy ước cho màn hình nhỏ: giảm lưới sách còn 2 rồi 1 cột tùy chiều rộng đọc; các section ảnh cạnh chữ xếp dọc.
- Menu mobile phải mở/đóng rõ ràng, khai báo `aria-expanded`, không che nội dung không thể cuộn tới.
- Tabs có thể wrap hoặc cuộn ngang; không làm tràn toàn trang.
- Kiểm tra từ 320px đến desktop; không dùng `overflow: hidden` để che lỗi layout.
- Ảnh nội dung có alt mô tả; họa tiết trang trí dùng alt rỗng hoặc CSS background.
- Giữ focus ring nhìn thấy; vùng bấm nên đạt ít nhất 44 × 44px.
- Nội dung chữ thường cần tương phản tối thiểu 4.5:1; chữ lớn tối thiểu 3:1.

## 7. Placeholder và chuẩn bị tích hợp API

- Dữ liệu sách, banner, thể loại và bài viết lấy từ `src/data/placeholders.js`; giữ props component rõ ràng để thay nguồn dữ liệu sau này.
- Không gọi API trực tiếp trong component chỉ có nhiệm vụ trình bày card.
- Chuẩn bị trạng thái loading, empty và error khi nối API: giữ kích thước khối khi loading; empty có lời giải thích; error có hành động thử lại khi phù hợp.
- Cart/account/newsletter hiện là khu vực UI chờ tích hợp; mọi phản hồi phải phản ánh đúng việc dữ liệu đã được lưu hay chưa.
- Format giá qua helper chung `money`; đổi helper khi chốt tiền tệ và locale.

## 8. Checklist khi thêm màn hình

- [ ] Dùng palette, typography, lưới và nhịp spacing thống nhất với Booksaw.
- [ ] Tái sử dụng Navbar, Footer và BookCard khi phù hợp.
- [ ] Có hierarchy tiêu đề, CTA chính rõ và nội dung không bị cắt.
- [ ] Responsive, thao tác bàn phím và focus hoạt động.
- [ ] Không có ảnh lỗi, link chết hoặc nút im lặng gây hiểu nhầm.
- [ ] Trạng thái placeholder/API được thể hiện đúng.
- [ ] Giữ credit TemplatesJungle theo điều kiện của template trong `template/readme.txt`.
