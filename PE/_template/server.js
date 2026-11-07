/* ============================================================================
   SDN302 - PE TEMPLATE

   CÁCH DÙNG: Ctrl+F gõ mã tag (vd: @GET-FILTER) để nhảy thẳng tới khối code.
              Gõ "@" để xem lướt toàn bộ danh sách khối.
              Chi tiết từng dạng + bảng case: xem thư mục methods/

   ┌──────────────────┬─────────────────────────────────────────────────────┐
   │ MÃ TAG           │ DÙNG KHI ĐỀ YÊU CẦU                                 │
   ├──────────────────┼─────────────────────────────────────────────────────┤
   │ @MODEL-BASIC     │ Khai báo model thường                               │
   │ @MODEL-REF       │ Model có khoá ngoại (quan hệ 1-n)                   │
   │ @MODEL-NESTED    │ Model có mảng object lồng (seats, location...)      │
   │ @MODEL-LINK      │ Bảng trung gian n-n (worksOns, tickets)             │
   │ @MODEL-VALIDATE  │ Schema có required / enum / min / unique / default  │
   │ @HELPER          │ Hàm dùng chung - LUÔN COPY                          │
   │ @ERROR-MAP       │ Đổi lỗi Mongoose thành status code đúng             │
   ├──────────────────┼─────────────────────────────────────────────────────┤
   │ @AUTH-KEY        │ "Protected endpoint", access_key từ header          │
   │ @AUTH-JWT        │ Đăng nhập bằng token Bearer                         │
   │ @AUTH-ROLE       │ "Role must be admin/customer"                       │
   ├──────────────────┼─────────────────────────────────────────────────────┤
   │ @GET-FILTER      │ "?status=X", lọc danh sách bằng query param         │
   │ @GET-JS          │ Làm MỌI câu GET bằng JS thuần, không populate/agg   │
   │ @GET-FILTER2     │ Lọc nâng cao: khoảng ngày, mảng chứa, field lồng    │
   │ @GET-DETAIL      │ Lấy 1 bản ghi theo :id, kèm tên từ bảng khác        │
   │ @GET-CHILDREN    │ Lấy danh sách con của 1 bản ghi cha                 │
   │ @GET-NN          │ Lấy qua bảng trung gian (nhân viên của dự án...)    │
   │ @GET-NESTED      │ Trạng thái từng phần tử mảng lồng (ghế trống/đặt)   │
   ├──────────────────┼─────────────────────────────────────────────────────┤
   │ @REPORT-AGG      │ "Use Aggregation Pipeline", báo cáo thống kê        │
   │ @REPORT-AGG2     │ Trung bình, phần trăm, top-N, lọc trước khi gom     │
   │ @POST-CREATE     │ Tạo mới + kiểm tra hợp lệ + ghi nhiều bản ghi       │
   │ @POST-OVERLAP    │ Chống trùng lịch / trùng khung giờ                  │
   │ @POST-CAPACITY   │ Kiểm tra sức chứa, số chỗ còn lại                   │
   │ @PUT-UPDATE      │ Sửa bản ghi                                         │
   │ @PATCH-STATUS    │ Đổi trạng thái có ràng buộc                        │
   │ @PATCH-ARRAY     │ Sửa 1 phần tử bên trong mảng lồng                   │
   │ @INC             │ Tăng/giảm số lượng tồn an toàn                      │
   │ @DELETE          │ Xoá, chặn khi còn dữ liệu liên quan                │
   │ @PAGINATION      │ Phân trang / sắp xếp / tìm kiếm                    │
   │ @LOGIN-JWT       │ Đăng ký / đăng nhập                                 │
   │ @NOT-FOUND       │ Bắt route không tồn tại - ĐẶT CUỐI CÙNG             │
   └──────────────────┴─────────────────────────────────────────────────────┘

   BẢNG QUY ĐỔI TÊN - đổi 5 model này theo đề là xong 80% công việc:

     Parent  ->  Department (đề 1)  |  Movie     (đề 2)
     Child   ->  Project    (đề 1)  |  Showtime  (đề 2)
     Link    ->  WorksOn    (đề 1)  |  Ticket    (đề 2)   <- bảng trung gian
     Side    ->  Location   (đề 1)  |  Room      (đề 2)   <- bảng tra cứu
     User    ->  Employee   (đề 1)  |  User      (đề 2)

   ──────────────────────────────────────────────────────────────────────────
   VIỆC ĐẦU TIÊN: MỞ package.json RA ĐỌC. Mỗi kỳ thi một bộ thư viện khác.

     express 4.x  -> mọi thứ dưới đây chạy nguyên
     express 5.x  -> CẤM 3 cú pháp, viết vào là app CHẾT LÚC KHỞI ĐỘNG:
                       app.get('*', ...)        -> dùng app.use(...) thay
                       app.get('/old/*', ...)   -> đổi thành '/old/*splat'
                       app.get('/x/:id?', ...)  -> đổi thành '/x{/:id}'
                     (bù lại: async handler throw sẽ TỰ vào error middleware)
     mongoose 9.x -> { new: true } chỉ còn là cảnh báo deprecated, vẫn chạy.
                     Muốn sạch log thì đổi sang { returnDocument: 'after' }.

     KHÔNG có bcryptjs / jsonwebtoken trong dependencies
       -> đề CHẮC CHẮN không hỏi login, bỏ qua @AUTH-JWT @AUTH-ROLE @LOGIN-JWT
     KHÔNG có ejs / hbs / pug
       -> đề là REST API thuần, không phải làm giao diện
   ────────────────────────────────────────────────────────────────────────── */

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @SETUP  —  Phần khởi tạo, giữ nguyên                                     ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Chỉ đổi tên DB trong file .env. Thiếu root path hoặc thiếu MONGO_URI     ║
// ║ trong .env là bị 0 điểm.                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
app.use(express.json());          // BẮT BUỘC, thiếu dòng này req.body sẽ undefined
app.set('json spaces', 2);   // chi de DEBUG: JSON tra ve co thut le, de doc
connectDB();

app.get('/', async (req, res) => {
    res.send({ message: 'Welcome to Practical Exam!' });
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @MODEL-BASIC  —  Model thường                                            ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: schema, collection, khai báo model                              ║
// ║ LƯU Ý  : tham số thứ 3 = TÊN COLLECTION THẬT trong Compass (số nhiều,    ║
// ║          chữ thường). Luôn ghi rõ, đừng để Mongoose tự đoán.             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const Parent = mongoose.model('Parent', new mongoose.Schema({
    name: String,
    status: String,
    tags: [String],                                                  // mảng chuỗi
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}), 'parents');


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @MODEL-REF  —  Model có khoá ngoại (quan hệ 1-n)                         ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: ref, populate, khoá ngoại, depId, movieId, roomId               ║
// ║ LƯU Ý  : chỉ khai ObjectId + ref khi CHẮC CHẮN DB lưu dạng ObjectId,     ║
// ║          vì populate chỉ chạy khi hai bên cùng kiểu.                     ║
// ║          Field thời gian: để String nếu DB lưu chuỗi ISO -> trả y nguyên ║
// ║          Để Date nếu file json dùng { "$date": ... }                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const Child = mongoose.model('Child', new mongoose.Schema({
    title: String,
    price: Number,
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
    sideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Side' },
    startTime: String,
    endTime: String
}), 'children');


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @MODEL-NESTED  —  Model có MẢNG OBJECT LỒNG, hoặc OBJECT ĐƠN             ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: seats, location, mảng lồng, subdocument, nested array, object  ║
// ║ ⚠️ BẪY  : nếu object (dù trong mảng hay đứng một mình) có key tên "type", ║
// ║          vd { _id:"A1", type:"VIP" }, thì KHÔNG viết                     ║
// ║          { _id: String, type: String } — Mongoose coi "type" là khai báo ║
// ║          kiểu cho CẢ object, đọc ra undefined.                           ║
// ║          Dùng Mixed là an toàn tuyệt đối.                                ║
// ║                                                                          ║
// ║ OBJECT ĐƠN (không phải mảng) — xem mục dưới, 3 cách đều đã test:         ║
// ║   KHÔNG có key "type"  ->  viết thẳng: meta: { city: String }            ║
// ║   CÓ key "type"        ->  Mixed, hoặc bọc: { type: { type: String } }   ║
// ║                                                                          ║
// ║ ⚠️ .lean() CHE MẤT BẪY NÀY. Còn nguyên trên mongoose 9, đã test:          ║
// ║      findOne()        -> info = undefined   (bị cast hỏng, mất field)   ║
// ║      findOne().lean() -> info = {...}       (lean bỏ qua cast, thấy đủ) ║
// ║    Đang .lean() mà thấy đúng thì ĐỪNG yên tâm — bỏ .lean() ra thử lại,  ║
// ║    vì res.json() của document thường mới là cái đề chấm.                ║
// ║    Query thì vẫn chạy: find({'items.type':'VIP'}) khớp bình thường,     ║
// ║    do MongoDB lọc trên dữ liệu thô, không qua schema.                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const Side = mongoose.model('Side', new mongoose.Schema({
    sideName: String,
    capacity: Number,

    // MẢNG object lồng — vd: seats: [{ _id:"A1", type:"VIP" }]
    items: [mongoose.Schema.Types.Mixed],

    // OBJECT ĐƠN không có key "type" — viết thẳng, truy cập side.meta.city
    meta: { city: String, zip: String },

    // OBJECT ĐƠN CÓ key "type" — phải Mixed, nếu không side.info ra undefined.
    // Cách thay thế nếu muốn giữ kiểu:  info: { type: { type: String }, code: String }
    info: mongoose.Schema.Types.Mixed
}), 'sides');


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @MODEL-LINK  —  Bảng trung gian (quan hệ n-n)                            ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: worksOns, tickets, bảng trung gian, n-n, many to many           ║
// ║ ⚠️ BẪY  : dữ liệu import có thể lưu khoá ngoại là ObjectId HOẶC string.   ║
// ║          Để Mixed thì query bằng idForms() chạy đúng cả hai trường hợp. ║
// ║          versionKey:false để response không lòi ra __v thừa.             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const Link = mongoose.model('Link', new mongoose.Schema({
    parentRef: mongoose.Schema.Types.Mixed,   // vd: proId / showTimeId
    userRef: mongoose.Schema.Types.Mixed,     // vd: empId / userId
    itemCode: String,                         // vd: seatId "A1"
    amount: Number,                           // vd: workHours / price
    status: String
}, { versionKey: false }), 'links');


const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    role: String,
    email: String,
    password: String,
    access_key: String
}), 'users');


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @MODEL-VALIDATE  —  Schema có ràng buộc, để Mongoose tự validate         ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: required, enum, min, max, unique, default, timestamps           ║
// ║ DÙNG   : khi đề ghi "Validate input data" mà không liệt kê rõ từng rule. ║
// ║          Lỗi phát sinh có name='ValidationError' -> @ERROR-MAP đổi về 400║
// ║ LƯU Ý  : ở đây "type" LÀ khai báo kiểu thật, khác hẳn bẫy @MODEL-NESTED  ║
// ║          (bẫy chỉ xảy ra khi DỮ LIỆU có field tên là "type").            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const Validated = mongoose.model('Validated', new mongoose.Schema({
    code: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: [true, 'title is required'], minlength: 2, maxlength: 100 },
    price: { type: Number, required: true, min: [0, 'price must be >= 0'] },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'STOPPED'], default: 'DRAFT' },
    quantity: { type: Number, default: 0 },
    startAt: Date,                            // kiểu Date thật, không phải String
    meta: { city: String, zip: String }       // object lồng (KHÔNG phải mảng)
}, { timestamps: true, versionKey: false }), 'validateds');   // timestamps -> createdAt, updatedAt


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @HELPER  —  Hàm dùng chung                                               ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ LUÔN COPY CẢ CỤM NÀY, mọi câu đều dùng tới.                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Match được id dù DB lưu dạng ObjectId hay dạng string
const idForms = id => [id, new mongoose.Types.ObjectId(id)];

// Kiểm tra ObjectId hợp lệ
const isId = id => mongoose.Types.ObjectId.isValid(id);


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @ERROR-MAP  —  Đổi lỗi Mongoose thành status code đúng                   ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Vì sao cần: mặc định mọi lỗi rơi vào catch -> 500. Nhưng id sai định     ║
// ║ dạng phải là 400, vi phạm unique phải là 409. Trả 500 là mất điểm.       ║
// ║ DÙNG   : trong catch viết  return sendError(res, error);                 ║
// ║          (các khối cũ vẫn dùng catch thường - đổi hay không tuỳ bạn)     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const sendError = (res, error) => {
    // Vi phạm required / enum / min / maxlength khai trong schema
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: Object.values(error.errors).map(e => e.message).join(', ')
        });
    }
    // Ép kiểu thất bại: truyền "abc" vào field ObjectId hoặc Number
    if (error.name === 'CastError') {
        return res.status(400).json({ error: `Invalid ${error.path}: ${error.value}` });
    }
    // Trùng giá trị ở field có unique index
    if (error.code === 11000) {
        return res.status(409).json({
            error: `Duplicate value for ${Object.keys(error.keyValue || {}).join(', ')}`
        });
    }
    return res.status(500).json({ error: error.message });
};


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @AUTH-KEY  —  Bảo vệ route bằng access_key trong header                  ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: Protected endpoint, access_key, authorization middleware        ║
// ║ TRẢ VỀ : 403 thiếu key | 403 key sai | 403 sai role                      ║
// ║ ĐÃ RA  : Q4 đề 2 — POST /api/tickets                                     ║
// ║ ⚠️ Đọc header PHẢI viết thường: req.headers['access_key']                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const requireCustomer = async (req, res, next) => {
    try {
        const accessKey = req.headers['access_key'];
        if (!accessKey) {
            return res.status(403).json({ error: 'No access key' });
        }

        const user = await User.findOne({ access_key: accessKey });
        if (!user) {
            return res.status(403).json({ error: 'Invalid or unauthorized access key' });
        }
        if (user.role !== 'customer') {                  // ⚠️ ĐỔI: role theo đề
            return res.status(403).json({ error: 'Customer access required' });
        }

        req.user = user;        // các route phía sau dùng req.user._id
        next();
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @AUTH-JWT / @AUTH-ROLE  —  Bảo vệ route bằng Bearer token                ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: JWT, token, Bearer, Authorization header, đăng nhập             ║
// ║ DÙNG   : app.get('/x', requireToken, requireRole('admin'), handler)      ║
// ║ ⚠️ JWT_SECRET có sẵn trong .env KHÔNG có nghĩa là đề yêu cầu JWT.         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const jwt = require('jsonwebtoken');

const requireToken = (req, res, next) => {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        req.user = jwt.verify(token, process.env.JWT_SECRET);   // ném lỗi nếu sai/hết hạn
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const requireRole = role => (req, res, next) => {
    if (req.user.role !== role) {
        return res.status(403).json({ error: `${role} access required` });
    }
    next();
};

// Cho phép nhiều role: requireAnyRole('admin', 'staff')
const requireAnyRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
};


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @GET-FILTER  —  Lấy danh sách, lọc bằng query param                      ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: ?status=, query param, filtering, Retrieve list, active, danh sách
// ║ TRẢ VỀ : 200 mảng | 400 khi param thiếu hoặc sai                         ║
// ║ ĐÃ RA  : Q1 đề 2 — GET /api/movies?status=NOW_SHOWING                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const VALID_STATUSES = ['NOW_SHOWING', 'STOPPED'];       // ⚠️ ĐỔI theo đề

app.get('/api/parents', async (req, res) => {
    try {
        const { status } = req.query;

        // includes() bắt luôn trường hợp THIẾU param (undefined không nằm trong mảng)
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}` });
        }

        const docs = await Parent.find({ status });

        // map() để đổi tên field đúng như đề yêu cầu (_id -> id)
        return res.status(200).json(docs.map(d => ({
            id: d._id,
            title: d.name,
            tags: d.tags
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @GET-JS  —  LÀM MỌI CÂU GET BẰNG JAVASCRIPT THUẦN (không populate/agg)   ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Dùng khi: bí cú pháp populate / aggregation, hoặc populate trả về null.  ║
// ║ Ý TƯỞNG: tải CẢ hai collection về, rồi ghép bằng .find() của JavaScript. ║
// ║                                                                          ║
// ║ ƯU  : không cần khai `ref`, không cần $lookup/$toObjectId.               ║
// ║       .equals() ăn được CẢ ObjectId LẪN string -> miễn nhiễm bẫy         ║
// ║       khoá ngoại lẫn kiểu (đã test: 0 bản ghi lỗi).                      ║
// ║ NHƯỢC: tải hết collection về RAM, ghép O(n×m). Dữ liệu đề thi vài chục   ║
// ║       bản ghi nên vô tư. Vài nghìn bản ghi trở lên mới nên đổi sang Map. ║
// ║                                                                          ║
// ║ ⚠️ BẮT BUỘC: query hết TRƯỚC vòng lặp. Không bao giờ await trong .map(). ║
// ║ ⚠️ a._id === b.fk LUÔN sai (so 2 object). Phải .equals() hoặc String().  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// --- A. Danh sách + lấy tên từ bảng khác (thay cho populate) ---
app.get('/api/children-js', async (req, res) => {
    try {
        const children = await Child.find();
        const parents = await Parent.find();          // tải 1 lần, KHÔNG query trong map

        return res.status(200).json(children.map(c => ({
            title: c.title,
            price: c.price,
            // ?. tránh crash khi không tìm thấy; || đặt giá trị mặc định
            parentName: parents.find(p => p._id.equals(c.parentId))?.name || 'Unknown'
        })));
    } catch (error) {
        return sendError(res, error);
    }
});

// --- B. Chi tiết 1 bản ghi + tên bảng khác ---
app.get('/api/children-js/:childId', async (req, res) => {
    try {
        const { childId } = req.params;
        if (!isId(childId)) return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });

        const child = await Child.findById(childId);
        if (!child) return res.status(404).json({ error: `Child with _id='${childId}' not found` });

        const parents = await Parent.find();

        return res.status(200).json({
            title: child.title,
            parentName: parents.find(p => p._id.equals(child.parentId))?.name || 'Unknown'
        });
    } catch (error) {
        return sendError(res, error);
    }
});

// --- C. Qua BẢNG TRUNG GIAN (n-n) — thay cho @GET-NN ---
app.get('/api/children-js/:childId/users', async (req, res) => {
    try {
        const { childId } = req.params;
        if (!isId(childId)) return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });

        const child = await Child.findById(childId);
        if (!child) return res.status(404).json({ error: `Child with _id='${childId}' not found` });

        const links = await Link.find();
        const users = await User.find();

        return res.status(200).json({
            title: child.title,
            users: links
                .filter(l => child._id.equals(l.parentRef))          // lọc link của child này
                .map(l => ({
                    name: users.find(u => u._id.equals(l.userRef))?.name || 'Unknown',
                    amount: l.amount
                }))
        });
    } catch (error) {
        return sendError(res, error);
    }
});

// --- D. BÁO CÁO gom nhóm — thay cho @REPORT-AGG ---
// Đã test: cho kết quả GIỐNG HỆT bản aggregation, kể cả khi khoá ngoại lẫn kiểu.
app.get('/api/reports-js/parents', async (req, res) => {
    try {
        const links = await Link.find();
        const parents = await Parent.find();

        const groups = {};
        for (const l of links) {
            const p = parents.find(x => x._id.equals(l.parentRef));
            if (!p) continue;                                   // bỏ bản ghi mồ côi

            const key = String(p._id);
            groups[key] ??= { parentName: p.name, total: 0, count: 0, userIds: new Set() };
            groups[key].total += l.amount || 0;
            groups[key].count += 1;
            groups[key].userIds.add(String(l.userRef));         // Set -> đếm giá trị KHÁC NHAU
        }

        const report = Object.values(groups)
            .map(g => ({
                parentName: g.parentName,
                total: g.total,
                totalRecords: g.count,
                totalUsers: g.userIds.size
            }))
            .sort((a, b) => b.total - a.total);                 // sort giảm dần

        return res.status(200).json(report);
    } catch (error) {
        return sendError(res, error);
    }
});

// --- E. TRUNG BÌNH khi có bản ghi THIẾU field (bẫy $avg) ---
app.get('/api/reports-js/avg', async (req, res) => {
    try {
        const parents = await Parent.find();
        const children = await Child.find();

        const report = parents.map(p => {
            const list = children.filter(c => p._id.equals(c.parentId));
            // $avg của MongoDB chia cho số doc CÓ field; ở JS phải tự lọc cho khớp
            const withPrice = list.filter(c => typeof c.price === 'number');
            return {
                parentName: p.name,
                totalChildren: list.length,          // parent rỗng vẫn có mặt -> totalChildren: 0
                avgPrice: withPrice.length
                    ? Math.round(withPrice.reduce((s, c) => s + c.price, 0) / withPrice.length)
                    : 0
            };
        }).sort((a, b) => b.totalChildren - a.totalChildren);

        return res.status(200).json(report);
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @GET-FILTER2  —  Lọc nâng cao                                            ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: khoảng ngày, from/to, between, genre contains, nested field,   ║
// ║          tìm theo nhiều field, date range, price range                   ║
// ║ MẸO    : chỉ thêm điều kiện vào filter KHI param có mặt -> 1 route lo    ║
// ║          được mọi tổ hợp, không cần if lồng nhau.                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.get('/api/children-filter', async (req, res) => {
    try {
        const { from, to, tag, city, q, minPrice, maxPrice } = req.query;
        const filter = {};

        // 1. Khoảng thời gian.
        // startTime lưu dạng String ISO ("2026-03-10T18:30:00.000Z") thì so sánh
        // chuỗi vẫn ĐÚNG thứ tự, không cần đổi kiểu.
        // Nếu field khai là Date thì phải bọc new Date(from) / new Date(to).
        if (from || to) {
            filter.startTime = {};
            if (from) filter.startTime.$gte = from;
            if (to) filter.startTime.$lte = to;
        }

        // 2. Mảng CHỨA giá trị — viết thẳng, Mongo tự hiểu là "có phần tử bằng"
        if (tag) filter.tags = tag;
        // Chứa BẤT KỲ giá trị nào trong danh sách:   filter.tags = { $in: tag.split(',') }
        // Chứa TẤT CẢ:                               filter.tags = { $all: tag.split(',') }

        // 3. Field bên trong object lồng — dùng dấu chấm, nhớ bọc nháy
        if (city) filter['meta.city'] = city;

        // 4. Tìm trên nhiều field cùng lúc
        if (q) {
            filter.$or = [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }

        // 5. Khoảng số
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // select: '-__v -description' loại field | lean(): trả object thường, nhanh hơn
        const docs = await Child.find(filter).select('-__v').lean();

        return res.status(200).json(docs);
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @GET-DETAIL  —  Lấy 1 bản ghi theo :id, kèm tên lấy từ bảng khác         ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ 👉 Ngại populate? Xem @GET-JS mục B — ghép bằng .find() của JavaScript.  ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: Validate ObjectId, populate, manager name, 404 not found        ║
// ║ TRẢ VỀ : 200 | 400 id sai định dạng | 404 không tồn tại                  ║
// ║ ĐÃ RA  : Q1 đề 1 — GET /api/projects/department/:depId                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.get('/api/parents/:parentId', async (req, res) => {
    try {
        const { parentId } = req.params;

        if (!isId(parentId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${parentId}` });
        }

        // populate('field', 'chỉ lấy field này') — chỉ chạy khi 2 bên CÙNG kiểu ObjectId
        const parent = await Parent.findById(parentId).populate('managerId', 'name');
        if (!parent) {
            return res.status(404).json({ error: `Parent with _id='${parentId}' not found` });
        }

        const children = await Child.find({ parentId });

        return res.status(200).json({
            name: parent.name,
            manager: parent.managerId ? parent.managerId.name : null,   // tránh crash nếu null
            children: children.map(c => ({ id: c._id, title: c.title }))
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @GET-CHILDREN  —  Danh sách con của 1 bản ghi cha + join bảng tra cứu    ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ 👉 Ngại populate? Xem @GET-JS mục A — ghép bằng .find() của JavaScript.  ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: showtimes of a movie, Include room name, sub-resource           ║
// ║ TRẢ VỀ : 200 mảng | 400 id sai | 404 cha không tồn tại                   ║
// ║ ĐÃ RA  : Q2 đề 2 — GET /api/movies/:movieId/showtimes                    ║
// ║ LƯU Ý  : cha KHÔNG tồn tại -> 404. Cha có mà chưa có con -> 200 []       ║
// ║ POPULATE LỒNG:                                                           ║
// ║   .populate({ path:'sideId', select:'sideName',                          ║
// ║               populate:{ path:'managerId', select:'name' } })            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.get('/api/parents/:parentId/children', async (req, res) => {
    try {
        const { parentId } = req.params;

        if (!isId(parentId)) {
            return res.status(400).json({ error: `Invalid movieId: ${parentId}` });
        }

        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(404).json({ error: `Movie with id = ${parentId} not found` });
        }

        const children = await Child.find({ parentId }).populate('sideId', 'sideName');

        return res.status(200).json(children.map(c => ({
            id: c._id,
            sideName: c.sideId ? c.sideId.sideName : null,
            startTime: c.startTime,
            endTime: c.endTime,
            price: c.price
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @GET-NN  —  Lấy dữ liệu qua BẢNG TRUNG GIAN (n-n)                        ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ 👉 Cách dễ nhớ hơn: @GET-JS mục C (không cần Map, chỉ .filter + .find).  ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: employees of a project, worksOns, work hours, bảng trung gian   ║
// ║ TRẢ VỀ : 200 | 400 id sai | 404 không tồn tại                            ║
// ║ ĐÃ RA  : Q2 đề 1 — GET /api/projects/:proId/employees                    ║
// ║ CÁCH   : lấy Link -> gom id -> query 1 lần -> map theo thứ tự Link.      ║
// ║          KHÔNG dùng populate vì khoá ngoại có thể là string.             ║
// ║ ⚠️ TUYỆT ĐỐI không await bên trong .map() — N bản ghi = N query.          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.get('/api/children/:childId/users', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!isId(childId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });
        }

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ error: `Child with _id='${childId}' not found` });
        }

        const links = await Link.find({ parentRef: { $in: idForms(childId) } });
        const users = await User.find({ _id: { $in: links.map(l => l.userRef) } });
        const byId = new Map(users.map(u => [String(u._id), u]));   // tra O(1), không query trong vòng lặp

        return res.status(200).json({
            title: child.title,
            users: links.map(l => {
                const u = byId.get(String(l.userRef));
                return u && { name: u.name, amount: l.amount };
            }).filter(Boolean)          // bỏ bản ghi trỏ tới user đã xoá
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @GET-NESTED  —  Trạng thái từng phần tử trong mảng lồng                  ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: seat availability, BOOKED, AVAILABLE, ghế trống, Determine status
// ║ TRẢ VỀ : 200 mảng | 400 id sai | 404 không tồn tại                       ║
// ║ ĐÃ RA  : Q3 đề 2 — GET /api/showtimes/:showtimeId/seats                  ║
// ║ ⚠️ $ne:'canceled' — bản ghi đã huỷ KHÔNG tính là đã chiếm chỗ.            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.get('/api/children/:childId/items', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!isId(childId)) {
            return res.status(400).json({ error: `Invalid showtimeId: ${childId}` });
        }

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ error: `Showtime with Id: ${childId} not found` });
        }

        const side = await Side.findById(child.sideId);
        const taken = await Link.find({ parentRef: { $in: idForms(childId) }, status: { $ne: 'canceled' } });
        const used = new Set(taken.map(l => l.itemCode));

        return res.status(200).json((side ? side.items : []).map(it => ({
            code: it._id,
            type: it.type,
            status: used.has(it._id) ? 'BOOKED' : 'AVAILABLE'
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @REPORT-AGG  —  Báo cáo bằng Aggregation Pipeline                        ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ 👉 Bí pipeline? @GET-JS mục D làm cùng kết quả bằng vòng for + Set.      ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: Aggregation Pipeline, Group by, total, report, thống kê, $lookup
// ║ TRẢ VỀ : 200 mảng                                                        ║
// ║ ĐÃ RA  : Q3 đề 1 — GET /api/reports/projects/work-hours                  ║
// ║ 6 BƯỚC : group -> lookup -> unwind -> lookup -> sort -> project          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.get('/api/reports/children/summary', async (req, res) => {
    try {
        const report = await Link.aggregate([
            // B1. Gom nhóm. $addToSet để đếm KHÔNG TRÙNG (an toàn hơn $sum:1)
            {
                $group: {
                    _id: '$parentRef',
                    totalAmount: { $sum: '$amount' },
                    userIds: { $addToSet: '$userRef' }
                }
            },

            // B2. Join sang Child.
            // ⚠️ $toObjectId để khớp được cả khi khoá ngoại lưu dạng string.
            //    Nếu chắc chắn cả 2 bên đều ObjectId thì dùng dạng ngắn:
            //    { $lookup: { from:'children', localField:'_id', foreignField:'_id', as:'child' } }
            {
                $lookup: {
                    from: 'children',                    // ⚠️ TÊN COLLECTION, không phải tên model
                    let: { cid: { $toObjectId: '$_id' } },
                    pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$cid'] } } }],
                    as: 'child'
                }
            },
            { $unwind: '$child' },                       // mảng 1 phần tử -> object

            // B3. Join tiếp sang Parent (2 bên đều ObjectId nên dùng dạng ngắn)
            { $lookup: { from: 'parents', localField: 'child.parentId', foreignField: '_id', as: 'parent' } },
            { $unwind: '$parent' },

            // B4. Sắp xếp — xem thứ tự trong đáp án mẫu của đề để chọn 1 hay -1
            { $sort: { totalAmount: -1 } },

            // B5. Chọn + đổi tên field output
            {
                $project: {
                    _id: 0,
                    totalAmount: 1,
                    totalUsers: { $size: '$userIds' },
                    childName: '$child.title',
                    parentName: '$parent.name'
                }
            }
        ]);

        return res.status(200).json(report);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @REPORT-AGG2  —  Biến thể aggregation hay ra                             ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: average, highest, top, percentage, count by, revenue, doanh thu ║
// ║ 4 MẪU  : lọc trước khi gom | trung bình & min/max | top-N | đếm theo nhóm║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.get('/api/reports/children/stats', async (req, res) => {
    try {
        const stats = await Link.aggregate([
            // MẪU 1 — $match đặt ĐẦU TIÊN để lọc bớt trước khi gom (nhanh hơn nhiều).
            // Lọc sau $group thì phải dùng tên field mới, không phải tên gốc.
            { $match: { status: { $ne: 'canceled' } } },

            // MẪU 2 — nhiều phép tính trong cùng một $group
            {
                $group: {
                    _id: '$parentRef',
                    totalAmount: { $sum: '$amount' },
                    avgAmount: { $avg: '$amount' },
                    maxAmount: { $max: '$amount' },
                    minAmount: { $min: '$amount' },
                    count: { $sum: 1 },                      // đếm bản ghi (tính cả trùng)
                    userIds: { $addToSet: '$userRef' }       // đếm KHÔNG trùng
                }
            },

            // Làm tròn 2 chữ số, tính phần trăm
            {
                $project: {
                    _id: 0,
                    childId: '$_id',
                    totalAmount: 1,
                    avgAmount: { $round: ['$avgAmount', 2] },
                    maxAmount: 1,
                    minAmount: 1,
                    uniqueUsers: { $size: '$userIds' },
                    // ⚠️ $cond chống chia cho 0
                    avgPerUser: {
                        $cond: [
                            { $eq: [{ $size: '$userIds' }, 0] },
                            0,
                            { $round: [{ $divide: ['$totalAmount', { $size: '$userIds' }] }, 2] }
                        ]
                    }
                }
            },

            // MẪU 3 — top-N: sort rồi limit
            { $sort: { totalAmount: -1 } },
            { $limit: 10 }
        ]);

        // MẪU 4 — đếm theo nhóm trên chính collection đó, không cần join
        const byStatus = await Link.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
            { $sort: { count: -1 } }
        ]);

        return res.status(200).json({ stats, byStatus });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @POST-CREATE  —  Tạo mới + kiểm tra hợp lệ + ghi nhiều bản ghi           ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: Create, POST, Validate, Insert records, Reject if, 201 Created  ║
// ║ TRẢ VỀ : 201 | 400 thiếu/sai | 404 không tồn tại | 409 trùng             ║
// ║ ĐÃ RA  : Q4 đề 1 (POST /api/projects) và Q4 đề 2 (POST /api/tickets)     ║
// ║ ⚠️ THỨ TỰ KIỂM TRA LÀ ĐIỂM SỐ. Sai thứ tự = sai status code:             ║
// ║    auth -> thiếu field -> id sai -> không tồn tại -> nghiệp vụ -> ghi    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.post('/api/children', requireCustomer, async (req, res) => {
    try {
        const { parentId, title, items } = req.body;

        // B1. Thiếu field bắt buộc -> 400
        if (!parentId || !title) {
            return res.status(400).json({ error: 'parentId and title required' });
        }

        // B2. Sai định dạng id -> 400
        if (!isId(parentId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${parentId}` });
        }

        // B3. Không tồn tại -> 404
        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(404).json({ error: `Parent with _id='${parentId}' not found` });
        }

        // B4. Kiểm tra danh sách con: gom TẤT CẢ id sai thành 1 mảng rồi trả 1 lần
        const list = Array.isArray(items) ? items : [];
        if (list.length) {
            const ids = list.map(i => i.userId);
            const found = await User.find({ _id: { $in: ids.filter(isId) } }, '_id');
            const foundIds = new Set(found.map(u => String(u._id)));
            const invalid = ids.filter(id => !foundIds.has(String(id)));
            if (invalid.length) {
                return res.status(400).json({ error: 'Some users do not exist', invalidUsers: invalid });
            }
        }

        // B5. Kiểm tra đã bị chiếm chỗ -> 409 Conflict
        const taken = await Link.find({ parentRef: { $in: idForms(parentId) }, status: { $ne: 'canceled' } });
        const used = new Set(taken.map(l => String(l.userRef)));
        const conflict = list.find(i => used.has(String(i.userId)));
        if (conflict) {
            return res.status(409).json({ error: `Item ${conflict.userId} already booked` });
        }

        // B6. Ghi dữ liệu
        const child = await Child.create({ parentId, title });

        // insertMany nhanh hơn create trong vòng lặp và trả về mảng doc đã tạo
        const created = list.length ? await Link.insertMany(list.map(i => ({
            parentRef: child._id,
            userRef: new mongoose.Types.ObjectId(i.userId),   // ép kiểu cho khớp dữ liệu cũ
            amount: i.amount,
            status: 'booked'
        }))) : [];

        // B7. Trả về đúng hình dạng JSON mà đề vẽ
        return res.status(201).json({
            message: 'Created successfully',
            count: created.length,
            totalAmount: created.reduce((sum, l) => sum + l.amount, 0),   // tính ở server, KHÔNG lấy từ body
            newChild: { childId: child._id, childName: child.title }
        });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @POST-OVERLAP  —  Chống trùng lịch / trùng khung giờ                     ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: overlap, conflict, same room at the same time, trùng lịch,     ║
// ║          "room is already booked", schedule conflict                     ║
// ║ CÔNG THỨC: hai khoảng [s1,e1) và [s2,e2) GIAO NHAU khi  s1 < e2 && s2 < e1
// ║            -> query: { startTime: { $lt: end }, endTime: { $gt: start } }║
// ║ ⚠️ Đừng viết $gte/$lte, nếu không suất 18:00-21:00 và 21:00-23:00 sẽ bị   ║
// ║    coi là trùng dù chúng chỉ chạm nhau tại một điểm.                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.post('/api/children-schedule', async (req, res) => {
    try {
        const { sideId, startTime, endTime, title } = req.body;

        if (!sideId || !startTime || !endTime) {
            return res.status(400).json({ error: 'sideId, startTime and endTime required' });
        }
        if (!isId(sideId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${sideId}` });
        }
        // Khoảng thời gian phải hợp lệ
        if (startTime >= endTime) {
            return res.status(400).json({ error: 'startTime must be before endTime' });
        }

        const side = await Side.findById(sideId);
        if (!side) {
            return res.status(404).json({ error: `Room with _id='${sideId}' not found` });
        }

        // Tìm suất nào trong CÙNG phòng bị chồng giờ
        const clash = await Child.findOne({
            sideId,
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
        });
        if (clash) {
            return res.status(409).json({
                error: `Room is already booked from ${clash.startTime} to ${clash.endTime}`
            });
        }

        const child = await Child.create({ sideId, startTime, endTime, title });

        return res.status(201).json({ message: 'Created successfully', childId: child._id });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @POST-CAPACITY  —  Kiểm tra sức chứa / số chỗ còn lại                    ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: capacity, sold out, hết chỗ, "exceeds room capacity",          ║
// ║          maximum number of, không vượt quá                               ║
// ║ ⚠️ So sánh  đã bán + đang đặt > sức chứa , đừng quên cộng số đang đặt.    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.post('/api/children/:childId/bookings', requireCustomer, async (req, res) => {
    try {
        const { childId } = req.params;
        const { codes } = req.body;                   // vd: ["A1","A2"]

        if (!isId(childId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });
        }
        if (!Array.isArray(codes) || !codes.length) {
            return res.status(400).json({ error: 'codes required' });
        }
        // Gửi trùng trong cùng 1 request
        if (new Set(codes).size !== codes.length) {
            return res.status(400).json({ error: 'Duplicate codes in request' });
        }

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ error: `Showtime with Id: ${childId} not found` });
        }

        const side = await Side.findById(child.sideId);
        const types = new Map((side ? side.items : []).map(i => [i._id, i.type]));

        // Mã không thuộc phòng này
        const unknown = codes.find(c => !types.has(c));
        if (unknown) {
            return res.status(400).json({ error: `Seat ${unknown} does not belong to the room` });
        }

        const taken = await Link.find({ parentRef: { $in: idForms(childId) }, status: { $ne: 'canceled' } });

        // Đã bị người khác đặt
        const booked = new Set(taken.map(l => l.itemCode));
        const conflict = codes.find(c => booked.has(c));
        if (conflict) {
            return res.status(409).json({ error: `Seat ${conflict} already booked` });
        }

        // Vượt sức chứa — nhớ CỘNG số đang đặt
        if (side && taken.length + codes.length > side.capacity) {
            return res.status(409).json({
                error: `Only ${side.capacity - taken.length} seats left`
            });
        }

        const created = await Link.insertMany(codes.map(c => ({
            parentRef: child._id,
            userRef: req.user._id,                    // ⚠️ lấy từ middleware, KHÔNG từ body
            itemCode: c,
            amount: types.get(c) === 'VIP' ? child.price * 1.2 : child.price,
            status: 'booked'
        })));

        return res.status(201).json({
            message: 'Tickets created',
            count: created.length,
            totalAmount: created.reduce((s, l) => s + l.amount, 0)
        });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @PUT-UPDATE  —  Sửa bản ghi                                              ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: Update, PUT, modify, chỉnh sửa                                  ║
// ║ TRẢ VỀ : 200 | 400 id sai | 404 không tồn tại                            ║
// ║ ⚠️ new:true -> trả bản ghi SAU khi sửa. KHÔNG có thì trả bản ghi CŨ.      ║
// ║ ⚠️ runValidators:true -> mới áp dụng required/enum/min của schema.        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.put('/api/children/:childId', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!isId(childId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });
        }

        const updated = await Child.findByIdAndUpdate(
            childId,
            { title: req.body.title, price: req.body.price },
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(404).json({ error: `Child with _id='${childId}' not found` });
        }

        return res.status(200).json({ message: 'Updated successfully', child: updated });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @PATCH-STATUS  —  Đổi trạng thái có ràng buộc luồng                      ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: cancel, confirm, approve, change status, chuyển trạng thái      ║
// ║ TRẢ VỀ : 200 | 400 thiếu status | 404 không tồn tại | 409 chuyển sai     ║
// ║ CÁCH   : khai BẢNG chuyển trạng thái rồi tra, đừng viết chuỗi if.        ║
// ║ ⚠️ Phải findById để đọc trạng thái CŨ -> không dùng findByIdAndUpdate.    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const ALLOWED_FLOW = { booked: ['paid', 'canceled'], paid: ['canceled'], canceled: [] };

app.patch('/api/links/:linkId/status', async (req, res) => {
    try {
        const { linkId } = req.params;
        const { status } = req.body;

        if (!isId(linkId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${linkId}` });
        }
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        const link = await Link.findById(linkId);
        if (!link) {
            return res.status(404).json({ error: `Link with _id='${linkId}' not found` });
        }

        // || [] chống trường hợp DB có trạng thái lạ không nằm trong bảng
        if (!(ALLOWED_FLOW[link.status] || []).includes(status)) {
            return res.status(409).json({ error: `Cannot change status from ${link.status} to ${status}` });
        }

        link.status = status;
        await link.save();

        return res.status(200).json({ message: 'Status updated', link });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @PATCH-ARRAY  —  Sửa / thêm / xoá 1 phần tử bên trong mảng lồng          ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: update a seat, add location to, remove item from, sửa phần tử  ║
// ║ 4 TOÁN TỬ:                                                               ║
// ║   $push       thêm, cho phép trùng                                       ║
// ║   $addToSet   thêm, bỏ qua nếu đã có                                     ║
// ║   $pull       xoá mọi phần tử khớp điều kiện                             ║
// ║   'arr.$.x'   sửa phần tử ĐẦU TIÊN khớp điều kiện ở phần find            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.patch('/api/sides/:sideId/items/:code', async (req, res) => {
    try {
        const { sideId, code } = req.params;
        const { type } = req.body;

        if (!isId(sideId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${sideId}` });
        }
        if (!type) {
            return res.status(400).json({ error: 'type is required' });
        }

        // Dấu $ trong 'items.$.type' = phần tử khớp với 'items._id' ở điều kiện find.
        // BẮT BUỘC phải có 'items._id' trong filter, nếu không Mongo báo lỗi.
        const result = await Side.updateOne(
            { _id: sideId, 'items._id': code },
            { $set: { 'items.$.type': type } }
        );

        // matchedCount = 0 nghĩa là không có side đó, HOẶC side có nhưng không có mã đó
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: `Seat ${code} not found in room ${sideId}` });
        }

        const side = await Side.findById(sideId);
        return res.status(200).json({ message: 'Updated successfully', items: side.items });
    } catch (error) {
        return sendError(res, error);
    }
});

// Thêm / xoá phần tử — cùng route, phân biệt bằng action trong body
app.patch('/api/sides/:sideId/items', async (req, res) => {
    try {
        const { sideId } = req.params;
        const { action, item } = req.body;      // action: 'add' | 'remove'

        if (!isId(sideId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${sideId}` });
        }
        if (!item || !item._id) {
            return res.status(400).json({ error: 'item with _id is required' });
        }

        const change = action === 'remove'
            ? { $pull: { items: { _id: item._id } } }
            : { $addToSet: { items: item } };       // $push nếu đề cho phép trùng

        const side = await Side.findByIdAndUpdate(sideId, change, { new: true });
        if (!side) {
            return res.status(404).json({ error: `Room with _id='${sideId}' not found` });
        }

        return res.status(200).json({ message: 'Updated successfully', items: side.items });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @INC  —  Tăng / giảm số lượng tồn                                        ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: stock, quantity, remaining, số lượng còn lại, trừ kho          ║
// ║ MẸO    : đặt điều kiện "còn đủ hàng" NGAY TRONG filter của query.        ║
// ║          Nếu không đủ thì không có document nào khớp -> trả null -> 409. ║
// ║          Cách này tránh được trường hợp 2 request trừ kho cùng lúc.      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.patch('/api/sides/:sideId/capacity', async (req, res) => {
    try {
        const { sideId } = req.params;
        const amount = Number(req.body.amount);

        if (!isId(sideId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${sideId}` });
        }
        // ⚠️ dùng Number.isFinite, KHÔNG dùng !amount — vì !0 là true
        if (!Number.isFinite(amount) || amount === 0) {
            return res.status(400).json({ error: 'amount must be a non-zero number' });
        }

        // Giảm: chỉ khớp khi capacity còn đủ. Tăng: không cần điều kiện.
        const filter = amount < 0
            ? { _id: sideId, capacity: { $gte: -amount } }
            : { _id: sideId };

        const updated = await Side.findOneAndUpdate(filter, { $inc: { capacity: amount } }, { new: true });

        if (!updated) {
            // Phân biệt "không tồn tại" với "không đủ chỗ"
            const exists = await Side.findById(sideId);
            return exists
                ? res.status(409).json({ error: `Not enough capacity, only ${exists.capacity} left` })
                : res.status(404).json({ error: `Room with _id='${sideId}' not found` });
        }

        return res.status(200).json({ message: 'Capacity updated', capacity: updated.capacity });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @DELETE  —  Xoá, chặn khi còn dữ liệu liên quan                          ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: Delete, remove, xoá, Reject if referenced                       ║
// ║ TRẢ VỀ : 200 | 400 id sai | 404 không tồn tại | 409 còn ràng buộc        ║
// ║ ⚠️ Kiểm tra 404 TRƯỚC, 409 SAU. Đảo lại thì bản ghi không tồn tại cũng   ║
// ║    trả 409 (vì countDocuments ra 0 nên lọt qua).                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.delete('/api/children/:childId', async (req, res) => {
    try {
        const { childId } = req.params;

        if (!isId(childId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${childId}` });
        }

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ error: `Child with _id='${childId}' not found` });
        }

        // Chặn xoá nếu còn dữ liệu liên quan (chỉ dùng khi đề yêu cầu)
        const linked = await Link.countDocuments({ parentRef: { $in: idForms(childId) } });
        if (linked > 0) {
            return res.status(409).json({ error: `Cannot delete: ${linked} related records exist` });
        }

        // Nếu đề yêu cầu XOÁ LAN thay vì chặn, thay 3 dòng trên bằng:
        //   await Link.deleteMany({ parentRef: { $in: idForms(childId) } });

        await Child.findByIdAndDelete(childId);

        return res.status(200).json({ message: 'Deleted successfully' });
        // Nếu đề yêu cầu không trả body: return res.status(204).send();
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @PAGINATION  —  Phân trang + sắp xếp + tìm kiếm                          ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: page, limit, sort, search, keyword, phân trang, tìm kiếm        ║
// ║ VÍ DỤ  : GET /api/children-search?q=abc&page=1&limit=10&sort=-price      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.get('/api/children-search', async (req, res) => {
    try {
        const { q, sort, minPrice, maxPrice } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);

        const filter = {};
        if (q) filter.title = { $regex: q, $options: 'i' };     // 'i' = không phân biệt hoa thường
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const total = await Child.countDocuments(filter);
        const data = await Child.find(filter)
            .sort(sort || '-_id')        // '-price' giảm dần | 'price,-title' nhiều tiêu chí
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data
        });
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @LOGIN-JWT  —  Đăng ký / đăng nhập / route cần token                     ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: login, register, JWT, bcrypt, hash password, token             ║
// ║ ⚠️ Dữ liệu đề THƯỜNG lưu password dạng thô (vd "pass123"). Mở Compass     ║
// ║    xem trước — nếu không hash thì bcrypt.compare luôn trả false.         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
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
        //    Nếu đề yêu cầu cấp role, làm route riêng:
        //    app.patch('/api/users/:id/role', requireToken, requireRole('admin'), ...)
        const user = await User.create({
            name,
            email,
            role: 'customer',
            password: await bcrypt.hash(password, 10)
        });

        return res.status(201).json({ message: 'Registered', userId: user._id });
    } catch (error) {
        return sendError(res, error);
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        // ⚠️ Nếu DB lưu password dạng chữ thường (không hash), đổi thành:
        //    const ok = user && user.password === password;
        const ok = user && await bcrypt.compare(password, user.password);
        if (!ok) {
            // Sai email và sai mật khẩu phải trả CÙNG message, tránh lộ tài khoản nào có thật
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { _id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({ token });
    } catch (error) {
        return sendError(res, error);
    }
});

app.get('/api/me', requireToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id, '-password');   // '-password' = loại field này ra
        return res.status(200).json(user);
    } catch (error) {
        return sendError(res, error);
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @NOT-FOUND  —  Bắt route không tồn tại + lỗi chưa bắt                    ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ ⚠️ PHẢI ĐẶT SAU TẤT CẢ CÁC ROUTE, ngay trước app.listen.                  ║
// ║    Đặt trên cùng thì nó nuốt hết mọi request.                            ║
// ║ Middleware xử lý lỗi BẮT BUỘC có đủ 4 tham số (err, req, res, next),     ║
// ║ thiếu next thì Express coi nó là middleware thường và không gọi.         ║
// ║ ⚠️ Dùng app.use() như dưới đây, ĐỪNG viết app.get('*', ...):              ║
// ║    trên express 5 dấu '*' trần làm app throw ngay lúc khởi động.         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((error, req, res, next) => sendError(res, error));


const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
