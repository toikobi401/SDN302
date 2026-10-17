# Demo phần 2: Khởi tạo NestJS + Health endpoint

## 1. Khởi tạo dự án

```bash
npm i -g @nestjs/cli
nest new my-app
cd my-app
npm run start:dev
```

Mở http://localhost:3000 sẽ thấy `Hello World!`

## 2. Tạo health endpoint

```bash
nest g module health
nest g controller health --no-spec
nest g service health --no-spec
```

CLI tự tạo thư mục `src/health/` và tự import `HealthModule` vào `AppModule`.

Code đã điền sẵn:
- [health.service.ts](my-app/src/health/health.service.ts): trả `status`, `uptime`, `timestamp`
- [health.controller.ts](my-app/src/health/health.controller.ts): `GET /health`, inject `HealthService` qua constructor

## 3. Chạy thử

```bash
cd my-app
npm run start
```

`GET http://localhost:3000/health` trả về:

```json
{ "status": "ok", "uptime": 0.74, "timestamp": "2026-10-17T14:55:14.162Z" }
```

Log khi khởi động có dòng `Mapped {/health, GET} route`, nghĩa là route đã được đăng ký tự động.
