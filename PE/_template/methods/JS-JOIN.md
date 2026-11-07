# JS-JOIN — Làm mọi câu GET bằng JavaScript thuần

> **File dự phòng.** Khi bí `populate` / `$lookup` / aggregation, hoặc khi `populate`
> cứ trả về `null` mà không hiểu vì sao — bỏ hẳn chúng đi, dùng cách trong file này.
>
> Code sẵn: khối `@GET-JS` trong `server.js`, 5 mục A–E.

**Ý tưởng duy nhất:** tải cả hai collection về, rồi ghép bằng `.find()` của JavaScript.

```js
const products   = await Product.find();
const categories = await Category.find();     // tải TRƯỚC vòng lặp

const data = products.map(p => ({
    productName: p.productName,
    categoryName: categories.find(c => c._id.equals(p.categoryId))?.categoryName || 'Unknown'
}));
```

---

## 1. Vì sao nên biết cách này

| | `populate()` | JS thuần + `.equals()` |
|---|---|---|
| Phải khai `ref: 'Model'` đúng tên | **Có** — sai tên là ra `null`, không báo lỗi | Không cần |
| Khoá ngoại lưu **string** thay vì ObjectId | **Hỏng**, trả `null` | Vẫn chạy |
| Phải nhớ `$lookup` / `$toObjectId` / `$unwind` | Có, khi làm báo cáo | Không |
| Số lần gọi DB | 1 | 2 (mỗi collection 1 lần) |
| Chỗ ghép dữ liệu | DB lo | RAM, O(n×m) |

Đề thi chỉ vài chục bản ghi nên nhược điểm tốc độ **không ảnh hưởng gì**.
Đổi lại bạn không phải nhớ cú pháp nào cả.

### `.equals()` — đã chạy thử từng trường hợp

| Gọi | Trả về |
|---|---|
| `id.equals(ObjectId giống)` | `true` |
| `id.equals(ObjectId khác)` | `false` |
| `id.equals('chuỗi 24 ký tự giống')` | **`true`** ← lý do nó thắng `populate` |
| `id.equals(undefined)` | `false`, **không ném lỗi** |
| `id.equals(null)` | `false` |
| `id.equals('zzz')` | `false` |
| `id === idKhácObject` | **`false`** dù hai id giống nhau |

Nhờ dòng in đậm, cách này **miễn nhiễm với bẫy khoá ngoại lúc ObjectId lúc string**
— bẫy mà `populate` chết thẳng.

> ⚠️ `a._id === b.categoryId` **luôn sai**, vì đang so sánh hai object chứ không phải giá trị.
> Bắt buộc `.equals()` hoặc `String(a) === String(b)`.

---

## 2. Danh sách + tên lấy từ bảng khác

Thay cho `.populate('categoryId', 'categoryName')`.

```js
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        const categories = await Category.find();

        const returnData = products.map(product => ({
            productName: product.productName,
            price: product.price,
            unit: product.unit,
            categoryName: categories
                .find(category => category._id.equals(product.categoryId))
                ?.categoryName || 'Unknown'
        }));

        return res.status(200).json(returnData);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
```

| Case | Kết quả |
|---|---|
| Khoá ngoại là ObjectId | ghép đúng |
| Khoá ngoại là string | ghép đúng (nhờ `.equals`) |
| Khoá ngoại trỏ tới bản ghi đã xoá | `'Unknown'`, không crash |
| Không có bản ghi nào | `200 []` |

---

## 3. Chi tiết một bản ghi theo `:id`

```js
const { productId } = req.params;
if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ error: `Invalid productId: ${productId}` });
}

const product = await Product.findById(productId);
if (!product) return res.status(404).json({ error: `Product with id = ${productId} not found` });

const categories = await Category.find();

return res.status(200).json({
    productName: product.productName,
    categoryName: categories.find(c => c._id.equals(product.categoryId))?.categoryName || 'Unknown'
});
```

> Thứ tự vẫn phải là **400 → 404 → trả dữ liệu**, cách ghép không làm thay đổi điều đó.

---

## 4. Danh sách con của một bản ghi cha

```js
const parent = await Parent.findById(parentId);
if (!parent) return res.status(404).json({ error: `Parent with id = ${parentId} not found` });

const children = await Child.find();
const sides = await Side.find();

return res.status(200).json({
    parentName: parent.name,
    children: children
        .filter(c => parent._id.equals(c.parentId))            // lọc con của cha này
        .map(c => ({
            title: c.title,
            sideName: sides.find(s => s._id.equals(c.sideId))?.sideName || 'Unknown'
        }))
});
```

> Cha có thật nhưng chưa có con → `children: []` với **200**, không phải 404.

---

## 5. Qua bảng trung gian (n-n)

Thay cho `@GET-NN` (bản dùng `Map`). Dễ nhớ hơn, cùng kết quả.

```js
const child = await Child.findById(childId);
if (!child) return res.status(404).json({ error: `Child with id = ${childId} not found` });

const links = await Link.find();
const users = await User.find();

return res.status(200).json({
    title: child.title,
    users: links
        .filter(l => child._id.equals(l.childRef))
        .map(l => ({
            name: users.find(u => u._id.equals(l.userRef))?.name || 'Unknown',
            amount: l.amount
        }))
});
```

---

## 6. Báo cáo gom nhóm — thay cho aggregation

```js
const moves = await StockMove.find();
const warehouses = await Warehouse.find();

const groups = {};
for (const move of moves) {
    const w = warehouses.find(x => x._id.equals(move.warehouseId));
    if (!w) continue;                                     // bỏ bản ghi mồ côi

    const key = String(w._id);
    groups[key] ??= { warehouseName: w.warehouseName, totalIn: 0, totalOut: 0, products: new Set() };

    groups[key][move.moveType === 'IN' ? 'totalIn' : 'totalOut'] += move.quantity;
    groups[key].products.add(String(move.productId));     // Set = đếm giá trị KHÁC NHAU
}

const report = Object.values(groups)
    .map(g => ({
        warehouseName: g.warehouseName,
        totalIn: g.totalIn,
        totalOut: g.totalOut,
        currentStock: g.totalIn - g.totalOut,
        distinctProducts: g.products.size
    }))
    .sort((a, b) => b.currentStock - a.currentStock);
```

Đã đối chiếu với bản aggregation trên cùng bộ dữ liệu: **số liệu trùng khít**.

### Bảng dịch pipeline sang JavaScript

| Aggregation | JavaScript |
|---|---|
| `$match` | `.filter()` |
| `$group: { _id: '$f' }` | `groups[key] ??= {...}` trong vòng `for` |
| `$sum: 1` | `g.count += 1` |
| `$sum: '$amount'` | `g.total += x.amount` |
| `$addToSet` + `$size` | `new Set()` + `.size` |
| `$avg` | `tong / soLuong` — xem mục 7 |
| `$min` / `$max` | `Math.min(...arr)` / `Math.max(...arr)` |
| `$sort: { f: -1 }` | `.sort((a, b) => b.f - a.f)` |
| `$sort` theo chuỗi | `.sort((a, b) => a.f.localeCompare(b.f))` |
| `$limit: 5` | `.slice(0, 5)` |
| `$project` | `.map()` |
| `$lookup` + `$unwind` | `arr.find(x => x._id.equals(fk))` |
| `$cond` | toán tử `? :` |
| `$ifNull: ['$f', 0]` | `x.f ?? 0` |

---

## 7. Trung bình khi có bản ghi thiếu field

`$avg` của MongoDB chia cho số document **có** field, không phải tổng số document.
Viết bằng JS phải tự lọc cho khớp, nếu không ra số khác đáp án.

```js
const report = categories.map(c => {
    const list = products.filter(p => c._id.equals(p.categoryId));
    const withPrice = list.filter(p => typeof p.price === 'number');   // bỏ doc thiếu price

    return {
        categoryName: c.categoryName,
        totalProducts: list.length,            // nhóm rỗng vẫn có mặt, totalProducts: 0
        avgPrice: withPrice.length
            ? Math.round(withPrice.reduce((s, p) => s + p.price, 0) / withPrice.length)
            : 0                                 // tránh chia cho 0 -> NaN
    };
}).sort((a, b) => b.totalProducts - a.totalProducts);
```

> Lợi thế âm thầm: bắt đầu từ `categories.map()` nên **nhóm rỗng vẫn xuất hiện**.
> Bản aggregation phải nhớ `preserveNullAndEmptyArrays: true` mới được như vậy.

---

## 8. Hai lỗi chết người

### Gọi DB bên trong `.map()`

```js
// ❌ N bản ghi = N lần gọi DB. Chậm, dễ treo, và là lỗi bị trừ điểm.
const data = await Promise.all(products.map(async p => ({
    categoryName: (await Category.findById(p.categoryId))?.categoryName
})));

// ✅ Query hết TRƯỚC, rồi mới map
const categories = await Category.find();
const data = products.map(p => ({
    categoryName: categories.find(c => c._id.equals(p.categoryId))?.categoryName || 'Unknown'
}));
```

### Quên `?.` và giá trị mặc định

```js
// ❌ Không tìm thấy -> .find() trả undefined -> đọc .categoryName -> CRASH 500
categoryName: categories.find(c => c._id.equals(p.categoryId)).categoryName

// ✅
categoryName: categories.find(c => c._id.equals(p.categoryId))?.categoryName || 'Unknown'
```

---

## 9. Khi nào KHÔNG nên dùng cách này

- Đề ghi rõ **"Use Aggregation Pipeline"** → bắt buộc dùng aggregation, đây là yêu cầu chấm điểm.
- Collection hàng nghìn bản ghi → đổi `.find()` sang `Map` để khỏi O(n×m):

```js
const map = new Map(categories.map(c => [String(c._id), c]));
const name = map.get(String(product.categoryId))?.categoryName || 'Unknown';
```

---

## Checklist

- [ ] Query **hết** các collection TRƯỚC vòng lặp, không `await` trong `.map()`?
- [ ] Dùng `.equals()` hoặc `String()` để so id, **không** dùng `===`?
- [ ] Có `?.` và `|| 'Unknown'` ở mọi chỗ `.find()`?
- [ ] Vẫn giữ đúng thứ tự **400 → 404 → 409 → dữ liệu**?
- [ ] Nhóm rỗng (danh mục không có sản phẩm) có xuất hiện trong báo cáo không?
- [ ] Trung bình: đã lọc bỏ bản ghi thiếu field, và chặn chia cho 0?
- [ ] Đề có bắt **"Use Aggregation Pipeline"** không? Nếu có thì **không** được dùng file này.
