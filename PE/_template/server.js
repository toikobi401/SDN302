/* ============================================================================
   SDN302 - PE TEMPLATE

   CÁCH DÙNG: Ctrl+F gõ mã tag (vd: @GET-FILTER) để nhảy thẳng tới khối code.
              Gõ "@" để xem lướt toàn bộ danh sách khối.

   ┌─────────────────┬──────────────────────────────────────────────────────┐
   │ MÃ TAG          │ DÙNG KHI ĐỀ YÊU CẦU                                  │
   ├─────────────────┼──────────────────────────────────────────────────────┤
   │ @MODEL-BASIC    │ Khai báo model thường                                │
   │ @MODEL-REF      │ Model có khoá ngoại (quan hệ 1-n)                    │
   │ @MODEL-NESTED   │ Model có mảng object lồng (seats, location...)       │
   │ @MODEL-LINK     │ Bảng trung gian n-n (worksOns, tickets)              │
   │ @HELPER         │ Hàm dùng chung - LUÔN COPY                           │
   ├─────────────────┼──────────────────────────────────────────────────────┤
   │ @AUTH-KEY       │ "Protected endpoint", access_key từ header           │
   │ @AUTH-JWT       │ Đăng nhập bằng token Bearer                          │
   │ @AUTH-ROLE      │ "Role must be admin/customer"                        │
   ├─────────────────┼──────────────────────────────────────────────────────┤
   │ @GET-FILTER     │ "?status=X", lọc danh sách bằng query param          │
   │ @GET-DETAIL     │ Lấy 1 bản ghi theo :id, kèm tên từ bảng khác         │
   │ @GET-CHILDREN   │ Lấy danh sách con của 1 bản ghi cha                  │
   │ @GET-NN         │ Lấy qua bảng trung gian (nhân viên của dự án...)     │
   │ @GET-NESTED     │ Trạng thái từng phần tử mảng lồng (ghế trống/đặt)    │
   ├─────────────────┼──────────────────────────────────────────────────────┤
   │ @REPORT-AGG     │ "Use Aggregation Pipeline", báo cáo thống kê         │
   │ @POST-CREATE    │ Tạo mới + kiểm tra hợp lệ + ghi nhiều bản ghi        │
   │ @PUT-UPDATE     │ Sửa bản ghi                                          │
   │ @PATCH-STATUS   │ Đổi trạng thái có ràng buộc                         │
   │ @DELETE         │ Xoá, chặn khi còn dữ liệu liên quan                 │
   │ @PAGINATION     │ Phân trang / sắp xếp / tìm kiếm                     │
   └─────────────────┴──────────────────────────────────────────────────────┘

   BẢNG QUY ĐỔI TÊN - đổi 5 model này theo đề là xong 80% công việc:

     Parent  ->  Department (đề 1)  |  Movie     (đề 2)
     Child   ->  Project    (đề 1)  |  Showtime  (đề 2)
     Link    ->  WorksOn    (đề 1)  |  Ticket    (đề 2)   <- bảng trung gian
     Side    ->  Location   (đề 1)  |  Room      (đề 2)   <- bảng tra cứu
     User    ->  Employee   (đề 1)  |  User      (đề 2)
============================================================================ */

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
// ║ @MODEL-NESTED  —  Model có MẢNG OBJECT LỒNG                              ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: seats, location, mảng lồng, subdocument, nested array           ║
// ║ ⚠️ BẪY  : nếu phần tử có key tên là "type"  vd { _id:"A1", type:"VIP" }   ║
// ║          thì KHÔNG viết [{ _id: String, type: String }] — Mongoose hiểu  ║
// ║          "type" là khai báo kiểu cho cả object, đọc ra toàn undefined.   ║
// ║          Dùng Mixed là an toàn tuyệt đối.                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const Side = mongoose.model('Side', new mongoose.Schema({
    sideName: String,
    capacity: Number,
    items: [mongoose.Schema.Types.Mixed]      // vd: seats: [{ _id:"A1", type:"VIP" }]
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
// ║ @HELPER  —  Hàm dùng chung                                               ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ LUÔN COPY CẢ CỤM NÀY, mọi câu đều dùng tới.                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Match được id dù DB lưu dạng ObjectId hay dạng string
const idForms = id => [id, new mongoose.Types.ObjectId(id)];

// Kiểm tra ObjectId hợp lệ
const isId = id => mongoose.Types.ObjectId.isValid(id);


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
// ║ @GET-DETAIL  —  Lấy 1 bản ghi theo :id, kèm tên lấy từ bảng khác         ║
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
// ║ Từ khoá: showtimes of a movie, Include room name, sub-resource           ║
// ║ TRẢ VỀ : 200 mảng | 400 id sai | 404 cha không tồn tại                   ║
// ║ ĐÃ RA  : Q2 đề 2 — GET /api/movies/:movieId/showtimes                    ║
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
// ║ Từ khoá: employees of a project, worksOns, work hours, bảng trung gian   ║
// ║ TRẢ VỀ : 200 | 400 id sai | 404 không tồn tại                            ║
// ║ ĐÃ RA  : Q2 đề 1 — GET /api/projects/:proId/employees                    ║
// ║ CÁCH   : lấy Link -> gom id -> query 1 lần -> map theo thứ tự Link.      ║
// ║          KHÔNG dùng populate vì khoá ngoại có thể là string.             ║
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
// ║ CÁCH   : lấy mảng gốc từ bảng tra cứu, đối chiếu với Set các mã đã dùng  ║
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
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @PUT-UPDATE  —  Sửa bản ghi                                              ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: Update, PUT, modify, chỉnh sửa                                  ║
// ║ TRẢ VỀ : 200 | 400 id sai | 404 không tồn tại                            ║
// ║ LƯU Ý  : new:true -> trả bản ghi SAU khi sửa (mặc định trả bản ghi CŨ)   ║
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
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @PATCH-STATUS  —  Đổi trạng thái có ràng buộc luồng                      ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: cancel, confirm, change status, chuyển trạng thái, PATCH        ║
// ║ TRẢ VỀ : 200 | 400 chuyển trạng thái không hợp lệ | 404 không tồn tại    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const ALLOWED_FLOW = { booked: ['paid', 'canceled'], paid: ['canceled'], canceled: [] };

app.patch('/api/links/:linkId/status', async (req, res) => {
    try {
        const { linkId } = req.params;
        const { status } = req.body;

        if (!isId(linkId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${linkId}` });
        }

        const link = await Link.findById(linkId);
        if (!link) {
            return res.status(404).json({ error: `Link with _id='${linkId}' not found` });
        }

        if (!ALLOWED_FLOW[link.status] || !ALLOWED_FLOW[link.status].includes(status)) {
            return res.status(400).json({ error: `Cannot change status from ${link.status} to ${status}` });
        }

        link.status = status;
        await link.save();

        return res.status(200).json({ message: 'Status updated', link });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @DELETE  —  Xoá, chặn khi còn dữ liệu liên quan                          ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: Delete, remove, xoá, Reject if referenced                       ║
// ║ TRẢ VỀ : 200 | 400 id sai | 404 không tồn tại | 409 còn ràng buộc        ║
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

        await Child.findByIdAndDelete(childId);

        return res.status(200).json({ message: 'Deleted successfully' });
        // Nếu đề yêu cầu không trả body: return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: error.message });
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
            .sort(sort || '-_id')        // '-price' giảm dần, 'price' tăng dần
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
        return res.status(500).json({ error: error.message });
    }
});


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ @LOGIN-JWT  —  Đăng ký / đăng nhập / route cần token                     ║
// ╟──────────────────────────────────────────────────────────────────────────╢
// ║ Từ khoá: login, register, JWT, bcrypt, hash password, token             ║
// ║ ⚠️ Nếu DB lưu password KHÔNG hash thì đổi dòng so sánh ở trong hàm.       ║
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
        return res.status(500).json({ error: error.message });
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
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { _id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({ token });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/api/me', requireToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id, '-password');   // '-password' = loại field này ra
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// ============================================================================
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
