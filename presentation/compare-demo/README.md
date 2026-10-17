# Demo phần 5: So sánh Node.js thuần, Express và NestJS

Cùng một API `users`, viết bằng 3 cách:
- `POST /users`: tạo user, bắt buộc có `name` dạng chuỗi. Sai thì trả 400.
- `GET /users/:id`: lấy user theo id. Không tìm thấy thì trả 404.

| Thư mục | Công nghệ | Port | File cần xem |
|---|---|---|---|
| [1-node-pure](1-node-pure/) | Node.js thuần (`http`) | 3001 | [server.js](1-node-pure/server.js) |
| [2-express](2-express/) | Express | 3002 | [app.js](2-express/app.js) |
| [3-nestjs](3-nestjs/) | NestJS | 3003 | [users.controller.ts](3-nestjs/src/users/users.controller.ts), [users.service.ts](3-nestjs/src/users/users.service.ts), [create-user.dto.ts](3-nestjs/src/users/dto/create-user.dto.ts), [main.ts](3-nestjs/src/main.ts) |

## Chạy demo

Mở 3 terminal:

```bash
# Terminal 1
node 1-node-pure/server.js

# Terminal 2
node 2-express/app.js

# Terminal 3
cd 3-nestjs
npm run start
```

Terminal thứ 4, chạy bộ test chung (gửi cùng request tới cả 3 server, in bảng so sánh):

```bash
node test.mjs
```

Hoặc test từng request bằng Postman.

## Kết quả

| Test case | Node thuần | Express | NestJS |
|---|---|---|---|
| `POST /users {"name":"An"}` | 201 | 201 | 201 |
| `POST /users {}` | 400 (tự viết `if`) | 400 (tự viết `if`) | 400, thông báo lỗi chi tiết tự sinh từ DTO |
| `POST /users {"name":123}` | 400 | 400 | 400 `name must be a string` |
| `POST /users` JSON sai cú pháp | 400 (tự `try/catch`) | **400 trả về trang HTML** (thiếu error middleware) | 400 JSON |
| `GET /users/1` | 200 | 200 | 200 |
| `GET /users/99` | 404 | 404 | 404 |
| `GET /users/abc` | 404 | 404 | **400** nhờ `ParseIntPipe` |

## Điểm khác biệt cần chỉ ra

| | Node thuần | Express | NestJS |
|---|---|---|---|
| Routing | regex + `if/else` | `app.get()`, `app.post()` | `@Get()`, `@Post()` |
| Đọc body | tự đọc stream + `JSON.parse` | `express.json()` | `@Body()` |
| Validation | tự viết `if` | tự viết `if` | DTO + `ValidationPipe` |
| Lỗi 404 | `send(404, ...)` | `res.status(404).json()` | `throw new NotFoundException()` |
| Response | `res.writeHead` + `res.end(JSON.stringify())` | `res.json()` | `return` object |
| Tổ chức code | 1 file | 1 file | Controller / Service / DTO / Module |
| Phụ thuộc | không cần package | `express` | `@nestjs/*`, `class-validator`, `class-transformer` |
