# PATCH — Sửa một phần

> Status hợp lệ: **200**, **400**, **404**, **409**.
> Dạng hay ra nhất trong đề: **đổi trạng thái có ràng buộc** (huỷ vé, duyệt đơn, thanh toán).

## Bảng case

| # | Đề viết gì | Trả về | Mục |
|---|---|---|---|
| 1 | "Update only the provided fields" | 200 \| 400 \| 404 | [Sửa field lẻ](#1-sửa-field-lẻ) |
| 2 | "Cancel a ticket", "Confirm", "Approve" | 200 \| 400 \| 409 | [Đổi trạng thái](#2-đổi-trạng-thái-có-ràng-buộc) |
| 3 | "Cannot cancel after showtime started" | 409 | [Ràng buộc theo thời gian](#3-ràng-buộc-theo-thời-gian) |
| 4 | "Add/remove an employee from project" | 200 \| 409 | [Sửa phần tử trong mảng](#4-thêm--bớt-phần-tử-trong-mảng) |

---

## 1. Sửa field lẻ

Khác PUT ở chỗ: **chỉ ghi những field client thực sự gửi**.

```js
app.patch('/api/children/:childId', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });
        }

        // Chỉ nhặt field có mặt trong body. Dùng !== undefined để KHÔNG bỏ sót giá trị 0 hoặc ""
        const updates = {};
        if (req.body.proName !== undefined) updates.proName = req.body.proName;
        if (req.body.price !== undefined) updates.price = req.body.price;

        if (!Object.keys(updates).length) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const updated = await Child.findByIdAndUpdate(childId, updates, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({ error: `Project with _id='${childId}' not found` });
        }

        return res.status(200).json({ message: 'Updated successfully', project: updated });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Body | Kết quả |
|---|---|---|
| Sửa 1 field | `{"price":120}` | 200, `proName` **giữ nguyên** |
| Sửa nhiều field | `{"proName":"X","price":120}` | 200, đổi cả hai |
| Body rỗng | `{}` | 400 `No valid fields to update` |
| Chỉ có field lạ | `{"hacker":1}` | 400 — field lạ bị bỏ qua, `updates` rỗng |
| `price: 0` | `{"price":0}` | 200 — **phải ghi được**, nhờ `!== undefined` |

> ⚠️ Viết `if (req.body.price)` thay vì `!== undefined` sẽ làm **mất** các giá trị
> `0`, `""`, `false` — client gửi `price: 0` mà không được ghi.

> ⚠️ **Đừng** viết `findByIdAndUpdate(id, req.body)` — client gửi field gì cũng ghi được,
> kể cả `role: "admin"` hay `_id`. Luôn nhặt từng field.

---

## 2. Đổi trạng thái có ràng buộc

Đây là dạng hay ra nhất. Khai **bảng chuyển trạng thái** rồi tra, đừng viết chuỗi `if`.

```js
// Từ trạng thái nào -> được phép sang những trạng thái nào
const ALLOWED_FLOW = {
    booked:   ['paid', 'canceled'],
    paid:     ['canceled'],
    canceled: []                       // trạng thái cuối, không đi đâu được nữa
};

app.patch('/api/tickets/:ticketId/status', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${ticketId}` });
        }
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        // Phải đọc trạng thái CŨ trước khi quyết định -> dùng findById, không dùng findByIdAndUpdate
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ error: `Ticket with _id='${ticketId}' not found` });
        }

        const allowed = ALLOWED_FLOW[ticket.status] || [];
        if (!allowed.includes(status)) {
            return res.status(409).json({ error: `Cannot change status from ${ticket.status} to ${status}` });
        }

        ticket.status = status;
        await ticket.save();

        return res.status(200).json({ message: 'Status updated', ticket });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Từ → đến | Kết quả |
|---|---|---|
| Thanh toán | `booked` → `paid` | 200 |
| Huỷ vé chưa trả tiền | `booked` → `canceled` | 200 |
| Huỷ vé đã trả tiền | `paid` → `canceled` | 200 |
| Quay ngược | `paid` → `booked` | 409 |
| Đụng vào vé đã huỷ | `canceled` → bất kỳ | 409 |
| Đặt lại chính nó | `paid` → `paid` | 409 (không có trong mảng) |
| Trạng thái không tồn tại | → `"abc"` | 409 |
| Thiếu `status` trong body | `{}` | 400 |

> ⚠️ `ALLOWED_FLOW[ticket.status]` trả `undefined` nếu dữ liệu trong DB có trạng thái lạ
> → `.includes` sẽ crash. Luôn có `|| []` phía sau.

> ⚠️ Nếu đề yêu cầu `paid → paid` trả 200 (idempotent) thì thêm `status` vào chính mảng của nó.
> **Đọc kỹ đề**, mặc định ở đây là chặn.

---

## 3. Ràng buộc theo thời gian

**Đề mẫu:** "Cannot cancel a ticket after the showtime has started."

```js
const showtime = await Showtime.findById(ticket.showTimeId);

// startTime trong DB là chuỗi ISO -> new Date() để so sánh
if (showtime && new Date(showtime.startTime) <= new Date()) {
    return res.status(409).json({ error: 'Cannot cancel after showtime has started' });
}
```

| Case | Kết quả |
|---|---|
| Suất chiếu trong tương lai | Cho huỷ |
| Suất chiếu đã qua | 409 |
| Đúng thời điểm bắt đầu | 409 (dùng `<=`) |
| Không tìm thấy suất chiếu | Cho đi tiếp (hoặc 404 — tuỳ đề) |

> Dữ liệu đề thường có mốc thời gian ở **tương lai** (2026-03-10). Khi test ngày hôm nay,
> mọi suất chiếu đều "chưa bắt đầu" → muốn test case 409 phải tự sửa `startTime` về quá khứ trong Compass.

---

## 4. Thêm / bớt phần tử trong mảng

```js
// Thêm, không cho trùng
await Child.findByIdAndUpdate(childId, { $addToSet: { location: { locId } } }, { new: true });

// Thêm, cho phép trùng
await Child.findByIdAndUpdate(childId, { $push: { location: { locId } } }, { new: true });

// Xoá phần tử khớp điều kiện
await Child.findByIdAndUpdate(childId, { $pull: { location: { locId } } }, { new: true });
```

| Toán tử | Công dụng |
|---|---|
| `$push` | Thêm, cho phép trùng |
| `$addToSet` | Thêm, **bỏ qua nếu đã có** |
| `$pull` | Xoá mọi phần tử khớp điều kiện |
| `$pop` | Xoá phần tử đầu (`-1`) hoặc cuối (`1`) |

Với bảng trung gian (worksOns, tickets) thì **không** sửa mảng — thêm/xoá document:

```js
// Thêm nhân viên vào dự án
if (await Link.findOne({ proId, empId })) {
    return res.status(409).json({ error: 'Employee already assigned to this project' });
}
await Link.create({ proId, empId, workHours });

// Bỏ nhân viên khỏi dự án
const removed = await Link.findOneAndDelete({ proId, empId });
if (!removed) {
    return res.status(404).json({ error: 'Assignment not found' });
}
```

---

## 5. Sửa một phần tử cụ thể bên trong mảng

Dùng toán tử vị trí `$` — nó trỏ tới phần tử **đầu tiên khớp với điều kiện ở phần filter**.

```js
app.patch('/api/rooms/:roomId/seats/:code', async (req, res) => {
    try {
        const { roomId, code } = req.params;
        const { type } = req.body;

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${roomId}` });
        }
        if (!type) {
            return res.status(400).json({ error: 'type is required' });
        }

        // ⚠️ BẮT BUỘC có 'seats._id' trong filter, nếu không Mongo báo lỗi
        //    "The positional operator did not find the match needed"
        const result = await Room.updateOne(
            { _id: roomId, 'seats._id': code },
            { $set: { 'seats.$.type': type } }
        );

        // matchedCount = 0: không có room đó, HOẶC room có nhưng không có mã ghế đó
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: `Seat ${code} not found in room ${roomId}` });
        }

        const room = await Room.findById(roomId);
        return res.status(200).json({ message: 'Updated successfully', seats: room.seats });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

Sửa **tất cả** phần tử khớp điều kiện thì dùng `arrayFilters`:

```js
await Room.updateOne(
    { _id: roomId },
    { $set: { 'seats.$[el].type': 'NORMAL' } },
    { arrayFilters: [{ 'el.type': 'VIP' }] }      // mọi ghế VIP -> NORMAL
);
```

| # | Case | Kết quả | Đã test |
|---|---|---|---|
| 1 | Room và mã ghế đều tồn tại | 200, chỉ ghế đó đổi | ✅ |
| 2 | Mã ghế không có trong room | 404 | ✅ |
| 3 | Room không tồn tại | 404 (cùng nhánh `matchedCount === 0`) | |
| 4 | Thiếu `type` trong body | 400 | ✅ |
| 5 | Quên `'seats._id'` trong filter | Mongo ném lỗi → 500 | |

> ⚠️ `updateOne` trả `{ matchedCount, modifiedCount }`, **không** trả document.
> Muốn trả dữ liệu mới thì query lại, hoặc dùng `findOneAndUpdate(..., { new: true })`.

> ⚠️ `modifiedCount === 0` **không** có nghĩa là thất bại — gán đúng giá trị đang có
> thì Mongo không ghi gì. Kiểm tra 404 bằng `matchedCount`, không phải `modifiedCount`.

---

## 6. Tăng / giảm số lượng tồn

**Mẹo quan trọng:** đặt điều kiện "còn đủ" **ngay trong filter**. Nếu không đủ thì không
document nào khớp → trả `null` → 409. Cách này đúng cả khi 2 request chạy cùng lúc.

```js
app.patch('/api/rooms/:roomId/capacity', async (req, res) => {
    try {
        const { roomId } = req.params;
        const amount = Number(req.body.amount);        // âm = giảm, dương = tăng

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${roomId}` });
        }
        // ⚠️ Number.isFinite, KHÔNG dùng !amount — vì !0 là true
        if (!Number.isFinite(amount) || amount === 0) {
            return res.status(400).json({ error: 'amount must be a non-zero number' });
        }

        const filter = amount < 0
            ? { _id: roomId, capacity: { $gte: -amount } }    // chỉ khớp khi còn đủ
            : { _id: roomId };

        const updated = await Room.findOneAndUpdate(filter, { $inc: { capacity: amount } }, { new: true });

        if (!updated) {
            // Phân biệt "không tồn tại" với "không đủ chỗ"
            const exists = await Room.findById(roomId);
            return exists
                ? res.status(409).json({ error: `Not enough capacity, only ${exists.capacity} left` })
                : res.status(404).json({ error: `Room with _id='${roomId}' not found` });
        }

        return res.status(200).json({ message: 'Capacity updated', capacity: updated.capacity });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| # | Case (capacity = 3) | `amount` | Kết quả | Đã test |
|---|---|---|---|---|
| 1 | Giảm vừa đủ | `-2` | 200, còn 1 | ✅ |
| 2 | Giảm quá số còn lại | `-5` | 409 `only 1 left` | ✅ |
| 3 | Tăng | `+10` | 200, thành 13 | |
| 4 | `amount = 0` | `0` | 400 | ✅ |
| 5 | `amount` không phải số | `"abc"` | 400 | |
| 6 | Room không tồn tại | `-1` | 404 | |

> ⚠️ Nếu viết `const c = room.capacity - n; room.capacity = c; await room.save();`
> thì hai request đồng thời cùng đọc giá trị cũ → trừ sai. `$inc` + điều kiện trong filter
> tránh được chuyện đó.

---

## Bẫy hay gặp

| Bẫy | Hiện tượng | Cách xử lý |
|---|---|---|
| `if (req.body.x)` thay vì `!== undefined` | Gửi `0` / `""` / `false` không ghi được | Dùng `!== undefined` |
| `findByIdAndUpdate(id, req.body)` | Client ghi được mọi field, kể cả `role` | Nhặt từng field vào object `updates` |
| Dùng `findByIdAndUpdate` cho đổi trạng thái | Không đọc được trạng thái cũ để kiểm tra | `findById` → kiểm tra → `.save()` |
| Thiếu `|| []` khi tra bảng flow | Crash nếu DB có trạng thái lạ | `(ALLOWED_FLOW[x] \|\| [])` |
| Quên `new: true` | Response hiện dữ liệu cũ | Thêm option |
| Trả 400 cho chuyển trạng thái sai | Lệch đáp án | Đề thường muốn **409**, đọc kỹ |

---

## Checklist câu PATCH

- [ ] Chỉ ghi field có trong body, dùng `!== undefined`?
- [ ] Không truyền thẳng `req.body` vào update?
- [ ] Đổi trạng thái: đã `findById` để đọc trạng thái cũ trước khi quyết định?
- [ ] Bảng `ALLOWED_FLOW` có `|| []` chống trạng thái lạ?
- [ ] Status code cho chuyển trạng thái sai: đề muốn **409** hay 400?
- [ ] Có `{ new: true }`?
