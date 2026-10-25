# PUT — Thay toàn bộ bản ghi

> Status hợp lệ: **200**, **400**, **404**, đôi khi **409**.
> Thành công trả **200** (không phải 201 — bản ghi đã có sẵn, không tạo mới).

## PUT hay PATCH?

| | PUT | PATCH |
|---|---|---|
| Ý nghĩa | Thay **toàn bộ** bản ghi | Sửa **một phần** |
| Body | Gửi **đủ** mọi field | Chỉ gửi field muốn đổi |
| Field không gửi | Bị ghi đè thành rỗng/mặc định | Giữ nguyên |
| Gọi lại nhiều lần | Kết quả như nhau (idempotent) | Tuỳ logic |
| Hay dùng cho | Sửa thông tin đầy đủ | Đổi trạng thái, duyệt, huỷ |

Đề cho đường dẫn nào thì làm theo đường dẫn đó, đừng tự đổi.

## Bảng case

| # | Đề viết gì | Trả về | Mục |
|---|---|---|---|
| 1 | "Update a...", "Modify" | 200 \| 400 \| 404 | [Cập nhật cơ bản](#1-cập-nhật-cơ-bản) |
| 2 | "Validate input before updating" | 400 | [Validate trước khi ghi](#2-validate-trước-khi-ghi) |
| 3 | "Department must exist" | 404 | [Kiểm tra khoá ngoại](#3-đổi-khoá-ngoại) |
| 4 | "Cannot update if already paid/canceled" | 409 | [Chặn theo trạng thái](#4-chặn-sửa-theo-trạng-thái) |

---

## 1. Cập nhật cơ bản

```js
app.put('/api/children/:childId', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });
        }

        const updated = await Child.findByIdAndUpdate(
            childId,
            { proName: req.body.proName, depId: req.body.depId },
            { new: true, runValidators: true }    // new: true -> trả về bản ghi SAU khi sửa
        );

        // findByIdAndUpdate trả null nếu không tìm thấy -> 404
        if (!updated) {
            return res.status(404).json({ error: `Project with _id='${childId}' not found` });
        }

        return res.status(200).json({ message: 'Updated successfully', project: updated });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Kết quả |
|---|---|
| Id hợp lệ, có trong DB | 200 + bản ghi mới |
| Id sai định dạng | 400 |
| Id đúng định dạng, không có trong DB | 404 |
| Body thiếu field | Field đó bị ghi `undefined` → **Mongoose bỏ qua, giữ giá trị cũ** |
| Body có field lạ | Mongoose bỏ qua (schema strict mặc định) |

### ⚠️ Ba option bắt buộc nhớ

```js
{ new: true }           // KHÔNG có -> trả về bản ghi CŨ (trước khi sửa). Lỗi hay gặp nhất.
{ runValidators: true } // KHÔNG có -> rule trong schema (required, enum, min) bị bỏ qua
{ overwrite: true }     // Thay TOÀN BỘ document, field không gửi sẽ BỊ XOÁ
```

> ⚠️ Mặc định `findByIdAndUpdate` trả về bản ghi **cũ**. Quên `new: true` thì response
> hiện dữ liệu trước khi sửa → nhìn như update không chạy, mất thời gian debug oan.

### Ba cách viết, chọn một

```js
// Cách 1 — ngắn gọn nhất, dùng khi không cần đọc giá trị cũ
const updated = await Child.findByIdAndUpdate(id, data, { new: true, runValidators: true });
if (!updated) return res.status(404).json({ error: '...' });

// Cách 2 — tìm trước, cần khi phải kiểm tra trạng thái cũ
const child = await Child.findById(id);
if (!child) return res.status(404).json({ error: '...' });
child.proName = req.body.proName;
await child.save();                       // save() luôn chạy validator

// Cách 3 — chỉ ghi những field client thực sự gửi
const updates = {};
if (req.body.proName !== undefined) updates.proName = req.body.proName;
if (req.body.price !== undefined) updates.price = req.body.price;
const updated = await Child.findByIdAndUpdate(id, updates, { new: true });
```

---

## 2. Validate trước khi ghi

```js
const { proName, price } = req.body;

if (!proName) {
    return res.status(400).json({ error: 'proName is required' });
}

// ⚠️ Số: dùng typeof, KHÔNG dùng !price — vì !0 là true, giá 0 hợp lệ sẽ bị báo thiếu
if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
}

// Giá trị trong danh sách cho phép
const VALID = ['NOW_SHOWING', 'STOPPED'];
if (status !== undefined && !VALID.includes(status)) {
    return res.status(400).json({ error: `Invalid status: ${status}` });
}
```

| Case | Body | Kết quả |
|---|---|---|
| Hợp lệ | `{"proName":"X","price":100}` | 200 |
| Thiếu field bắt buộc | `{"price":100}` | 400 |
| Sai kiểu | `{"price":"abc"}` | 400 |
| `price: 0` | `{"proName":"X","price":0}` | 200 — **hợp lệ**, đừng chặn nhầm |
| Sai enum | `{"status":"ABC"}` | 400 |

---

## 3. Đổi khoá ngoại

Khi PUT cho phép đổi `depId` / `roomId`, phải kiểm tra bản ghi đích có tồn tại:

```js
if (req.body.depId) {
    if (!mongoose.Types.ObjectId.isValid(req.body.depId)) {
        return res.status(400).json({ error: `Invalid ObjectId: ${req.body.depId}` });
    }
    if (!await Parent.findById(req.body.depId)) {
        return res.status(404).json({ error: `Department with _id='${req.body.depId}' not found` });
    }
}
```

| Case | Kết quả |
|---|---|
| `depId` mới tồn tại | 200 |
| `depId` mới không tồn tại | 404 |
| `depId` sai định dạng | 400 |
| Không gửi `depId` | Giữ nguyên, bỏ qua kiểm tra |

---

## 4. Chặn sửa theo trạng thái

**Đề mẫu:** "Cannot update a ticket that is already paid or canceled."

```js
const ticket = await Ticket.findById(ticketId);
if (!ticket) {
    return res.status(404).json({ error: `Ticket with _id='${ticketId}' not found` });
}

const LOCKED = ['paid', 'canceled'];
if (LOCKED.includes(ticket.status)) {
    return res.status(409).json({ error: `Cannot update ticket with status ${ticket.status}` });
}

ticket.seatId = req.body.seatId;
await ticket.save();

return res.status(200).json({ message: 'Updated successfully', ticket });
```

| Case | `status` hiện tại | Kết quả |
|---|---|---|
| Còn sửa được | `booked` | 200 |
| Đã thanh toán | `paid` | 409 |
| Đã huỷ | `canceled` | 409 |
| Không tồn tại | — | 404 |

> Phải dùng **cách 2** (findById rồi save) ở đây, vì cần đọc trạng thái **cũ** trước khi quyết định.

---

## Bẫy hay gặp

| Bẫy | Hiện tượng | Cách xử lý |
|---|---|---|
| Quên `new: true` | Response hiện dữ liệu cũ, tưởng update không chạy | Thêm `{ new: true }` |
| Quên `runValidators: true` | Ghi được giá trị sai enum / vi phạm `required` | Thêm option, hoặc dùng `.save()` |
| Quên `isValid` | 500 thay vì 400 khi id sai định dạng | Kiểm tra trước `findById` |
| Không check `null` sau update | Crash khi đọc `updated.proName` | `if (!updated) return 404` |
| Cho client gửi `_id` trong body | Thử đổi `_id` → MongoDB báo lỗi → 500 | Chỉ lấy đúng field cần từ `req.body` |
| Trả 201 | Sai status | PUT trả **200** |

---

## Checklist câu PUT

- [ ] `isValid()` trước `findByIdAndUpdate`?
- [ ] Có `{ new: true, runValidators: true }`?
- [ ] Kiểm tra `null` sau update để trả 404?
- [ ] Nếu body đổi khoá ngoại → đã kiểm tra bản ghi đích tồn tại?
- [ ] Chỉ lấy đúng field cần từ `req.body`, không `...req.body` cả cục?
- [ ] Trả **200**, không phải 201?
