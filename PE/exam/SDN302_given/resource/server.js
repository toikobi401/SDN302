/* ============================================================================
   SDN302 - PE

   MÔI TRƯỜNG ĐỀ NÀY (đã kiểm tra):  express 5.3  |  mongoose 9.11
     - KHÔNG có bcryptjs / jsonwebtoken  -> đề không hỏi login
     - KHÔNG có ejs / hbs / pug          -> REST API thuần, không làm giao diện
     - CẤM app.get('*')  /  '/old/*'  /  '/x/:id?'   (express 5 throw lúc chạy)
       thay bằng  app.use(...)  /  '/old/*splat'  /  '/x{/:id}'

   VIỆC ĐẦU TIÊN:
     1. Sửa MONGO_URI trong .env cho đúng tên DB của đề
     2. Import JSON vào Compass đúng tên collection
     3. npm start  -> phải thấy "Đã kết nối CSDL" trước khi viết dòng code nào

   Code mẫu từng dạng: xem PE/_template/server.js (Ctrl+F theo mã @TAG)
============================================================================ */

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

require('dotenv').config();
const { connectDb } = require('./dal/database');

const app = express();
app.use(express.json());                      // thiếu dòng này req.body = undefined
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));


// ===== MODELS =========================================== @MODEL-* trong template
// Tham số thứ 3 = TÊN COLLECTION THẬT trong Compass (số nhiều, chữ thường).
// ⚠️ Mảng/object có key tên "type" -> phải dùng Mixed, nếu không đọc ra undefined.
//    Kiểm tra: Parent.schema.path('field').constructor.name  (ra SchemaString = đang sai)

// const Parent = mongoose.model('Parent', new mongoose.Schema({
//     parentName: { type: String, required: true },
// }, { versionKey: false }), 'parents');

// const Child = mongoose.model('Child', new mongoose.Schema({
//     childName: { type: String, required: true },
//     parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
// }, { versionKey: false }), 'children');


// ===== HELPERS ======================================================= @HELPER
// Khoá ngoại có thể lưu ObjectId HOẶC string -> query bằng $in: idForms(id) ăn cả hai.
const idForms = id => [id, new mongoose.Types.ObjectId(id)];

// Đổi lỗi Mongoose thành status đúng, nếu không mọi lỗi input đều ra 500.
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


// ===== ROUTES ===============================================================
// Thứ tự: đường dẫn CỐ ĐỊNH phải khai TRƯỚC đường dẫn có :param.
// Trong handler theo đúng thứ tự này, sai thứ tự là trả nhầm status code:
//   1. đọc input  2. validate -> 400  3. tồn tại chưa -> 404
//   4. luật nghiệp vụ -> 409  5. đọc/ghi DB  6. trả JSON đúng hình dạng đề vẽ

app.get('/api', async (req, resp, next) => {
    try {
        resp.status(200).json({ message: `Welcome Express server` });
    } catch (error) {
        next(error);
    }
});

// app.get('/api/children', async (req, res) => {
//     try {
//         const { status } = req.query;
//         const filter = {};
//         if (status) filter.status = status;
//
//         const docs = await Child.find(filter).populate('parentId', 'parentName');
//         return res.status(200).json(docs);
//     } catch (error) {
//         return sendError(res, error);
//     }
// });

// app.get('/api/children/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             return res.status(400).json({ error: `Invalid id: ${id}` });
//         }
//
//         const doc = await Child.findById(id);
//         if (!doc) return res.status(404).json({ error: `Child with id = ${id} not found` });
//
//         return res.status(200).json(doc);
//     } catch (error) {
//         return sendError(res, error);
//     }
// });


// ===== 404 + ERROR ========================================= PHẢI ĐẶT CUỐI CÙNG
// Dùng app.use, KHÔNG dùng app.get('*') — express 5 sẽ throw lúc khởi động.
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((error, req, res, next) => sendError(res, error));


(async () => {
    try {
        await connectDb();

        const server = app.listen(process.env.PORT, () => {
            console.log(`API chạy tại http://localhost:${process.env.PORT}/api`);
        });

    } catch (error) {
        console.error(`Không khởi động được server: `, error.message);
        process.exit(1);
    }
})()
