# Bài 7 — Express Generator

**Slide:** 35–48
**Mục tiêu:** dùng `express-generator` sinh khung project, đọc hiểu code nó sinh ra (bây giờ bạn đã hiểu được hết!), rồi gắn router của riêng bạn vào.
**Chấm:** tự đối chiếu checklist cuối bài và [đáp án](../../solutions/ex7-express-generator/README.md).

## Phần A — Sinh project

Làm trong thư mục này (`exercises/ex7-express-generator/`):

```bash
npx express-generator --view=ejs myapp     # không cần cài global
# hoặc như slide: npm i -g express-generator  rồi  express --view=ejs myapp

cd myapp
npm install
```

> Slide 37 ghi "view engine will be set to EJB" nhưng lệnh lại dùng `--view=pug`: slide viết nhầm. Ta dùng **EJS** vì Slot 7 học EJS.
> `npm install` có thể báo vài *vulnerabilities*. Đó là do template của generator dùng phiên bản thư viện cũ (Express 4.16), không ảnh hưởng bài tập.

Chạy với debug log (slide 38 dùng cú pháp của **cmd**; chọn đúng dòng cho terminal bạn đang dùng):

| Terminal | Lệnh |
|---|---|
| PowerShell (mặc định trong VS Code) | `$env:DEBUG='myapp:*'; npm start` |
| Command Prompt (cmd) | `set DEBUG=myapp:* & npm start` |
| Git Bash / macOS / Linux | `DEBUG=myapp:* npm start` |

Mở <http://localhost:3000/>, bạn sẽ thấy **Express — Welcome to Express**.

## Phần B — Đọc hiểu code sinh ra

Mở `myapp/app.js`, `myapp/bin/www`, `myapp/routes/*.js` và trả lời:

1. Lệnh `npm start` thực chất chạy file nào? `app.listen(...)` / `server.listen(...)` nằm ở đâu? Làm sao đổi sang cổng 4000 **mà không sửa code**?
2. Phân loại **từng dòng** `app.use(...)` trong `app.js` vào 5 loại middleware ở slide 17.
3. Vào `/users` thì hàm nào xử lý? Vì sao trong `routes/users.js` path lại là `'/'` chứ không phải `'/users'`?
4. Vào `/abc` thì request đi qua những middleware nào, **ai** là người cuối cùng gửi response?
5. Trang lỗi ở câu 4 hiện cả *stack trace*. Dòng code nào quyết định điều đó? Làm sao để ẩn đi?
6. `package.json` ghi `"express": "~4.16.1"`. Dấu `~` cho phép cài những phiên bản nào? Nếu là `^4.16.1` thì sao?
7. Generator viết `express.urlencoded({ extended: false })`, còn slide viết `extended: true`. Khác nhau ở đâu?

## Phần C — Gắn router của bạn

1. Tạo `myapp/routes/articleRouter.js` theo slide 40–47 (route `/` và `/:id` với đủ GET/POST/PUT/DELETE).
2. Trong `myapp/app.js`, thêm `require` và `app.use('/articles', articleRouter)` **cạnh** `app.use('/users', usersRouter)`. Tự nghĩ xem vì sao không được đặt ở cuối file.
3. Restart server, dùng Postman gửi đủ 8 request (4 method × 2 path) như slide 46–48.
4. Copy `routes/bookRouter.js` và `data/books.js` từ **Bài 6** sang `myapp`, gắn ở `/api/books`. Kiểm tra CRUD vẫn chạy.

## Checklist

- [ ] `npm start` chạy được, thấy trang *Welcome to Express*
- [ ] Thấy log `myapp:server Listening on port 3000` khi bật `DEBUG`
- [ ] Trả lời được 7 câu Phần B
- [ ] `GET /articles` → `Will send all the articles to you!`
- [ ] `PUT /articles/1` với body JSON → 2 dòng `Updating the article: 1` ...
- [ ] `POST /articles/1` → 403
- [ ] `GET /api/books` trả về JSON 3 cuốn sách từ Bài 6
- [ ] `GET /abc` → trang lỗi 404 do `views/error.ejs` render
