# SDN302 — ĐỀ LUYỆN TẬP TỔNG HỢP

**Không giới hạn thời gian.** 10 câu, mỗi câu luyện một dạng khác nhau.
Mục tiêu là **quét hết các dạng có thể ra**, không phải mô phỏng áp lực phòng thi
(muốn luyện áp lực thì làm `DE_02_THITHU_80P`).

> ⚠️ Bộ dữ liệu này **cố ý cài 5 cái bẫy thật** đã từng làm mất điểm.
> Làm xong đọc mục "Bẫy đã cài" ở cuối để đối chiếu xem bạn dính mấy cái.

---

## Chuẩn bị

1. Tạo database **`SDN302_SU26_WarehouseDB`**, import 4 file trong `All/` vào đúng 4 collection
   (`categories`, `warehouses`, `products`, `stockmoves`).
2. `cd resource` → copy `node_modules` từ `PE/exam/SDN302_given/resource` sang (cùng bộ thư viện).
3. `npm start` → phải thấy `Đã kết nối CSDL` và `GET /api` trả `{"message":"Welcome Express server"}`.

Môi trường: **express 5 · mongoose 9** — giống hệt môi trường thi thật.

---

## Mô tả bài toán

**WAREHOUSE MANAGEMENT SYSTEM.** Một danh mục (`category`) có nhiều sản phẩm (`product`).
Mỗi kho (`warehouse`) chia thành nhiều khu (`zone`). Mỗi lần nhập/xuất hàng ghi lại
một bản ghi `stockmove` (sản phẩm nào, kho nào, số lượng bao nhiêu, nhập hay xuất).

```js
categories ({ categoryName, description })

warehouses ({ warehouseName, city,
              zones: [ { _id: "Z1", type: "COLD", capacity: 200 } ] })

products   ({ productName, price, unit, categoryId -> categories,
              specs: { type: "BOX", weight: 18.5 } })

stockmoves ({ productId -> products, warehouseId -> warehouses,
              quantity, moveType: "IN" | "OUT", movedAt: "2026-01-05" })
```

> **Trước khi viết schema: mở Compass soi một document của mỗi collection.**
> Dữ liệu thật không giống như bạn đoán đâu.

---

## PHẦN A — Đọc dữ liệu

### Câu 1 — Lọc bằng query param
`GET /api/products`

Danh sách sản phẩm, kèm **tên danh mục**. Lọc bằng `categoryId`, `keyword` (khớp gần đúng
tên sản phẩm, không phân biệt hoa thường), `minPrice`, `maxPrice`. Sắp xếp `price` giảm dần.

- `categoryId` sai định dạng → **400** `Invalid categoryId: <giá trị>`
- Không khớp gì → `[]` với **200**

```json
[ { "productName": "Laptop Pro 14", "price": 28000000, "unit": "chiec", "categoryName": "Electronics" } ]
```

> Câu hỏi tự kiểm: `?minPrice=abc` thì API của bạn trả 400 hay 500?

---

### Câu 2 — Chi tiết 1 bản ghi
`GET /api/products/:productId`

- Sai định dạng ObjectId → **400** `Invalid productId: <giá trị>`
- Không tồn tại → **404** `Product with id = <productId> not found`
- Trả về kèm `categoryName` và **toàn bộ** object `specs`

```json
{ "productName": "Smart TV 55 inch", "price": 12000000, "categoryName": "Electronics",
  "specs": { "type": "BOX", "weight": 18.5 } }
```

> ⚠️ Câu này có bẫy. Nếu `specs` trả về `null` / biến mất thì schema bạn khai sai.

---

### Câu 3 — Danh sách con của một bản ghi cha
`GET /api/categories/:categoryId/products`

```json
{ "categoryName": "Electronics", "totalProducts": 2,
  "products": [ { "productName": "Laptop Pro 14", "price": 28000000, "unit": "chiec" } ] }
```

- Không tồn tại category → **404** `Category with id = <categoryId> not found`
- Category **có thật nhưng không có sản phẩm nào** → **200**, `totalProducts: 0`, `products: []`

---

### Câu 4 — Mảng object lồng
`GET /api/warehouses/:warehouseId/zones`

Trả về từng khu của kho, kèm **tổng số lượng đang tồn** trong khu đó là **không cần** —
chỉ cần trạng thái khu:

```json
{ "warehouseName": "Kho Ha Noi",
  "zones": [ { "code": "Z1", "type": "COLD", "capacity": 200 },
             { "code": "Z2", "type": "DRY",  "capacity": 500 } ] }
```

- Kho không có khu nào → `zones: []`

> ⚠️ Đây là bẫy kinh điển nhất của môn này. Nếu `type` ra `undefined` ở **mọi** khu
> thì không phải dữ liệu sai — là schema của bạn sai.

---

### Câu 5 — Lọc nâng cao
`GET /api/stockmoves`

Lọc theo `warehouseId`, `moveType`, và **khoảng ngày** `from` / `to` (so sánh trên `movedAt`).
Trả kèm `productName` và `warehouseName`. Sắp xếp `movedAt` giảm dần.

```json
[ { "productName": "Ca hoi dong lanh", "warehouseName": "Kho Da Nang",
    "quantity": 45, "moveType": "OUT", "movedAt": "2026-01-15" } ]
```

> ⚠️ Có bẫy ở chỗ join. Nếu một số bản ghi ra `productName: null` thì đọc lại kiểu dữ liệu
> của `productId` trong Compass — **không phải bản ghi nào cũng giống nhau**.

---

## PHẦN B — Báo cáo (bắt buộc dùng Aggregation Pipeline)

### Câu 6 — Thống kê gom nhóm
`GET /api/reports/stock-by-warehouse`

Với mỗi kho: tổng nhập, tổng xuất, tồn kho hiện tại, và số **loại sản phẩm khác nhau** đã đi qua kho.

```json
[ { "warehouseName": "Kho Da Nang", "totalIn": 180, "totalOut": 45,
    "currentStock": 135, "distinctProducts": 2 } ]
```

- Kho **không có** bản ghi stockmove nào → **không** xuất hiện trong báo cáo
- Sắp xếp `currentStock` giảm dần

> Gợi ý: `$sum` + `$cond` để tách IN/OUT trong cùng một lần `$group`.

---

### Câu 7 — Thống kê có tính toán
`GET /api/reports/categories/summary`

Với mỗi danh mục: số sản phẩm và **giá trung bình** (làm tròn 0 chữ số thập phân).

```json
[ { "categoryName": "Electronics", "totalProducts": 2, "avgPrice": 20000000 } ]
```

- Danh mục **không có sản phẩm nào vẫn phải xuất hiện**, với `totalProducts: 0` và `avgPrice: 0`
- Sắp xếp `totalProducts` giảm dần

> ⚠️ Bẫy: có 2 sản phẩm **không có field `price`**. `$avg` sẽ bỏ qua chúng khi chia,
> nên `avgPrice` của danh mục Stationery có thể ra `null` thay vì `0`. Xử lý cho đúng.

---

## PHẦN C — Ghi dữ liệu

### Câu 8 — Tạo mới + validate
`POST /api/products`

Body: `productName`, `price`, `unit`, `categoryId`, `specs`.

Kiểm tra **theo đúng thứ tự**:
1. Thiếu field bắt buộc (`productName`, `price`, `unit`, `categoryId`) → **400** `All fields are required`
2. `categoryId` sai định dạng → **400** `Invalid categoryId: <giá trị>`
3. `price` không phải số, hoặc `< 0` → **400** `price must be a number greater than or equal to 0`
4. `productName` đã tồn tại → **409** `Product name "<tên>" already exists`
5. Không tìm thấy category → **404** `Category with id = <categoryId> not found`
6. Hợp lệ → **201**

---

### Câu 9 — Nhập / xuất kho có ràng buộc tồn
`POST /api/stockmoves`

Body: `productId`, `warehouseId`, `quantity`, `moveType`.

1. Thiếu field → **400** `All fields are required`
2. `quantity` không phải số nguyên dương → **400** `quantity must be a positive integer`
3. `moveType` không thuộc `["IN", "OUT"]` → **400** `moveType must be IN or OUT`
4. Không tìm thấy product / warehouse → **404** với message tương ứng
5. `moveType = "OUT"` mà **tồn kho của sản phẩm đó tại kho đó không đủ** → **409**
   `Not enough stock: only <n> left`
   *(tồn kho = tổng `IN` − tổng `OUT` của cặp product + warehouse đó)*
6. Hợp lệ → **201**, trả về bản ghi vừa tạo kèm `remainingStock` sau giao dịch

---

### Câu 10 — Sửa phần tử trong mảng lồng
`PATCH /api/warehouses/:warehouseId/zones/:zoneCode`

Body: `{ "capacity": 400 }` — đổi sức chứa của **một khu cụ thể**.

1. `warehouseId` sai định dạng → **400**
2. Không tìm thấy kho → **404** `Warehouse with id = <warehouseId> not found`
3. Không tìm thấy khu có mã `zoneCode` trong kho đó → **404** `Zone <zoneCode> not found in warehouse <warehouseId>`
4. `capacity` không phải số nguyên dương → **400** `capacity must be a positive integer`
5. Hợp lệ → **200**, trả về mảng `zones` sau khi sửa

---

### Câu 11 (thêm) — Xoá có ràng buộc
`DELETE /api/categories/:categoryId`

1. Sai định dạng → **400**
2. Không tồn tại → **404** `Category with id = <categoryId> not found`
3. **Còn sản phẩm thuộc danh mục này** → **409** `Cannot delete category because it has associated products`
4. Hợp lệ → **200** `{ "message": "Deleted successfully" }`

> Trong 5 danh mục chỉ có **đúng một** danh mục xoá được. Tự tìm xem là cái nào.

---

## Bẫy đã cài — chỉ đọc SAU KHI làm xong

<details>
<summary>Bấm để mở</summary>

| # | Bẫy | Dính ở câu | Dấu hiệu | Cách sửa |
|---|---|---|---|---|
| 1 | `warehouses.zones` là mảng object **có key `type`** | 4 | mọi khu ra `type: undefined` | `zones: [mongoose.Schema.Types.Mixed]` |
| 2 | `products.specs` là object đơn **có key `type`** | 2 | `specs` ra `undefined`, mất cả object | `specs: mongoose.Schema.Types.Mixed` |
| 3 | `stockmoves.productId` / `warehouseId`: 6 bản ghi lưu **ObjectId**, 3 bản ghi lưu **string** | 5, 6, 9 | 3 bản ghi join ra `null`, báo cáo thiếu kho HCM | schema để `Mixed`, query `{ $in: idForms(id) }`, aggregation dùng `$toObjectId` |
| 4 | 2 sản phẩm **không có field `price`** | 1, 7 | `$avg` chia cho số doc **có** price → Stationery ra `null` | `$ifNull` hoặc `$cond`, và cẩn thận khi sort tăng dần |
| 5 | Danh mục `Toys` **không có sản phẩm nào**; kho `Kho Ho Chi Minh` không có khu nào | 3, 4, 7, 11 | `$lookup` + `$unwind` làm mất nhóm rỗng → báo cáo thiếu 1 dòng | `preserveNullAndEmptyArrays: true` |

**Kiểm tra nhanh bẫy 1 & 2 mà không cần dữ liệu:**

```js
console.log(Warehouse.schema.path('zones').constructor.name);  // SchemaArray là OK
console.log(Product.schema.path('specs').constructor.name);    // SchemaString = ĐANG DÍNH BẪY
console.log(Product.schema.path('specs.weight'));              // undefined = ĐANG DÍNH BẪY
```

⚠️ Đừng test bằng `.lean()` — `.lean()` bỏ qua bước ép kiểu nên bẫy 1 và 2 **không lộ ra**.

</details>
