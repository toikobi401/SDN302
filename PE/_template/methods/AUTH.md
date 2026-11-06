# AUTH — Bảo vệ route

> Đề ghi **"0 points if no authorization"** — làm thiếu phần này là mất trắng điểm cả câu đó,
> dù logic nghiệp vụ đúng hết.

## Đề dùng kiểu nào? Đọc dòng "Authorization" rồi tra bảng

| Đề viết gì | Kiểu | Mục |
|---|---|---|
| "Read **access_key** from request headers" | API key trong header | [access_key](#1-access_key-trong-header) |
| "Example: `access_key: 123456abcdef`" | API key trong header | [access_key](#1-access_key-trong-header) |
| "**Bearer** token", "Authorization header" | JWT | [JWT](#2-jwt-bearer-token) |
| "**Login** endpoint returns a **token**" | JWT | [JWT](#2-jwt-bearer-token) |
| "Hash password", "bcrypt" | JWT + bcrypt | [Đăng ký / đăng nhập](#3-đăng-ký--đăng-nhập) |
| "Role must be customer/admin" | Thêm vào bất kỳ kiểu nào | [Phân quyền](#4-phân-quyền-theo-role) |

> ⚠️ **`JWT_SECRET` trong file `.env` không có nghĩa là đề yêu cầu JWT.**
> Dòng đó nằm sẵn trong mọi `resource` được phát, kể cả đề chỉ dùng `access_key`.
> Đề PE Spring 2026 (`sp26_PE_1`) là ví dụ: có `JWT_SECRET` nhưng Authorization chỉ ghi
> *"Students must: Read access_key from request headers"* — làm JWT ở đó là làm thừa, và sai yêu cầu.

---

## 1. access_key trong header

**Đề mẫu:** `sp26_PE_1` Q4 — `POST /api/tickets`.
Code dưới đây **đã chạy thật và khớp đáp án mẫu của đề**.

```js
const requireCustomer = async (req, res, next) => {
    try {
        // ⚠️ Tên header đọc ra LUÔN là chữ thường, kể cả client gửi "Access_Key"
        const accessKey = req.headers['access_key'];
        if (!accessKey) {
            return res.status(403).json({ error: 'No access key' });
        }

        const user = await User.findOne({ access_key: accessKey });
        if (!user) {
            return res.status(403).json({ error: 'Invalid or unauthorized access key' });
        }
        if (user.role !== 'customer') {                   // ⚠️ ĐỔI: role theo đề
            return res.status(403).json({ error: 'Customer access required' });
        }

        req.user = user;        // handler phía sau lấy id người dùng từ đây
        next();
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Gắn vào GIỮA đường dẫn và handler
app.post('/api/tickets', requireCustomer, async (req, res) => {
    // req.user đã sẵn sàng
});
```

| # | Case | Header gửi lên | Kết quả |
|---|---|---|---|
| 1 | Không gửi header | — | 403 `{"error":"No access key"}` |
| 2 | Header rỗng | `access_key:` | 403 `No access key` (chuỗi rỗng là falsy) |
| 3 | Key không có trong DB | `access_key: nope` | 403 `{"error":"Invalid or unauthorized access key"}` |
| 4 | Key của admin | `access_key: admin_key_1` | 403 `{"error":"Customer access required"}` |
| 5 | Key của staff | `access_key: staff_key` | 403 `Customer access required` |
| 6 | Key của customer | `access_key: cust_key_a` | đi tiếp, `req.user` là user đó |

> ⚠️ Đề dùng **403 cho cả 3 trường hợp**, kể cả case 1 (chuẩn REST là 401).
> **Theo đề, đừng theo chuẩn** — trả 401 cho case 1 là mất điểm.

### Test bằng Thunder Client / REST Client

```http
### 403 - không có key
POST http://localhost:9999/api/tickets
Content-Type: application/json

{ "showtimeId": "65fc00000000000000000006", "seats": ["A1"] }

### 403 - sai role
POST http://localhost:9999/api/tickets
Content-Type: application/json
access_key: admin_key_1

{ "showtimeId": "65fc00000000000000000006", "seats": ["A1"] }

### 201 - hợp lệ
POST http://localhost:9999/api/tickets
Content-Type: application/json
access_key: cust_key_a

{ "showtimeId": "65fc00000000000000000006", "seats": ["A1", "A2"] }
```

---

## 2. JWT (Bearer token)

Dùng khi đề nhắc **"token"**, **"Bearer"**, hoặc có endpoint **login**.

```js
const jwt = require('jsonwebtoken');

const requireToken = (req, res, next) => {
    try {
        const header = req.headers.authorization || '';           // "Bearer eyJhbGci..."
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // verify() ném lỗi nếu chữ ký sai HOẶC token hết hạn -> rơi xuống catch
        req.user = jwt.verify(token, process.env.JWT_SECRET);

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
```

| # | Case | Header `Authorization` | Kết quả |
|---|---|---|---|
| 1 | Không gửi | — | 401 `No token provided` |
| 2 | Thiếu chữ "Bearer " | `eyJhbGci...` | 401 `No token provided` |
| 3 | Sai chính tả prefix | `bearer eyJ...` (chữ b thường) | 401 — `startsWith` phân biệt hoa thường |
| 4 | Token bịa | `Bearer abc.def.ghi` | 401 `Invalid token` |
| 5 | Token ký bằng secret khác | `Bearer eyJ...` | 401 `Invalid token` |
| 6 | Token hết hạn | `Bearer eyJ...` | 401 `Invalid token` |
| 7 | Token hợp lệ | `Bearer eyJ...` | đi tiếp, `req.user` = payload đã ký |

> ⚠️ `req.user` ở đây là **payload trong token**, không phải document trong DB.
> Payload chỉ có đúng những field bạn đã `sign`. Cần dữ liệu khác thì query thêm:
> `const user = await User.findById(req.user._id);`

> ⚠️ Nếu đề yêu cầu **403** thay vì 401, đổi cả hai chỗ `res.status(401)` — đọc kỹ đáp án mẫu.

---

## 3. Đăng ký / đăng nhập

```js
const bcrypt = require('bcryptjs');

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password required' });
        }
        if (await User.findOne({ email })) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // ⚠️ KHÔNG lấy role từ req.body — người dùng sẽ tự đăng ký thành admin.
        //    Muốn cấp role thì làm route riêng: requireToken + requireRole('admin')
        const user = await User.create({
            name,
            email,
            role: 'customer',
            password: await bcrypt.hash(password, 10)
        });

        return res.status(201).json({ message: 'Registered', userId: user._id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        // ⚠️ DỮ LIỆU ĐỀ THƯỜNG LƯU PASSWORD KHÔNG HASH (vd "pass123").
        //    Mở Compass xem trước. Nếu không hash thì đổi thành:
        //        const ok = user && user.password === password;
        const ok = user && await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { _id: user._id, role: user.role },       // payload: chỉ những gì middleware cần
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({ token });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| # | Case | Kết quả |
|---|---|---|
| 1 | Đăng ký hợp lệ | 201 |
| 2 | Thiếu email/password | 400 |
| 3 | Email đã tồn tại | 409 |
| 4 | Đăng nhập đúng | 200 + `{ token }` |
| 5 | Sai mật khẩu | 401 `Invalid email or password` |
| 6 | Email không tồn tại | 401 — **cùng message với case 5**, đừng tách riêng |
| 7 | DB lưu password thô, code dùng `bcrypt.compare` | Luôn 401 → **đổi sang so sánh `===`** |

> ⚠️ Case 5 và 6 phải trả **cùng một message**. Tách thành "Email not found" / "Wrong password"
> là lộ thông tin cho kẻ dò tài khoản.

> ⚠️ Case 7 là bẫy thật: dữ liệu `users` của đề `sp26_PE_1` lưu `"password": "pass123"` dạng thô.
> `bcrypt.compare("pass123", "pass123")` trả `false` vì vế sau không phải hash.

---

## 4. Phân quyền theo role

```js
// Dùng SAU requireToken hoặc requireCustomer (cần req.user đã được gán)
const requireRole = role => (req, res, next) => {
    if (req.user.role !== role) {
        return res.status(403).json({ error: `${role} access required` });
    }
    next();
};

app.delete('/api/movies/:id', requireToken, requireRole('admin'), handler);
```

Cho phép nhiều role:

```js
const requireAnyRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
};

app.get('/api/reports', requireToken, requireAnyRole('admin', 'staff'), handler);
```

### Chỉ được thao tác trên dữ liệu của chính mình

```js
const ticket = await Ticket.findById(ticketId);
if (!ticket) {
    return res.status(404).json({ error: `Ticket with _id='${ticketId}' not found` });
}

// ⚠️ So sánh ObjectId PHẢI qua String(). Dùng === trên 2 object luôn ra false.
if (String(ticket.userId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'You can only access your own tickets' });
}
```

| # | Case | Kết quả |
|---|---|---|
| 1 | Admin thao tác bất kỳ | đi tiếp |
| 2 | Customer thao tác dữ liệu của mình | đi tiếp |
| 3 | Customer thao tác dữ liệu người khác | 403 |
| 4 | So sánh bằng `===` thay vì `String()` | Chặn nhầm **cả** người hợp lệ |

---

## 5. Lấy danh tính ở đâu

```js
// ĐÚNG — middleware đã xác thực
userId: req.user._id

// SAI — client gửi id nào cũng được, đặt vé hộ người khác thoải mái
userId: req.body.userId
```

> ⚠️ Đây là lỗi im lặng: test vẫn ra 201, đáp án vẫn khớp, nhưng sai hoàn toàn về bảo mật.
> Khi đề đã bắt làm authorization thì **mọi** id người dùng phải lấy từ `req.user`.

---

## Bẫy hay gặp

| Bẫy | Hiện tượng | Cách xử lý |
|---|---|---|
| `req.headers['Access_Key']` | Luôn `undefined` → luôn 403 | Tên header viết **thường** |
| Làm JWT khi đề chỉ cần `access_key` | Mất điểm vì không đúng yêu cầu | Đọc kỹ dòng "Authorization" của đề |
| Trả 401 khi đề bắt 403 | Lệch đáp án mẫu | Copy đúng status code đề vẽ |
| `bcrypt.compare` với password thô trong DB | Đăng nhập luôn thất bại | Mở Compass xem, đổi sang `===` |
| `role` lấy từ `req.body` khi đăng ký | Ai cũng tự thành admin | Hard-code `'customer'` |
| `userId` lấy từ `req.body` | Đặt hộ người khác được | Lấy từ `req.user._id` |
| So sánh ObjectId bằng `===` | Luôn `false`, chặn nhầm | `String(a) !== String(b)` |
| Quên `next()` trong middleware | Request treo, Postman quay mãi | Thêm `next()` ở nhánh thành công |
| Đặt middleware sai chỗ | Không chạy | `app.post(path, middleware, handler)` |

---

## Checklist câu có authorization

- [ ] Đề yêu cầu `access_key` hay JWT? (đừng tự suy từ `JWT_SECRET` trong `.env`)
- [ ] Tên header đọc đúng chữ thường?
- [ ] Đủ **3 nhánh**: thiếu key → key sai → sai role?
- [ ] Status code **đúng như đề** (403 hay 401)?
- [ ] Message lỗi copy nguyên văn từng dấu câu?
- [ ] Có `next()` ở nhánh thành công?
- [ ] Middleware gắn **giữa** đường dẫn và handler?
- [ ] Mọi `userId` lấy từ `req.user`, không từ `req.body`?
- [ ] Nếu so sánh chủ sở hữu, đã bọc `String()` quanh ObjectId?
