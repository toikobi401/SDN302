# Context bài thuyết trình NestJS – SDN302

Tài liệu tổng hợp nội dung, cấu trúc và demo của bài thuyết trình về NestJS (môn SDN302), nhóm 5 người.

## Thông tin chung

- **Chủ đề:** NestJS – framework backend cho Node.js
- **Số người trình bày:** 5, mỗi người một phần
- **Phiên bản dùng trong demo:** NestJS v12 (`@nestjs/core` 12.x), Node.js 24, npm 11
- **Kiến thức nền của lớp:** Node.js, HTTP module, Express, MongoDB/Mongoose, MVC, EJS/Handlebars, Passport/JWT. Slide môn học (`material/`) không có nội dung về NestJS.

## Cấu trúc bài thuyết trình

### Phần 1: NestJS là gì? Ai tạo ra? Vì sao nó tồn tại?
- **Định nghĩa:**
  - Framework Node.js để xây dựng ứng dụng server-side
  - Viết bằng TypeScript, chạy trên nền Express (mặc định) hoặc Fastify
  - Mã nguồn mở, giấy phép MIT
- **Cha đẻ:** Kamil Myśliwiec (Ba Lan), đồng sáng lập Trilon
- **Lịch sử:**
  - Node.js (2009)
  - Express (2010): gọn nhẹ nhưng không quy định kiến trúc
  - Angular phổ biến kiến trúc Module/DI/Decorator ở frontend
  - NestJS ra mắt năm 2017 (`@nestjs/core` publish lần đầu ngày 14/05/2017)
  - Phiên bản hiện tại: v12
- **Lý do tồn tại:**
  - Hệ sinh thái Node.js thiếu một kiến trúc chung
  - Mỗi project Express tổ chức một kiểu, nên khó bảo trì khi project lớn và khi làm theo nhóm
  - Nhu cầu dùng TypeScript ngay từ đầu
  - Doanh nghiệp quen với Spring/Angular muốn có trải nghiệm tương tự trên Node.js

### Phần 2: Các đặc trưng của NestJS + demo khởi tạo
- **Các đặc trưng:**
  1. Kiến trúc module hóa (`@Module`: `imports`, `controllers`, `providers`, `exports`)
  2. Controller để định tuyến (`@Controller`, `@Get`, `@Post`…, `@Param`, `@Query`, `@Body`)
  3. Provider/Service chứa logic (`@Injectable`, mặc định là singleton)
  4. Dependency Injection có sẵn (inject qua constructor)
  5. Dùng decorator để khai báo (cho class, method, tham số, property)
  6. TypeScript là mặc định (v12 dùng ESM, nên import phải có đuôi `.js`)
  7. Pipe, Guard, Interceptor, Exception Filter
     - Thứ tự chạy: Middleware → Guard → Interceptor → Pipe → Controller → Interceptor → Exception Filter
  8. Nest CLI sinh code (`nest new`, `nest g module|controller|service|resource`)
  9. Tích hợp sẵn testing (`Test.createTestingModule`, dễ mock nhờ DI)
  10. Hỗ trợ REST, GraphQL, WebSocket, Microservices
- **Demo:** khởi tạo project và tạo endpoint `GET /health`. Xem [Demo phần 2](#demo-phần-2-my-app).

### Phần 3: So sánh chi tiết Node.js thuần và NestJS
- **Bản chất:** Node.js là runtime, làm server bằng module `http`. NestJS là framework xây dựng trên Node.js.
- **Các tiêu chí so sánh:**
  - Khởi tạo server
  - Routing
  - Params/query
  - Đọc body
  - Validation
  - Xử lý lỗi
  - Response
  - Tổ chức code
  - Dependency Injection
  - TypeScript
  - Testing
  - Hiệu năng
  - Phụ thuộc
  - Trường hợp phù hợp
- **Kết luận:**
  - Node.js thuần nhẹ nhất nhưng việc gì cũng phải tự làm
  - NestJS có nhiều lớp trừu tượng hơn nhưng có cấu trúc sẵn, dễ mở rộng

### Phần 4: So sánh NestJS và Express
- **Quan hệ:** NestJS mặc định chạy trên Express (`@nestjs/platform-express`). Nest là lớp kiến trúc phủ lên trên Express.
- **Các tiêu chí so sánh:**
  - Triết lý: unopinionated so với opinionated
  - Kiến trúc
  - Ngôn ngữ
  - Routing
  - Middleware: Nest chia thành Middleware, Guard, Pipe, Interceptor, Filter
  - Validation
  - Xử lý lỗi
  - Dependency Injection
  - CLI
  - Testing
  - Hiệu năng: có thể chuyển sang Fastify
  - Độ khó học
- **Tương thích:** NestJS vẫn dùng được middleware Express (`cors`, `helmet`, `morgan`) và vẫn truy cập được `@Req()`/`@Res()`.
- **Khi nào chọn:**
  - Express: prototype, API nhỏ
  - NestJS: dự án lớn, làm việc nhóm, cần bảo trì lâu dài

### Phần 5: Demo phần khác biệt (code mẫu so sánh)
- **Bài toán chung:** cùng một API `users` viết bằng 3 cách: Node.js thuần, Express, NestJS
  - `POST /users`: bắt buộc có `name` dạng chuỗi, sai thì trả 400
  - `GET /users/:id`: không tìm thấy thì trả 404
- **Demo:** xem [Demo phần 5](#demo-phần-5-compare-demo)
- **Tổng kết:**
  - Ưu điểm và nhược điểm của NestJS
  - Khi nào nên dùng
  - Q&A

## Demo

### Demo phần 2: `my-app/`
- **Project:** tạo bằng `nest new my-app`, có thêm module `health`
- **Các file:**
  - `src/health/health.module.ts`
  - `src/health/health.controller.ts`
  - `src/health/health.service.ts`
- **Cách chạy:** `cd my-app && npm install && npm run start:dev`
- **Kết quả:** `GET http://localhost:3000/health` trả về `{ "status": "ok", "uptime": ..., "timestamp": "..." }`
- **Hướng dẫn chi tiết:** [README.md](README.md)

### Demo phần 5: `compare-demo/`

| Thư mục | Công nghệ | Port |
|---|---|---|
| `1-node-pure/server.js` | Node.js thuần (`http`) | 3001 |
| `2-express/app.js` | Express | 3002 |
| `3-nestjs/` (`src/users/`) | NestJS + `class-validator` | 3003 |

- **Cách chạy:**
  - Chạy cả 3 server. Express và NestJS cần `npm install` trước.
  - Sau đó chạy `node test.mjs` để in bảng so sánh status code.
- **Kết quả đã kiểm chứng:**

| Test case | Node thuần | Express | NestJS |
|---|---|---|---|
| `POST {"name":"An"}` | 201 | 201 | 201 |
| `POST {}` | 400 (tự viết `if`) | 400 (tự viết `if`) | 400, thông báo chi tiết tự sinh từ DTO |
| `POST` JSON sai cú pháp | 400 (tự `try/catch`) | 400 nhưng trả về **trang HTML** | 400 JSON |
| `GET /users/99` | 404 | 404 | 404 |
| `GET /users/abc` | 404 | 404 | **400** nhờ `ParseIntPipe` |

- **Hướng dẫn chi tiết:** [compare-demo/README.md](compare-demo/README.md)

## Lưu ý khi chuẩn bị

- **Code trên slide phải dùng import có đuôi `.js`** (vì NestJS v12 dùng ESM), ví dụ `import { HealthService } from './health.service.js'`.
- **Nếu chưa cài Nest CLI global:** dùng `npx nest ...` thay cho `nest ...`.
- **Dữ liệu demo phần 5 chỉ lưu trong bộ nhớ:** cần khởi động lại server trước mỗi lần chạy `test.mjs`, để kết quả khớp với bảng.
- **Kiểm tra lại với docs.nestjs.com trước khi làm slide:** phần lịch sử và cha đẻ là kiến thức chung, chưa đối chiếu với nguồn chính thức.
- **Nên quay video demo sẵn:** để dự phòng khi lỗi mạng hoặc lỗi môi trường.
