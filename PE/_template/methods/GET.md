# GET — Lấy dữ liệu

> GET **không bao giờ** làm thay đổi DB. Status hợp lệ: **200**, **400**, **404**.
> Không bao giờ trả 201 hay 204.

## Bảng case

| # | Đề viết gì | Trả về | Dạng |
|---|---|---|---|
| 1 | "Retrieve the list of..." | 200 `[]` | [Danh sách đơn giản](#1-danh-sách-đơn-giản) |
| 2 | "Use query param for filtering" / `?status=X` | 200 `[]` \| 400 | [Lọc theo query](#2-lọc-theo-query-param) |
| 3 | "Validate ObjectId", "Return 404 if not found" | 200 `{}` \| 400 \| 404 | [Chi tiết theo :id](#3-chi-tiết-theo-id--populate) |
| 4 | "showtimes of a movie", "Include room name" | 200 `[]` \| 400 \| 404 | [Danh sách con](#4-danh-sách-con-của-một-bản-ghi-cha) |
| 5 | "employees of a project together with work hours" | 200 `{}` \| 400 \| 404 | [Qua bảng trung gian](#5-qua-bảng-trung-gian-n-n) |
| 6 | "seat availability", "BOOKED / AVAILABLE" | 200 `[]` \| 400 \| 404 | [Trạng thái mảng lồng](#6-trạng-thái-từng-phần-tử-mảng-lồng) |
| 7 | "Use Aggregation Pipeline", "total", "Group by" | 200 `[]` | [Báo cáo thống kê](#7-báo-cáo-bằng-aggregation) |
| 8 | "page", "limit", "sort", "search" | 200 `{}` | [Phân trang](#8-phân-trang--sắp-xếp--tìm-kiếm) |

---

## 1. Danh sách đơn giản

```js
app.get('/api/parents', async (req, res) => {
    try {
        const docs = await Parent.find();
        return res.status(200).json(docs);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

**Danh sách rỗng trả gì?** → `200` với mảng `[]`. **Không phải 404.**
404 chỉ dùng khi *bản thân tài nguyên trong URL* không tồn tại.

---

## 2. Lọc theo query param

**Đề mẫu:** `GET /api/movies?status=NOW_SHOWING` — 400 nếu status sai **hoặc thiếu**.

```js
const VALID_STATUSES = ['NOW_SHOWING', 'STOPPED'];   // ⚠️ ĐỔI theo đề

app.get('/api/parents', async (req, res) => {
    try {
        const { status } = req.query;

        // includes() bắt luôn trường hợp THIẾU param, vì undefined không nằm trong mảng
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}` });
        }

        const docs = await Parent.find({ status });

        // map() để đổi tên field đúng như đề yêu cầu
        return res.status(200).json(docs.map(d => ({
            id: d._id,                  // _id -> id
            title: d.title,
            duration: d.duration,
            genre: d.genre
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Request | Kết quả |
|---|---|---|
| Hợp lệ | `?status=NOW_SHOWING` | 200, mảng đã lọc |
| Sai giá trị | `?status=SHOWING_ABC` | 400 `{"error":"Invalid status: SHOWING_ABC"}` |
| Thiếu param | không có `?status` | 400 `{"error":"Invalid status: undefined"}` |
| Hợp lệ, không có dữ liệu | `?status=STOPPED` | 200 `[]` |

**Lọc nhiều điều kiện cùng lúc** — chỉ thêm vào object filter khi param có mặt:

```js
const filter = {};
if (req.query.status) filter.status = req.query.status;
if (req.query.genre) filter.genre = req.query.genre;         // khớp 1 phần tử trong mảng
if (req.query.minPrice) filter.price = { $gte: Number(req.query.minPrice) };
const docs = await Child.find(filter);
```

---

## 3. Chi tiết theo :id + populate

**Đề mẫu:** `GET /api/projects/department/:depId`

```js
app.get('/api/parents/:parentId', async (req, res) => {
    try {
        const { parentId } = req.params;

        // B1. Validate định dạng -> 400.  BẮT BUỘC, nếu không findById sẽ ném CastError -> 500
        if (!mongoose.Types.ObjectId.isValid(parentId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${parentId}` });
        }

        // B2. Tồn tại không -> 404
        const parent = await Parent.findById(parentId).populate('managerId', 'empName');
        if (!parent) {
            return res.status(404).json({ error: `Department with _id='${parentId}' not found` });
        }

        const children = await Child.find({ parentId });

        return res.status(200).json({
            depName: parent.depName,
            manager: parent.managerId ? parent.managerId.empName : null,   // tránh crash khi null
            projects: children.map(c => ({ proId: c._id, proName: c.proName }))
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Giá trị `:id` | Kết quả |
|---|---|---|
| Hợp lệ | `65a100000000000000000001` | 200 |
| Sai định dạng | `65a10000000000000000000X` (có ký tự không phải hex) | 400 |
| Quá ngắn | `65a1000000` | 400 |
| Đúng định dạng, không có trong DB | `65a100000000000000000004` | 404 |
| Có bản ghi nhưng `managerId` là `null` | — | 200, field `manager: null` (**không được crash**) |

### `.populate()` hoạt động khi nào

```js
.populate('managerId')              // lấy cả document
.populate('managerId', 'empName')   // chỉ lấy field empName
.populate('managerId', '-password') // lấy hết trừ password
```

> ⚠️ `populate` **chỉ chạy khi hai bên cùng kiểu `ObjectId`**.
> Nếu khoá ngoại trong DB lưu dạng **string**, populate trả về `null` âm thầm — không báo lỗi.
> Gặp trường hợp đó thì join tay như [case 5](#5-qua-bảng-trung-gian-n-n).

---

## 4. Danh sách con của một bản ghi cha

**Đề mẫu:** `GET /api/movies/:movieId/showtimes` — kèm `roomName` lấy từ bảng rooms.

```js
app.get('/api/parents/:parentId/children', async (req, res) => {
    try {
        const { parentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(parentId)) {
            return res.status(400).json({ error: `Invalid movieId: ${parentId}` });
        }

        // Vẫn phải kiểm tra CHA tồn tại, dù chỉ trả về danh sách con
        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(404).json({ error: `Movie with id = ${parentId} not found` });
        }

        const children = await Child.find({ movieId: parentId }).populate('roomId', 'roomName');

        return res.status(200).json(children.map(c => ({
            id: c._id,
            roomName: c.roomId ? c.roomId.roomName : null,
            startTime: c.startTime,
            endTime: c.endTime,
            price: c.price
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Kết quả |
|---|---|
| Movie tồn tại, có showtimes | 200, mảng |
| Movie tồn tại, **chưa có** showtime nào | 200 `[]` — **không phải 404** |
| Movie không tồn tại | 404 |
| `:movieId` sai định dạng | 400 |

> ⚠️ Phân biệt rõ: **cha không tồn tại → 404**, **cha tồn tại nhưng không có con → 200 `[]`**.

---

## 5. Qua bảng trung gian (n-n)

**Đề mẫu:** `GET /api/projects/:proId/employees` — lấy nhân viên qua bảng `worksOns`.

Không dùng `populate` ở đây vì khoá ngoại có thể lưu dạng string.
Cách an toàn: **lấy bảng trung gian → gom id → query 1 lần → map lại**.

```js
const idForms = id => [id, new mongoose.Types.ObjectId(id)];   // khớp cả string lẫn ObjectId

app.get('/api/children/:childId/users', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });
        }

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ error: `Project with _id='${childId}' not found` });
        }

        const links = await Link.find({ proId: { $in: idForms(childId) } });
        const users = await User.find({ _id: { $in: links.map(l => l.empId) } });   // 1 query, không lặp
        const byId = new Map(users.map(u => [String(u._id), u]));                   // tra cứu O(1)

        return res.status(200).json({
            project: child.proName,
            // map theo LINKS để giữ đúng thứ tự bản ghi trong bảng trung gian
            employees: links.map(l => {
                const u = byId.get(String(l.empId));
                return u && { empName: u.empName, empSalary: u.empSalary, workHours: l.workHours };
            }).filter(Boolean)     // bỏ bản ghi trỏ tới user đã bị xoá
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Kết quả |
|---|---|
| Có bản ghi trong bảng trung gian | 200, đúng thứ tự bảng trung gian |
| Project tồn tại, chưa ai tham gia | 200, `employees: []` |
| Bản ghi trỏ tới user đã bị xoá | Bỏ qua phần tử đó, không crash |
| Project không tồn tại | 404 |

> ⚠️ **Tuyệt đối không** `await` bên trong `.map()` / vòng lặp. N bản ghi = N query, rất chậm,
> và `.map(async ...)` trả về mảng Promise chứ không phải mảng dữ liệu.

---

## 6. Trạng thái từng phần tử mảng lồng

**Đề mẫu:** `GET /api/showtimes/:showtimeId/seats` — BOOKED nếu có vé (status ≠ canceled).

```js
app.get('/api/children/:childId/seats', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ error: `Invalid showtimeId: ${childId}` });
        }

        const showtime = await Child.findById(childId);
        if (!showtime) {
            return res.status(404).json({ error: `Showtime with Id: ${childId} not found` });
        }

        const room = await Side.findById(showtime.roomId);              // mảng ghế gốc

        // ⚠️ $ne: 'canceled' — vé đã huỷ KHÔNG tính là đã đặt
        const taken = await Link.find({ showTimeId: childId, status: { $ne: 'canceled' } }, 'seatId');
        const booked = new Set(taken.map(t => t.seatId));               // tra cứu O(1)

        return res.status(200).json((room ? room.seats : []).map(s => ({
            code: s._id,
            type: s.type,
            status: booked.has(s._id) ? 'BOOKED' : 'AVAILABLE'
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Kết quả |
|---|---|
| Ghế có vé `paid` hoặc `booked` | `BOOKED` |
| Ghế có vé `canceled` | `AVAILABLE` ← **bẫy, hay quên `$ne`** |
| Ghế chưa có vé nào | `AVAILABLE` |
| Showtime không tồn tại | 404 |

> ⚠️ **Bẫy schema:** nếu phần tử mảng có key tên là `type` (vd `{ _id: "A1", type: "VIP" }`)
> thì **không** khai `seats: [{ _id: String, type: String }]` — Mongoose hiểu `type` là khai báo
> kiểu cho cả object, đọc ra toàn `undefined`. Dùng `seats: [mongoose.Schema.Types.Mixed]`.

---

## 7. Báo cáo bằng Aggregation

**Đề mẫu:** `GET /api/reports/projects/work-hours`

6 bước: `$group` → `$lookup` → `$unwind` → `$lookup` → `$sort` → `$project`

```js
app.get('/api/reports/children/summary', async (req, res) => {
    try {
        const report = await Link.aggregate([
            // B1. Gom nhóm. $addToSet để đếm KHÔNG TRÙNG (an toàn hơn $sum: 1)
            {
                $group: {
                    _id: '$proId',
                    totalWorkHours: { $sum: '$workHours' },
                    empIds: { $addToSet: '$empId' }
                }
            },

            // B2. Join sang projects.
            // $toObjectId để khớp cả khi khoá ngoại lưu dạng string
            {
                $lookup: {
                    from: 'projects',                 // ⚠️ TÊN COLLECTION, không phải tên model
                    let: { pid: { $toObjectId: '$_id' } },
                    pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }],
                    as: 'project'
                }
            },
            { $unwind: '$project' },                  // mảng 1 phần tử -> object

            // B3. Hai bên đều ObjectId thì dùng dạng ngắn
            { $lookup: { from: 'departments', localField: 'project.depId', foreignField: '_id', as: 'department' } },
            { $unwind: '$department' },

            // B4. Thứ tự — xem đáp án mẫu của đề để chọn 1 (tăng) hay -1 (giảm)
            { $sort: { totalWorkHours: -1 } },

            // B5. Chọn + đổi tên field
            {
                $project: {
                    _id: 0,
                    totalWorkHours: 1,
                    totalEmployees: { $size: '$empIds' },
                    projectName: '$project.proName',
                    departmentName: '$department.depName'
                }
            }
        ]);

        return res.status(200).json(report);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

### Toán tử hay dùng

| Toán tử | Công dụng |
|---|---|
| `$sum: '$field'` | Cộng tổng giá trị |
| `$sum: 1` | Đếm số bản ghi (tính cả trùng) |
| `$addToSet` + `$size` | Đếm **không trùng** — an toàn hơn |
| `$avg` `$min` `$max` | Trung bình / nhỏ nhất / lớn nhất |
| `$unwind` | Tách mảng thành nhiều document |
| `$match` | Lọc — đặt **sớm nhất có thể** cho nhanh |
| `$toObjectId` | Ép string thành ObjectId để join được |

| Case | Kết quả |
|---|---|
| Pipeline trả mảng rỗng dù Compass có dữ liệu | Sai tên collection trong `from`, hoặc lệch kiểu id → thêm `$toObjectId` |
| Project không có bản ghi nào trong bảng trung gian | **Không xuất hiện** trong báo cáo (vì `$group` chạy trên bảng trung gian) |
| Cần cả project chưa ai làm | Đổi `$unwind` thành `{ $unwind: { path: '$project', preserveNullAndEmptyArrays: true } }` |

---

## 8. Phân trang / sắp xếp / tìm kiếm

```js
app.get('/api/children-search', async (req, res) => {
    try {
        const { q, sort, minPrice, maxPrice } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);     // chặn page = 0 hoặc âm
        const limit = Math.max(1, parseInt(req.query.limit) || 10);

        const filter = {};
        if (q) filter.title = { $regex: q, $options: 'i' };          // 'i' = không phân biệt hoa thường
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const total = await Child.countDocuments(filter);
        const data = await Child.find(filter)
            .sort(sort || '-_id')          // '-price' giảm dần | 'price' tăng dần
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({ page, limit, total, totalPages: Math.ceil(total / limit), data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Request | Kết quả |
|---|---|---|
| Mặc định | không param | page 1, limit 10 |
| `page=0` hoặc âm | `?page=-5` | ép về 1 |
| `page` vượt quá số trang | `?page=999` | 200, `data: []` |
| `limit` không phải số | `?limit=abc` | `parseInt` ra `NaN` → `|| 10` → về mặc định |

---

## Checklist trước khi sang câu khác

- [ ] Có `isValid()` trước mọi `findById` chưa? (thiếu → CastError → 500 thay vì 400)
- [ ] Tên field output **đúng chính tả** như đáp án mẫu? (`id` hay `_id`, `proId` hay `projectId`)
- [ ] Message lỗi copy **từng dấu câu** từ đề?
- [ ] Có field thừa `__v` trong response không? → thêm `{ versionKey: false }` vào schema
- [ ] Danh sách rỗng trả `200 []`, không phải 404?
