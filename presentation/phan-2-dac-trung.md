# Phần 2 — Đặc trưng của NestJS & demo khởi tạo

Tài liệu học cho người trình bày phần 2 (slide 7 → 14). Mọi đoạn code trong này lấy từ project thật [my-app/](my-app/), đã chạy được với NestJS v12.

## Phần 2 cần trả lời câu hỏi gì?

Slide 6 vừa nêu 4 vấn đề của Node.js/Express: mỗi project một kiểu, khó test, thiếu TypeScript, người quen Spring/Angular thấy lạ. **Phần 2 trả lời: NestJS giải quyết bằng những công cụ nào.**

| Slide | Nội dung | Ý chính cần người nghe nhớ |
|---|---|---|
| 7 | Module · Controller · Service | Mỗi tính năng = 3 khối, mỗi khối một việc |
| 8 | Code `HealthController` | Một tính năng = 3 file, không cần tự đăng ký route |
| 9 | DI · Decorator · TypeScript | Không `new` thủ công, Nest tự lắp ráp |
| 10 | Vòng đời request | Mỗi việc (auth, validate, lỗi) có một chỗ riêng |
| 11 | CLI · Testing · nhiều kiểu app | Có công cụ đi kèm, không phải tự dựng |
| 12 | 3 lệnh tạo một tính năng | CLI tạo file **và** tự đăng ký vào module |
| 13 | `nest g resource` | Một lệnh ra trọn khung CRUD: dto, entity, 5 route |
| 14 | Demo `GET /health` | Từ 0 đến endpoint chạy được trong 3 lệnh |

---

## 1. Ba khối: Module · Controller · Service (slide 7)

### Hình dung bằng một nhà hàng

| Khối | Trong nhà hàng | Trong NestJS | Đã học ở SDN302 |
|---|---|---|---|
| **Module** | Một quầy (quầy bar, quầy bếp nóng) | Gom mọi thứ của **một tính năng** | Thư mục theo tính năng |
| **Controller** | Người phục vụ: nhận order, mang món ra | Nhận request, gọi service, trả response | `routes/` + phần nhận `req, res` |
| **Service** | Đầu bếp: nấu thật | Chứa **logic nghiệp vụ**, truy cập dữ liệu | `controllers/` trong mô hình MVC Express |

> Lưu ý dễ nhầm: "controller" trong Express MVC của lớp thường chứa luôn logic. Trong Nest, **controller chỉ điều phối**, logic nằm ở **service**.

### Module

```ts
// src/health/health.module.ts
@Module({
  controllers: [HealthController],   // ai nhận request
  providers: [HealthService],        // ai được Nest quản lý và inject
})
export class HealthModule {}
```

- `imports` — module khác mà module này cần dùng.
- `controllers` — các controller của tính năng.
- `providers` — các class Nest tạo và inject (service, repository, helper…).
- `exports` — provider cho module khác dùng lại.
- Ứng dụng luôn có một module gốc là `AppModule`; các module tính năng được `imports` vào đó:

```ts
// src/app.module.ts
@Module({
  imports: [HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Controller

```ts
// src/health/health.controller.ts
@Controller('health')                 // prefix: mọi route ở đây bắt đầu bằng /health
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()                              // GET /health
  check() {
    return this.healthService.check(); // return object → Nest tự trả JSON, status 200
  }
}
```

- Decorator HTTP: `@Get()`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()`.
- Lấy dữ liệu request: `@Param('id')`, `@Query('page')`, `@Body()`, `@Headers()`.
- Mặc định: `POST` trả **201**, các method khác trả **200**. Đổi bằng `@HttpCode(204)`.
- Không cần `res.json(...)` — chỉ cần `return`.

### Service

```ts
// src/health/health.service.ts
@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
```

- `@Injectable()` = "Nest ơi, hãy quản lý class này".
- Mặc định là **singleton**: cả ứng dụng dùng chung một instance.
- Tách service ra giúp: tái sử dụng logic ở nhiều controller, và test riêng logic mà không cần HTTP.

### Đường đi của một request trong demo

```
GET /health
   │
main.ts ── NestFactory.create(AppModule)
   │
AppModule ── imports: [HealthModule]
   │
HealthModule
   ├─ HealthController  @Controller('health') + @Get()  → khớp route
   │        │ gọi
   └─ HealthService     check()  → { status, uptime, timestamp }
   │
Nest chuyển object thành JSON, trả 200
```

---

## 2. Một tính năng = 3 file (slide 8)

```
src/health/
├── health.module.ts
├── health.controller.ts
└── health.service.ts
```

Ý cần nói: **người mới vào dự án Nest nào cũng biết tìm code ở đâu** — đây chính là câu trả lời cho vấn đề "mỗi project Express một kiểu" ở slide 3 và 6.

### Lưu ý NestJS v12: import phải có đuôi `.js`

```ts
import { HealthService } from './health.service.js'; // đúng — dù file thật là .ts
import { HealthService } from './health.service';    // sai trong v12
```

Lý do: project v12 dùng **ES Modules** (`"type": "module"` trong `package.json`). Chuẩn ESM của Node bắt buộc ghi đủ đuôi file; TypeScript biên dịch `.ts` thành `.js` nên ta ghi `.js` ngay từ đầu. Nếu thầy hỏi "sao import file .ts mà ghi .js?" thì đây là câu trả lời.

---

## 3. Dependency Injection · Decorator · TypeScript (slide 9)

### Dependency Injection (DI) là gì?

**Không có DI** — class tự tạo thứ nó cần:

```js
class HealthController {
  constructor() {
    this.healthService = new HealthService(); // tự new → dính chặt vào HealthService
  }
}
```

**Có DI** — class chỉ *khai báo* cần gì, Nest tự tạo và đưa vào:

```ts
constructor(private readonly healthService: HealthService) {}
```

Nest làm 3 bước:
1. Đọc **kiểu** của tham số constructor (`HealthService`) — đây là lúc TypeScript được dùng.
2. Tìm `HealthService` trong `providers` của module.
3. Tạo (hoặc lấy instance có sẵn, vì singleton) rồi truyền vào.

Lợi ích:
- **Loose coupling** — controller không phụ thuộc cách tạo service.
- **Dễ đổi implementation** — thay service thật bằng service khác chỉ ở một chỗ (module).
- **Dễ test** — khi test, đưa vào bản giả (mock) thay cho service thật (xem mục 6).

Điều kiện: provider phải nằm trong `providers` của module, **hoặc** được `exports` từ một module đã `imports`. Quên bước này, ứng dụng không khởi động và báo lỗi kiểu *"Nest can't resolve dependencies of the HealthController…"* — đây là lỗi người mới gặp nhiều nhất.

### Decorator là gì?

Cú pháp `@Tên()` đặt trước class / method / tham số / thuộc tính để **gắn thông tin (metadata)**. Nest đọc metadata đó để biết đăng ký route nào, inject gì, validate ra sao.

| Nhóm | Ví dụ | Ý nghĩa |
|---|---|---|
| Class | `@Module` · `@Controller` · `@Injectable` | Class này đóng vai trò gì |
| Method | `@Get` · `@Post` · `@UseGuards` · `@HttpCode` | Method xử lý route nào, áp dụng gì |
| Tham số | `@Body` · `@Param` · `@Query` | Lấy dữ liệu nào từ request |
| Property (DTO) | `@IsString` · `@IsNotEmpty` | Luật validate (thư viện class-validator) |

So với Express: thay vì `app.get('/health', handler)` ở một file và handler ở file khác, Nest để **khai báo ngay trên method** — đọc code là biết route.

### TypeScript là mặc định

- Project tạo sẵn `tsconfig.json`, lệnh build, lint.
- Lỗi kiểu bị phát hiện lúc biên dịch, trước khi chạy.
- IDE gợi ý code tốt hơn.
- Như trên: **DI dựa vào kiểu dữ liệu** — đây là lý do Nest gắn chặt với TypeScript.

---

## 4. Vòng đời request (slide 10)

Thứ tự một request đi qua:

```
Request
  → 1 Middleware
  → 2 Guard
  → 3 Interceptor (trước)
  → 4 Pipe
  → 5 Controller → Service
  → 6 Interceptor (sau)
→ Response

  ! Exception Filter — nhánh lỗi: bắt exception ném ra ở BẤT KỲ bước nào
```

| Thành phần | Làm gì | Khi thất bại | Tương đương trong Express (đã học) |
|---|---|---|---|
| **Middleware** | Xử lý chung trước route: log, CORS | — | `app.use(morgan(...))`, `app.use(cors())` |
| **Guard** | Cho đi tiếp hay không: xác thực, phân quyền | **403** (mặc định) | Middleware check JWT / `passport.authenticate()` |
| **Interceptor** | Bọc quanh handler: đo thời gian, đổi format response, cache | — | Middleware tự viết chạy trước + sau |
| **Pipe** | Validate và chuyển kiểu dữ liệu vào | **400** | `if (!name) return res.status(400)…`, express-validator |
| **Controller** | Code của bạn | — | Route handler |
| **Exception Filter** | Biến exception thành response lỗi thống nhất (JSON) | — | Error middleware `(err, req, res, next)` |

Ví dụ từng loại:

```ts
// Pipe — id không phải số → tự trả 400
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) { … }

// Guard — chưa đăng nhập / không có quyền → bị chặn
@UseGuards(AuthGuard)
@Get('profile')
getProfile() { … }

// Exception — throw ở service, Filter tự trả { statusCode: 404, message, error }
throw new NotFoundException('User not found');
```

Ý chính để nói: **Express gom mọi thứ vào "middleware"; Nest tách mỗi việc một lớp có tên rõ ràng** → đọc code biết ngay đoạn nào lo xác thực, đoạn nào lo validate. Phạm vi áp dụng linh hoạt: toàn cục, cả controller, hoặc từng method.

Vì sao Exception Filter là "nhánh" chứ không phải "bước 7": nó chỉ chạy **khi có lỗi**, và lỗi có thể xảy ra ở Guard, Pipe, Service… chứ không đợi đến cuối.

---

## 5. Nest CLI (slide 11)

| Lệnh | Làm gì |
|---|---|
| `npx @nestjs/cli new my-app` | Tạo project mới (hoặc `nest new` nếu đã `npm i -g @nestjs/cli`) |
| `npx nest g module health` | Tạo module, **tự thêm vào `imports` của `AppModule`** |
| `npx nest g controller health` | Tạo controller, tự đăng ký vào `HealthModule` |
| `npx nest g service health` | Tạo service, tự đăng ký vào `providers` |
| `npx nest g resource users` | Sinh trọn bộ CRUD: module, controller, service, DTO, entity |
| `npm run start:dev` | Chạy và tự reload khi sửa code |
| `npm run build` | Build ra thư mục `dist/` |

> Vì sao bước 1 dùng `npx @nestjs/cli` mà bước 2 dùng `npx nest`? Lúc chưa có project, máy chưa có CLI → phải gọi đúng tên gói `@nestjs/cli`. Sau khi tạo project, CLI đã nằm trong `devDependencies` nên `npx nest` dùng được. (Gõ `npx nest new` khi chưa có project sẽ tải nhầm một gói khác tên `nest`.)

Ý chính: CLI không chỉ tạo file, nó **tự nối dây** giữa các file — đúng quy ước, không quên đăng ký.

### 5a. Tạo một tính năng bằng 3 lệnh (slide 12)

Output thật của Nest CLI v12 (chạy theo thứ tự module → controller → service):

```
$ npx nest g module users
CREATE src/users/users.module.ts
UPDATE src/app.module.ts                  ← thêm UsersModule vào imports

$ npx nest g controller users
CREATE src/users/users.controller.ts
CREATE src/users/users.controller.spec.ts
UPDATE src/users/users.module.ts          ← thêm vào controllers

$ npx nest g service users
CREATE src/users/users.service.ts
CREATE src/users/users.service.spec.ts
UPDATE src/users/users.module.ts          ← thêm vào providers
```

Cấu trúc thư mục sau 3 lệnh, và mỗi file chứa gì:

```
src/
├─ app.module.ts                 imports: [HealthModule, UsersModule]
└─ users/
   ├─ users.module.ts            @Module({ controllers: [UsersController], providers: [UsersService] })
   ├─ users.controller.ts        @Controller('users') export class UsersController {}   ← chưa có route
   ├─ users.controller.spec.ts   test "should be defined" (Test.createTestingModule)
   ├─ users.service.ts           @Injectable() export class UsersService {}             ← rỗng
   └─ users.service.spec.ts      test "should be defined"
```

- Vì sao làm **module trước**: khi tạo controller/service, CLI tìm module cùng tên để đăng ký vào. Nếu chưa có module, chúng sẽ bị đăng ký thẳng vào `AppModule`.
- Controller và service sinh ra **rỗng** — việc của mình là thêm route (`@Get()`…) và logic.
- Tuỳ chọn hay dùng: `--dry-run` (xem trước, không ghi file), `--no-spec` (không tạo file test), `--flat` (không tạo thư mục riêng). Viết tắt: `nest g mo`, `nest g co`, `nest g s`.

### 5b. `nest g resource` — trọn bộ CRUD (slide 13)

`npx nest g resource products` hỏi 2 câu: kiểu ứng dụng (REST API, GraphQL, WebSockets, Microservice) và có sinh CRUD không. Chọn REST + Yes:

```
src/products/
├─ dto/
│  ├─ create-product.dto.ts     export class CreateProductDto {}                — khai báo dữ liệu gửi lên
│  └─ update-product.dto.ts     extends PartialType(CreateProductDto)           — mọi trường thành optional (cho PATCH)
├─ entities/
│  └─ product.entity.ts         export class Product {}                         — hình dạng dữ liệu
├─ products.controller.ts       5 route CRUD
├─ products.controller.spec.ts
├─ products.service.ts          5 method trả chuỗi mẫu ("This action adds a new product")
├─ products.service.spec.ts
└─ products.module.ts           nối controller + service
```

| Route | Method trong controller | Gọi service |
|---|---|---|
| `POST /products` | `create(@Body() dto)` | `create(dto)` |
| `GET /products` | `findAll()` | `findAll()` |
| `GET /products/:id` | `findOne(@Param('id') id)` | `findOne(+id)` |
| `PATCH /products/:id` | `update(@Param('id') id, @Body() dto)` | `update(+id, dto)` |
| `DELETE /products/:id` | `remove(@Param('id') id)` | `remove(+id)` |

Ngoài ra CLI còn: `UPDATE src/app.module.ts` (thêm `ProductsModule`) và **tự cài gói `@nestjs/mapped-types`** (cần cho `PartialType`). Lưu ý `+id` chỉ ép kiểu đơn giản — muốn trả 400 khi id không phải số thì đổi sang `@Param('id', ParseIntPipe)`. Service chỉ là khung; logic thật (lưu MongoDB…) do mình viết.

---

## 6. Testing (slide 11)

> ⚠️ **Đính chính:** Slide 11, 15, 21 và Google Doc đang ghi "Jest". Project tạo bằng **NestJS v12 dùng Vitest** (kiểm tra trong `my-app/package.json`: `"test": "vitest run"`). Các bản Nest cũ mới dùng Jest. Nên sửa slide thành **"Testing (Vitest)"**, hoặc nói "Vitest (bản cũ dùng Jest)".

Project mới có sẵn:
- Unit test: file `*.spec.ts` cạnh code (ví dụ `src/app.controller.spec.ts`).
- E2E test: thư mục `test/`, dùng Supertest gọi HTTP thật.
- Lệnh: `npm test`, `npm run test:e2e`, `npm run test:cov`.

Unit test có sẵn trong project (đã chạy: 1 passed):

```ts
const app = await Test.createTestingModule({
  controllers: [AppController],
  providers: [AppService],
}).compile();

appController = app.get(AppController);
expect(appController.getHello()).toBe('Hello World!');
```

`Test.createTestingModule()` dựng một module thu nhỏ chỉ để test. **Đây là chỗ DI phát huy tác dụng** — muốn thay service thật bằng bản giả, chỉ đổi phần `providers`:

```ts
providers: [
  { provide: HealthService, useValue: { check: () => ({ status: 'ok' }) } },
],
```

Controller không cần sửa một dòng nào.

---

## 7. Nhiều kiểu ứng dụng (slide 11)

Cùng kiến trúc Module / DI / Guard / Pipe, đổi "lớp vận chuyển":

| Kiểu | Gói | Decorator chính | Dùng cho |
|---|---|---|---|
| REST | có sẵn | `@Controller`, `@Get` | API thông thường |
| GraphQL | `@nestjs/graphql` | `@Resolver`, `@Query`, `@Mutation` | Client chọn trường dữ liệu cần lấy |
| WebSocket | `@nestjs/websockets` | `@WebSocketGateway`, `@SubscribeMessage` | Chat, thông báo realtime |
| Microservices | `@nestjs/microservices` | `@MessagePattern` | Giao tiếp giữa service qua TCP, Redis, Kafka, RabbitMQ, gRPC… |

Gói hệ sinh thái liên quan đến môn học: `@nestjs/mongoose` (MongoDB), `@nestjs/jwt` + `@nestjs/passport` (xác thực), `@nestjs/config` (`.env`), `@nestjs/swagger` (tài liệu API).

---

## 8. Kịch bản demo (slide 14)

Chuẩn bị trước: cài sẵn `node_modules` (tránh chờ mạng), mở sẵn terminal và trình duyệt, **có video quay sẵn để dự phòng**.

| Bước | Lệnh / thao tác | Chỉ cho lớp thấy |
|---|---|---|
| 1 | `npx @nestjs/cli new my-app` *(có thể bỏ qua, mở project đã tạo sẵn)* | Cấu trúc `src/`: `main.ts`, `app.module.ts`… |
| 2 | `npx nest g module health` → `controller` → `service` | Terminal in `CREATE …` và **`UPDATE src/app.module.ts`** — CLI tự nối dây |
| 3 | Mở `health.service.ts`, `health.controller.ts` | `@Injectable`, `@Controller('health')`, `@Get()`, constructor injection |
| 4 | `npm run start:dev` | Log khởi động có dòng **`Mapped {/health, GET} route`** — route tự đăng ký |
| 5 | Mở `http://localhost:3000/health` | `{"status":"ok","uptime":…,"timestamp":"…"}` |
| 6 *(tuỳ chọn)* | `npm test` | Test chạy qua, nhờ `Test.createTestingModule` |

Nếu demo lỗi: chuyển sang video, nói tiếp phần giải thích — không debug trước lớp.

---

## 9. Câu hỏi có thể gặp

**Hỏi:** Controller và Service khác gì nhau, sao không viết chung?
**Đáp:** Controller lo HTTP (route, tham số, status), Service lo nghiệp vụ. Tách ra để tái sử dụng logic và test logic mà không cần HTTP.

**Hỏi:** DI khác gì `require` / `import` rồi `new`?
**Đáp:** `import` chỉ lấy class; `new` thì mình tự quyết tạo lúc nào, tạo mấy cái. DI giao việc tạo cho Nest: một chỗ cấu hình, mặc định dùng chung một instance, và đổi sang bản mock khi test được.

**Hỏi:** Guard với Middleware khác gì nhau?
**Đáp:** Middleware chạy trước khi Nest biết route sẽ vào handler nào. Guard chạy sau đó, nên biết route/handler đích, phù hợp để quyết định quyền truy cập theo từng route.

**Hỏi:** Không biết TypeScript dùng Nest được không?
**Đáp:** Về kỹ thuật có thể dùng JavaScript, nhưng DI và decorator dựa vào kiểu dữ liệu, nên nên học TypeScript cơ bản trước.

**Hỏi:** Nest có thay thế Express không?
**Đáp:** Không. Mặc định Nest chạy **trên** Express (`@nestjs/platform-express` có trong `package.json`). Phần 4 sẽ nói rõ.

---

## 10. Tóm tắt 30 giây

> NestJS tổ chức mỗi tính năng thành **Module – Controller – Service**. Các khối được **nối bằng Dependency Injection**, khai báo bằng **decorator**, dựa trên **TypeScript**. Mỗi việc trong request có **một lớp riêng**: Guard lo quyền, Pipe lo validate, Exception Filter lo lỗi. **CLI** sinh code đúng quy ước, project có sẵn **test**. Demo: 3 lệnh là có `GET /health` chạy được.
