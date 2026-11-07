/* ĐÁP ÁN — DE_01_TONGHOP.  Copy đè lên resource/server.js để chạy thử.
   Đã test thật cả 11 câu.  Các chỗ ghi "BẪY" là nơi dữ liệu cố tình gài. */

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

require('dotenv').config();
const { connectDb } = require('./dal/database');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Chi de DEBUG: tra JSON da thut le cho de doc trong Postman/Thunder Client.
app.set('json spaces', 2);

/* ===== MODELS ===== */

const Category = mongoose.model('Category', new mongoose.Schema({
    categoryName: { type: String, required: true },
    description: { type: String }
}, { versionKey: false }), 'categories');

const Warehouse = mongoose.model('Warehouse', new mongoose.Schema({
    warehouseName: { type: String, required: true },
    city: { type: String, required: true },
    // BẪY 1: phần tử của zones có key tên "type".
    // Viết [{ _id: String, type: String, capacity: Number }] -> mọi khu ra undefined.
    zones: [mongoose.Schema.Types.Mixed]
}, { versionKey: false }), 'warehouses');

const Product = mongoose.model('Product', new mongoose.Schema({
    productName: { type: String, required: true },
    price: { type: Number, min: 0 },
    unit: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    // BẪY 2: specs là object đơn có key "type" -> phải Mixed, nếu không cả object ra undefined.
    specs: mongoose.Schema.Types.Mixed
}, { versionKey: false }), 'products');

const StockMove = mongoose.model('StockMove', new mongoose.Schema({
    // BẪY 3: 6 bản ghi lưu ObjectId, 3 bản ghi lưu string -> để Mixed mới đọc được cả hai.
    productId: mongoose.Schema.Types.Mixed,
    warehouseId: mongoose.Schema.Types.Mixed,
    quantity: { type: Number, required: true },
    moveType: { type: String, required: true },
    movedAt: { type: String, required: true }
}, { versionKey: false }), 'stockmoves');

/* ===== HELPERS ===== */

// Khoá ngoại lúc ObjectId lúc string -> query bằng $in để ăn cả hai dạng.
const idForms = id => [String(id), new mongoose.Types.ObjectId(String(id))];

const sendError = (res, error) => {
    if (error.name === 'ValidationError') {
        return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    if (error.name === 'CastError') {
        return res.status(400).json({ error: `Invalid ${error.path}: ${error.value}` });
    }
    if (error.code === 11000) {
        return res.status(409).json({ error: `Duplicate value for ${Object.keys(error.keyValue || {}).join(', ')}` });
    }
    return res.status(500).json({ error: error.message });
};

/* ===== CÂU 1 — GET /api/products ===== */

app.get('/api/products', async (req, res) => {
    try {
        const { categoryId, keyword, minPrice, maxPrice } = req.query;

        const filter = {};
        if (categoryId) {
            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                return res.status(400).json({ error: `Invalid categoryId: ${categoryId}` });
            }
            filter.categoryId = categoryId;
        }
        if (keyword) filter.productName = { $regex: keyword, $options: 'i' };
        if (minPrice || maxPrice) {
            filter.price = {};
            // Number('abc') = NaN -> mongoose ném CastError -> sendError đổi thành 400, không phải 500.
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const products = await Product.find(filter)
            .populate('categoryId', 'categoryName')
            .sort({ price: -1 });

        return res.status(200).json(products.map(p => ({
            productName: p.productName,
            price: p.price ?? null,
            unit: p.unit,
            categoryName: p.categoryId ? p.categoryId.categoryName : null
        })));
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 2 — GET /api/products/:productId ===== */

app.get('/api/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ error: `Invalid productId: ${productId}` });
        }

        const product = await Product.findById(productId).populate('categoryId', 'categoryName');
        if (!product) return res.status(404).json({ error: `Product with id = ${productId} not found` });

        return res.status(200).json({
            productName: product.productName,
            price: product.price ?? null,
            unit: product.unit,
            categoryName: product.categoryId ? product.categoryId.categoryName : null,
            specs: product.specs            // BẪY 2 lộ ra ở đây nếu schema sai
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 3 — GET /api/categories/:categoryId/products ===== */

app.get('/api/categories/:categoryId/products', async (req, res) => {
    try {
        const { categoryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ error: `Invalid categoryId: ${categoryId}` });
        }

        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).json({ error: `Category with id = ${categoryId} not found` });

        const products = await Product.find({ categoryId }).sort({ productName: 1 });

        return res.status(200).json({
            categoryName: category.categoryName,
            totalProducts: products.length,
            products: products.map(p => ({ productName: p.productName, price: p.price ?? null, unit: p.unit }))
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 4 — GET /api/warehouses/:warehouseId/zones ===== */

app.get('/api/warehouses/:warehouseId/zones', async (req, res) => {
    try {
        const { warehouseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
            return res.status(400).json({ error: `Invalid warehouseId: ${warehouseId}` });
        }

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) return res.status(404).json({ error: `Warehouse with id = ${warehouseId} not found` });

        return res.status(200).json({
            warehouseName: warehouse.warehouseName,
            zones: (warehouse.zones || []).map(z => ({
                code: z._id, type: z.type, capacity: z.capacity
            }))
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 5 — GET /api/stockmoves ===== */

app.get('/api/stockmoves', async (req, res) => {
    try {
        const { warehouseId, moveType, from, to } = req.query;

        const filter = {};
        if (warehouseId) {
            if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
                return res.status(400).json({ error: `Invalid warehouseId: ${warehouseId}` });
            }
            filter.warehouseId = { $in: idForms(warehouseId) };   // BẪY 3
        }
        if (moveType) filter.moveType = moveType;
        if (from || to) {
            filter.movedAt = {};
            if (from) filter.movedAt.$gte = from;
            if (to) filter.movedAt.$lte = to;
        }

        const moves = await StockMove.find(filter).sort({ movedAt: -1 }).lean();

        // populate() không dùng được vì khoá ngoại lẫn ObjectId với string -> tự join bằng Map.
        const [products, warehouses] = await Promise.all([Product.find().lean(), Warehouse.find().lean()]);
        const pMap = new Map(products.map(p => [String(p._id), p.productName]));
        const wMap = new Map(warehouses.map(w => [String(w._id), w.warehouseName]));

        return res.status(200).json(moves.map(m => ({
            productName: pMap.get(String(m.productId)) ?? null,
            warehouseName: wMap.get(String(m.warehouseId)) ?? null,
            quantity: m.quantity,
            moveType: m.moveType,
            movedAt: m.movedAt
        })));
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 6 — GET /api/reports/stock-by-warehouse ===== */

app.get('/api/reports/stock-by-warehouse', async (req, res) => {
    try {
        const report = await StockMove.aggregate([
            {
                $group: {
                    _id: '$warehouseId',
                    totalIn: { $sum: { $cond: [{ $eq: ['$moveType', 'IN'] }, '$quantity', 0] } },
                    totalOut: { $sum: { $cond: [{ $eq: ['$moveType', 'OUT'] }, '$quantity', 0] } },
                    productIds: { $addToSet: '$productId' }
                }
            },
            // BẪY 3: _id lúc ObjectId lúc string -> $toObjectId rồi mới so sánh.
            {
                $lookup: {
                    from: 'warehouses',
                    let: { wid: { $toObjectId: '$_id' } },
                    pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$wid'] } } }],
                    as: 'warehouse'
                }
            },
            { $unwind: '$warehouse' },
            {
                $project: {
                    _id: 0,
                    warehouseName: '$warehouse.warehouseName',
                    totalIn: 1,
                    totalOut: 1,
                    currentStock: { $subtract: ['$totalIn', '$totalOut'] },
                    distinctProducts: { $size: '$productIds' }
                }
            },
            { $sort: { currentStock: -1 } }
        ]);

        return res.status(200).json(report);
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 7 — GET /api/reports/categories/summary ===== */

app.get('/api/reports/categories/summary', async (req, res) => {
    try {
        const report = await Category.aggregate([
            // Bắt đầu từ categories để danh mục RỖNG vẫn có mặt.
            { $lookup: { from: 'products', localField: '_id', foreignField: 'categoryId', as: 'products' } },
            {
                $project: {
                    _id: 0,
                    categoryName: 1,
                    totalProducts: { $size: '$products' },
                    // BẪY 4: 2 sản phẩm không có field price -> $avg trả null.
                    // $ifNull đổi null thành 0, $round làm tròn 0 chữ số.
                    avgPrice: { $round: [{ $ifNull: [{ $avg: '$products.price' }, 0] }, 0] }
                }
            },
            { $sort: { totalProducts: -1 } }
        ]);

        return res.status(200).json(report);
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 8 — POST /api/products ===== */

app.post('/api/products', async (req, res) => {
    try {
        const { productName, price, unit, categoryId, specs } = req.body;

        if (!productName || price === undefined || !unit || !categoryId) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ error: `Invalid categoryId: ${categoryId}` });
        }
        const p = Number(price);
        if (!Number.isFinite(p) || p < 0) {
            return res.status(400).json({ error: 'price must be a number greater than or equal to 0' });
        }

        const existed = await Product.findOne({ productName });
        if (existed) return res.status(409).json({ error: `Product name "${productName}" already exists` });

        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).json({ error: `Category with id = ${categoryId} not found` });

        const created = await Product.create({ productName, price: p, unit, categoryId, specs });
        return res.status(201).json(created);
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 9 — POST /api/stockmoves ===== */

app.post('/api/stockmoves', async (req, res) => {
    try {
        const { productId, warehouseId, quantity, moveType } = req.body;

        if (!productId || !warehouseId || quantity === undefined || !moveType) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ error: `Invalid productId: ${productId}` });
        }
        if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
            return res.status(400).json({ error: `Invalid warehouseId: ${warehouseId}` });
        }
        const qty = Number(quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
            return res.status(400).json({ error: 'quantity must be a positive integer' });
        }
        if (!['IN', 'OUT'].includes(moveType)) {
            return res.status(400).json({ error: 'moveType must be IN or OUT' });
        }

        const [product, warehouse] = await Promise.all([
            Product.findById(productId), Warehouse.findById(warehouseId)
        ]);
        if (!product) return res.status(404).json({ error: `Product with id = ${productId} not found` });
        if (!warehouse) return res.status(404).json({ error: `Warehouse with id = ${warehouseId} not found` });

        // Tồn kho = tổng IN - tổng OUT của đúng cặp product + warehouse.
        const agg = await StockMove.aggregate([
            { $match: { productId: { $in: idForms(productId) }, warehouseId: { $in: idForms(warehouseId) } } },
            {
                $group: {
                    _id: null,
                    stock: {
                        $sum: { $cond: [{ $eq: ['$moveType', 'IN'] }, '$quantity', { $multiply: ['$quantity', -1] }] }
                    }
                }
            }
        ]);
        const stock = agg.length ? agg[0].stock : 0;

        if (moveType === 'OUT' && stock < qty) {
            return res.status(409).json({ error: `Not enough stock: only ${stock} left` });
        }

        const created = await StockMove.create({
            productId, warehouseId, quantity: qty, moveType,
            movedAt: new Date().toISOString().slice(0, 10)
        });

        return res.status(201).json({
            message: 'Stock move created successfully',
            stockMove: created,
            remainingStock: moveType === 'IN' ? stock + qty : stock - qty
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 10 — PATCH /api/warehouses/:warehouseId/zones/:zoneCode ===== */

app.patch('/api/warehouses/:warehouseId/zones/:zoneCode', async (req, res) => {
    try {
        const { warehouseId, zoneCode } = req.params;
        const { capacity } = req.body;

        if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
            return res.status(400).json({ error: `Invalid warehouseId: ${warehouseId}` });
        }

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) return res.status(404).json({ error: `Warehouse with id = ${warehouseId} not found` });

        if (!(warehouse.zones || []).some(z => z._id === zoneCode)) {
            return res.status(404).json({ error: `Zone ${zoneCode} not found in warehouse ${warehouseId}` });
        }

        const cap = Number(capacity);
        if (!Number.isInteger(cap) || cap <= 0) {
            return res.status(400).json({ error: 'capacity must be a positive integer' });
        }

        // Positional $ : filter BẮT BUỘC chứa điều kiện của mảng thì $ mới biết trỏ vào đâu.
        await Warehouse.updateOne(
            { _id: warehouseId, 'zones._id': zoneCode },
            { $set: { 'zones.$.capacity': cap } }
        );

        const updated = await Warehouse.findById(warehouseId);
        return res.status(200).json({
            warehouseName: updated.warehouseName,
            zones: updated.zones.map(z => ({ code: z._id, type: z.type, capacity: z.capacity }))
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== CÂU 11 — DELETE /api/categories/:categoryId ===== */

app.delete('/api/categories/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ error: `Invalid categoryId: ${categoryId}` });
        }

        // 404 TRƯỚC, 409 SAU. Đảo thứ tự thì id không tồn tại cũng trả 200.
        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).json({ error: `Category with id = ${categoryId} not found` });

        const linked = await Product.countDocuments({ categoryId });
        if (linked > 0) {
            return res.status(409).json({ error: 'Cannot delete category because it has associated products' });
        }

        await Category.findByIdAndDelete(categoryId);
        return res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== ROOT / 404 ===== */

app.get('/api', (req, res) => res.status(200).json({ message: 'Welcome Express server' }));

app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});
app.use((error, req, res, next) => sendError(res, error));

(async () => {
    try {
        await connectDb();
        app.listen(process.env.PORT, () => console.log(`API chay tai http://localhost:${process.env.PORT}/api`));
    } catch (error) {
        console.error(`Khong khoi dong duoc server: `, error.message);
        process.exit(1);
    }
})()
