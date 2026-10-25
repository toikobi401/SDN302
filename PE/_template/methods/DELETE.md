# DELETE — Xoá bản ghi

> Status hợp lệ: **200** (có body) hoặc **204** (không body), **400**, **404**, **409**.

## 200 hay 204?

| | 200 OK | 204 No Content |
|---|---|---|
| Body | Có, vd `{ "message": "Deleted successfully" }` | **Rỗng tuyệt đối** |
| Dùng khi | Đề vẽ sẵn một response mẫu | Đề ghi rõ "204" hoặc "no content" |
| Cú pháp | `res.status(200).json({...})` | `res.status(204).send()` |

**Đề vẽ response mẫu thì dùng 200. Không nói gì thì 200 an toàn hơn.**

> ⚠️ `res.status(204).json({ message: '...' })` là **sai** — 204 nghĩa là không có body.
> Nhiều client sẽ lỗi khi cố đọc body của response 204.

## Bảng case

| # | Đề viết gì | Trả về | Mục |
|---|---|---|---|
| 1 | "Delete a..." | 200/204 \| 400 \| 404 | [Xoá cơ bản](#1-xoá-cơ-bản) |
| 2 | "Cannot delete if it has projects" | 409 | [Chặn khi còn ràng buộc](#2-chặn-xoá-khi-còn-ràng-buộc) |
| 3 | "Also delete related worksOns" | 200 | [Xoá lan](#3-xoá-lan-cascade) |
| 4 | "Mark as deleted", "isDeleted" | 200 | [Xoá mềm](#4-xoá-mềm-soft-delete) |
| 5 | "Only admin can delete" | 403 | [Giới hạn quyền](#5-giới-hạn-quyền) |

---

## 1. Xoá cơ bản

```js
app.delete('/api/children/:childId', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });
        }

        // findByIdAndDelete trả về document vừa xoá, hoặc null nếu không tìm thấy
        const deleted = await Child.findByIdAndDelete(childId);
        if (!deleted) {
            return res.status(404).json({ error: `Project with _id='${childId}' not found` });
        }

        return res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Kết quả |
|---|---|
| Id hợp lệ, có trong DB | 200 |
| Id sai định dạng | 400 |
| Id đúng định dạng, không có trong DB | 404 |
| Xoá lại lần 2 cùng id | 404 (lần đầu đã xoá rồi) |

### Các hàm xoá

```js
Child.findByIdAndDelete(id)             // xoá 1 theo _id, trả về document đã xoá hoặc null
Child.findOneAndDelete({ proName: 'X' }) // xoá 1 theo điều kiện
Child.deleteOne({ _id: id })            // trả { deletedCount: 0|1 }, KHÔNG trả document
Child.deleteMany({ depId })             // xoá nhiều, trả { deletedCount: n }
```

Nếu dùng `deleteOne` / `deleteMany` thì kiểm tra 404 bằng `deletedCount`:

```js
const result = await Child.deleteOne({ _id: childId });
if (result.deletedCount === 0) {
    return res.status(404).json({ error: `Project with _id='${childId}' not found` });
}
```

> ⚠️ `deleteMany({})` với điều kiện rỗng sẽ **xoá sạch collection**. Luôn kiểm tra lại
> biến điều kiện có `undefined` không trước khi chạy.

---

## 2. Chặn xoá khi còn ràng buộc

**Đề mẫu:** "Cannot delete a department that still has projects."

```js
const child = await Child.findById(childId);
if (!child) {
    return res.status(404).json({ error: `Project with _id='${childId}' not found` });
}

// Đếm bản ghi còn tham chiếu tới. countDocuments nhanh hơn find().length
const linked = await Link.countDocuments({ proId: { $in: idForms(childId) } });
if (linked > 0) {
    return res.status(409).json({ error: `Cannot delete: ${linked} related records exist` });
}

await Child.findByIdAndDelete(childId);
return res.status(200).json({ message: 'Deleted successfully' });
```

| Case | Kết quả |
|---|---|
| Không còn bản ghi liên quan | 200, xoá thành công |
| Còn bản ghi liên quan | 409, **không xoá gì cả** |
| Bản ghi không tồn tại | 404 |

> ⚠️ Phải kiểm tra **404 trước, 409 sau**. Đảo thứ tự thì bản ghi không tồn tại
> cũng trả 409 (vì `countDocuments` ra 0 → lọt qua → mới phát hiện không tồn tại).

> ⚠️ Dùng `countDocuments`, đừng dùng `find().length` — không cần tải dữ liệu về chỉ để đếm.

---

## 3. Xoá lan (cascade)

**Đề mẫu:** "Delete the project and all its worksOns records."

```js
const child = await Child.findById(childId);
if (!child) {
    return res.status(404).json({ error: `Project with _id='${childId}' not found` });
}

// Xoá con TRƯỚC, cha SAU — nếu xoá cha trước mà lỗi giữa chừng thì con thành dữ liệu mồ côi
const removed = await Link.deleteMany({ proId: { $in: idForms(childId) } });
await Child.findByIdAndDelete(childId);

return res.status(200).json({
    message: 'Deleted successfully',
    deletedRelated: removed.deletedCount
});
```

| Case | Kết quả |
|---|---|
| Có 3 bản ghi con | Xoá 3 con + 1 cha, `deletedRelated: 3` |
| Không có con | Xoá cha, `deletedRelated: 0` |
| Cha không tồn tại | 404, không xoá gì |

> MongoDB **không có** foreign key cascade như SQL. Phải tự xoá bằng tay.
> Chỉ làm khi đề yêu cầu rõ — nếu không, dùng [cách chặn 409](#2-chặn-xoá-khi-còn-ràng-buộc).

---

## 4. Xoá mềm (soft delete)

Không xoá thật, chỉ đánh dấu. Đề hay dùng từ "mark as deleted", "deactivate", "isDeleted".

```js
const updated = await Child.findByIdAndUpdate(
    childId,
    { isDeleted: true, deletedAt: new Date().toISOString() },
    { new: true }
);
if (!updated) {
    return res.status(404).json({ error: `Project with _id='${childId}' not found` });
}

return res.status(200).json({ message: 'Deleted successfully' });
```

> ⚠️ Dùng xoá mềm thì **mọi route GET** phải thêm `isDeleted: { $ne: true }` vào filter,
> nếu không bản ghi đã xoá vẫn hiện trong danh sách.

```js
const docs = await Child.find({ depId, isDeleted: { $ne: true } });
```

| Case | Kết quả |
|---|---|
| Xoá mềm | 200, document vẫn còn trong DB |
| GET danh sách sau khi xoá | Không thấy bản ghi đó |
| Xoá mềm lần 2 | 200 (idempotent) — hoặc 404 nếu đề muốn chặn |

---

## 5. Giới hạn quyền

```js
app.delete('/api/children/:childId', requireToken, requireRole('admin'), async (req, res) => {
    // ...
});
```

Hoặc chỉ cho xoá bản ghi của chính mình:

```js
const ticket = await Ticket.findById(ticketId);
if (!ticket) {
    return res.status(404).json({ error: `Ticket with _id='${ticketId}' not found` });
}

// So sánh ObjectId phải qua String(), không dùng ===
if (String(ticket.userId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'You can only delete your own tickets' });
}
```

| Case | Kết quả |
|---|---|
| Admin xoá bất kỳ | 200 |
| Customer xoá vé của mình | 200 |
| Customer xoá vé người khác | 403 |
| Không có token/key | 401 hoặc 403 — **theo đề** |

> ⚠️ `ticket.userId === req.user._id` luôn `false` vì đang so sánh hai **object** ObjectId.
> Phải bọc `String(...)` cả hai vế, hoặc dùng `.equals()`.

---

## Bẫy hay gặp

| Bẫy | Hiện tượng | Cách xử lý |
|---|---|---|
| Không kiểm tra `null` sau khi xoá | Luôn trả 200 kể cả id không tồn tại | `if (!deleted) return 404` |
| Kiểm tra 409 trước 404 | Id không tồn tại cũng trả 409 | 404 trước, 409 sau |
| `res.status(204).json({...})` | 204 không được có body | `res.status(204).send()` |
| So sánh ObjectId bằng `===` | Luôn `false`, chặn nhầm người dùng hợp lệ | `String(a) !== String(b)` |
| `deleteMany` với điều kiện `undefined` | **Xoá sạch collection** | Kiểm tra biến điều kiện trước |
| Quên `isValid` | 500 thay vì 400 | Kiểm tra trước `findByIdAndDelete` |

---

## Checklist câu DELETE

- [ ] `isValid()` trước khi xoá?
- [ ] Kiểm tra `null` / `deletedCount` để trả 404?
- [ ] Thứ tự: 400 → 404 → 409 → xoá?
- [ ] Đề muốn **chặn** (409) hay **xoá lan** (cascade)? Đọc kỹ, đừng tự ý cascade.
- [ ] Status code: 200 có body, hay 204 không body?
- [ ] Nếu so sánh chủ sở hữu, có bọc `String()` quanh ObjectId?
- [ ] **Sau khi test xong, dữ liệu đã xoá có cần import lại không?** Các câu khác có thể phụ thuộc vào nó.
