# POST — Tạo mới

> Thành công trả **201**, không phải 200. Status hợp lệ: **201**, **400**, **401/403**, **404**, **409**.

## ⚠️ Thứ tự kiểm tra — đây là nơi mất điểm nhiều nhất

Làm đúng thứ tự này, không được đảo:

```
1. Auth (nếu đề ghi "Protected")      -> 403 / 401
2. Thiếu field bắt buộc               -> 400
3. Id sai định dạng                   -> 400
4. Tài nguyên tham chiếu không tồn tại -> 404
5. Luật nghiệp vụ (trùng, hết chỗ)    -> 409 / 400
6. Ghi DB
7. Trả 201 đúng hình dạng đề vẽ
```

**Vì sao quan trọng:** nếu kiểm tra "ghế đã bị đặt chưa" (409) **trước** khi kiểm tra
"suất chiếu có tồn tại không" (404), thì test case 404 của đề sẽ nhận về 409 → sai.

## Bảng case

| # | Đề viết gì | Trả về | Mục |
|---|---|---|---|
| 1 | "Create a new..." | 201 \| 400 | [Tạo đơn giản](#1-tạo-đơn-giản) |
| 2 | "Validate department exists", "404 if not found" | 404 | [Kiểm tra khoá ngoại](#2-kiểm-tra-khoá-ngoại-tồn-tại) |
| 3 | "Validate all empId exist", "400 if any invalid" | 400 + danh sách | [Kiểm tra mảng id](#3-kiểm-tra-cả-mảng-id-con) |
| 4 | "Insert records into worksOns" | 201 | [Ghi nhiều bản ghi](#4-ghi-nhiều-bản-ghi-cùng-lúc) |
| 5 | "Reject if seat already booked" | 409 | [Chống trùng](#5-chống-trùng--409-conflict) |
| 6 | "Protected endpoint", "access_key" | 403 | [Bảo vệ route](#6-bảo-vệ-route) |
| 7 | "Calculate totalAmount on server side" | 201 | [Tính tiền ở server](#7-tính-toán-ở-server) |

---

## 1. Tạo đơn giản

```js
app.post('/api/children', async (req, res) => {
    try {
        const { proName, depId } = req.body;

        // Validate field bắt buộc. Dùng ! để bắt cả undefined, null và chuỗi rỗng
        if (!proName || !depId) {
            return res.status(400).json({ error: 'proName and depId are required' });
        }

        const child = await Child.create({ proName, depId });

        return res.status(201).json({
            message: 'Project created successfully',
            newProject: { projectId: child._id, projectName: child.proName }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Body | Kết quả |
|---|---|---|
| Hợp lệ | đủ field | 201 |
| Thiếu field | `{}` | 400 |
| Field là chuỗi rỗng | `{"proName":""}` | 400 (`!""` là `true`) |
| Body rỗng hoàn toàn | không gửi body | 400 — **nếu** có `app.use(express.json())` |

> ⚠️ **Thiếu `app.use(express.json())`** → `req.body` là `undefined` → dòng destructuring
> ném `TypeError` → rơi vào catch → **500 thay vì 400**. Đây là lỗi hay gặp nhất ở câu POST.

### Validate số

```js
if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
}
```

> `!price` **không** dùng được cho số, vì `!0` là `true` — số 0 hợp lệ sẽ bị báo thiếu field.

---

## 2. Kiểm tra khoá ngoại tồn tại

```js
// B1. Sai định dạng -> 400
if (!mongoose.Types.ObjectId.isValid(depId)) {
    return res.status(400).json({ error: `Invalid ObjectId: ${depId}` });
}

// B2. Không có trong DB -> 404
const parent = await Parent.findById(depId);
if (!parent) {
    return res.status(404).json({ error: `Department with _id='${depId}' not found` });
}
```

| Case | `depId` | Kết quả |
|---|---|---|
| Hợp lệ | id có thật | đi tiếp |
| Sai định dạng | `"abc"` | 400 |
| Đúng định dạng, không có trong DB | `65a1...005` | 404 |
| Thiếu hẳn | `undefined` | 400 (bắt ở bước field bắt buộc) |

> ⚠️ Bỏ bước `isValid` → `findById("abc")` ném `CastError` → catch → **500 thay vì 400**.

---

## 3. Kiểm tra cả mảng id con

**Đề mẫu:** "Validate all empId exist. Return 400 if any invalid" — và trả về **danh sách** id sai.

```js
const list = Array.isArray(employees) ? employees : [];   // employees có thể không được gửi

if (list.length) {
    const ids = list.map(e => e.empId);

    // Chỉ query những id ĐÚNG ĐỊNH DẠNG, tránh CastError
    const found = await User.find({ _id: { $in: ids.filter(id => mongoose.Types.ObjectId.isValid(id)) } }, '_id');
    const foundIds = new Set(found.map(u => String(u._id)));

    // Gom TẤT CẢ id sai rồi trả 1 lần, không return ngay ở cái đầu tiên
    const invalidEmployees = ids.filter(id => !foundIds.has(String(id)));
    if (invalidEmployees.length) {
        return res.status(400).json({ error: 'Some employees do not exist', invalidEmployees });
    }
}
```

| Case | `employees` | Kết quả |
|---|---|---|
| Tất cả hợp lệ | `[{empId:"...002"},{empId:"...003"}]` | đi tiếp |
| Có id không tồn tại | `[{empId:"...008"},{empId:"...009"}]` | 400 + `invalidEmployees: ["...008","...009"]` |
| Mảng rỗng | `[]` | đi tiếp, chỉ tạo bản ghi cha |
| Không gửi field | thiếu `employees` | đi tiếp (nhờ `Array.isArray`) |
| Id sai định dạng | `["abc"]` | 400, nằm trong `invalidEmployees` |

> ⚠️ Đề yêu cầu trả **cả danh sách** id sai. Nếu `return` ngay khi gặp id sai đầu tiên thì
> response chỉ có 1 phần tử → lệch đáp án mẫu.

---

## 4. Ghi nhiều bản ghi cùng lúc

```js
const child = await Child.create({ proName, depId });

// insertMany: 1 lần ghi, trả về mảng document đã tạo (có _id)
const created = await Link.insertMany(list.map(e => ({
    proId: child._id,
    empId: new mongoose.Types.ObjectId(e.empId),   // ép kiểu cho khớp dữ liệu cũ trong DB
    workHours: e.workHours
})));
```

> ⚠️ **Không** gọi `create` trong vòng lặp — N bản ghi = N lần ghi DB.
> `insertMany` nhanh hơn và trả thẳng mảng kết quả để dùng cho response.

| Case | Kết quả |
|---|---|
| Mảng có phần tử | Tạo đủ N bản ghi |
| Mảng rỗng | `insertMany([])` chạy được, trả `[]` — nhưng nên `if` để response không có field thừa |
| Cần cả hai thành công hoặc cùng thất bại | Cần transaction — đề PE SDN302 chưa từng yêu cầu |

### Kiểu dữ liệu khi ghi

```js
empId: e.empId                                   // giữ nguyên string từ body
empId: new mongoose.Types.ObjectId(e.empId)      // ép thành ObjectId
```

Mở Compass xem dữ liệu cũ lưu kiểu gì rồi ghi **cùng kiểu**, nếu không các câu đọc dữ liệu sẽ không join được.

---

## 5. Chống trùng → 409 Conflict

```js
const taken = await Link.find({ showTimeId: showtimeId, status: { $ne: 'canceled' } }, 'seatId');
const booked = new Set(taken.map(t => t.seatId));

const conflict = seats.find(code => booked.has(code));
if (conflict) {
    return res.status(409).json({ error: `Seat ${conflict} already booked` });
}
```

| Case | Kết quả |
|---|---|
| Ghế còn trống | đi tiếp |
| Ghế có vé `paid` / `booked` | 409 |
| Ghế có vé `canceled` | **cho đặt** — nhớ `$ne: 'canceled'` |
| Gửi trùng ghế trong cùng request `["A1","A1"]` | Code trên **không bắt** — xem bên dưới |

Nếu muốn chặn trùng trong cùng một request:

```js
if (new Set(seats).size !== seats.length) {
    return res.status(400).json({ error: 'Duplicate seats in request' });
}
```

> Đề PE Spring 2026 **không** yêu cầu case này. Chỉ thêm khi đề ghi rõ.

### Trùng dữ liệu unique (email, mã số)

```js
if (await User.findOne({ email })) {
    return res.status(409).json({ error: 'Email already registered' });
}
```

---

## 6. Bảo vệ route

**Đề mẫu:** đọc `access_key` từ header. **Đề ghi rõ: không làm authorization → 0 điểm câu đó.**

```js
const requireCustomer = async (req, res, next) => {
    try {
        const accessKey = req.headers['access_key'];        // ⚠️ luôn viết thường
        if (!accessKey) {
            return res.status(403).json({ error: 'No access key' });
        }

        const user = await User.findOne({ access_key: accessKey });
        if (!user) {
            return res.status(403).json({ error: 'Invalid or unauthorized access key' });
        }
        if (user.role !== 'customer') {
            return res.status(403).json({ error: 'Customer access required' });
        }

        req.user = user;        // handler phía sau dùng req.user._id
        next();
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Gắn middleware vào giữa đường dẫn và handler
app.post('/api/tickets', requireCustomer, async (req, res) => { /* ... */ });
```

| Case | Header | Kết quả |
|---|---|---|
| Không gửi header | — | 403 `No access key` |
| Key không có trong DB | `access_key: nope` | 403 `Invalid or unauthorized access key` |
| Key của admin/staff | `access_key: admin_key_1` | 403 `Customer access required` |
| Key của customer | `access_key: cust_key_a` | đi tiếp |

> ⚠️ Đề dùng **403 cho cả ba** trường hợp, kể cả case thiếu key (chuẩn REST là 401).
> **Theo đề, đừng theo chuẩn.**
> ⚠️ Đừng lấy `userId` từ body — phải lấy từ `req.user._id` mà middleware đã gán,
> nếu không ai cũng đặt vé hộ người khác được.

---

## 7. Tính toán ở server

**Đề mẫu:** "VIP seats cost 20% more than base price. Calculate totalAmount on server side."

```js
const room = await Side.findById(showtime.roomId);
const seatTypes = new Map(room.seats.map(s => [s._id, s.type]));   // "A1" -> "VIP"

// Ghế không thuộc phòng này -> 400
const unknown = seats.find(code => !seatTypes.has(code));
if (unknown) {
    return res.status(400).json({ error: `Seat ${unknown} does not belong to the room` });
}

const created = await Ticket.insertMany(seats.map(code => ({
    showTimeId: showtime._id,
    seatId: code,
    userId: req.user._id,
    price: seatTypes.get(code) === 'VIP' ? showtime.price * 1.2 : showtime.price,
    status: 'booked',
    bookedAt: new Date().toISOString(),
    paymentMethod: null
})));

return res.status(201).json({
    message: 'Tickets created',
    count: created.length,
    totalAmount: created.reduce((sum, t) => sum + t.price, 0)   // tính lại từ dữ liệu đã ghi
});
```

| Case | Kết quả |
|---|---|
| 2 ghế VIP, giá gốc 80000 | `80000 × 1.2 × 2 = 192000` |
| Trộn VIP và NORMAL | Cộng từng ghế theo loại của nó |
| Ghế không có trong phòng | 400 |

> ⚠️ **Không bao giờ** lấy `price` hay `totalAmount` từ `req.body` — client sửa được.
> Luôn đọc giá từ DB rồi tính lại.

---

## Hình dạng response 201

Đề vẽ sao thì trả đúng vậy, kể cả khi thấy "thừa":

```js
// Dạng 1 — chỉ có thống kê
{ "message": "Tickets created", "count": 2, "totalAmount": 192000 }

// Dạng 2 — có bản ghi vừa tạo
{ "message": "Project created successfully",
  "newProject": { "projectId": "...", "projectName": "..." } }

// Dạng 3 — có cả mảng bản ghi con
{ "message": "Project created successfully",
  "newProject": { "projectId": "...", "projectName": "...",
                  "worksOns": [ { "_id": "...", "proId": "...", "empId": "...", "workHours": 20 } ] } }
```

> ⚠️ Đáp án mẫu của đề **không có** field `__v`. Nếu trả thẳng document Mongoose ra
> thì `__v` sẽ lòi ra → thêm `{ versionKey: false }` khi khai schema.

---

## Checklist câu POST

- [ ] Có `app.use(express.json())` ở đầu file chưa?
- [ ] Thứ tự kiểm tra: auth → thiếu field → id sai → 404 → nghiệp vụ → ghi?
- [ ] Trả **201** chứ không phải 200?
- [ ] Mảng id sai trả **đủ cả danh sách**, không chỉ cái đầu tiên?
- [ ] Tiền/tổng tính ở server, không lấy từ body?
- [ ] `userId` lấy từ `req.user`, không lấy từ body?
- [ ] Response không có `__v` thừa?
- [ ] Đã xoá dữ liệu rác do test tạo ra trước khi nộp?
