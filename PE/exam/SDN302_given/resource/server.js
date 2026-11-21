
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
// app.set('json spaces', 2);


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

const Attendance = mongoose.model('Attendance', new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId,ref:'Student' ,required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref:'Class', required: true },
    date: { type:String, required: true},
    status: {type: String, required: true}
}, { versionKey: false }), 'attendances');

const Student = mongoose.model('Student', new mongoose.Schema({
    code: { type: String, required: true },
    fullname: { type:String, required: true},
    email: {type: String, required: true}
}, { versionKey: false }), 'students');

const Class = mongoose.model('Class', new mongoose.Schema({
    className: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref:'Subject', required: true },
    lecturerName: { type:String, required: true},
    status: { type:String, required: true},
    enrollments: [mongoose.Schema.Types.Mixed]
}, { versionKey: false }), 'classes');

const Subject = mongoose.model('Subject', new mongoose.Schema({
    code: { type: String, required: true },
    name: { type:String, required: true},
    credits: {type: Number, required: true, min: 0},
    status: { type:String, required: true}
}, { versionKey: false }), 'subjects');

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

//Q1
app.get('/api/subjects', async (req, res) => {
    try {
        
        const {minCredits, maxCredits} = req.query;

        console.log(minCredits, maxCredits)

        if(!minCredits || !maxCredits) return res.status(400).json({ error: `minCredits and maxCredits are required and must be positive integers` });;
        if(minCredits <= 0 || maxCredits <= 0) return res.status(400).json({ error: `minCredits and maxCredits must be positive integers` });;
        if(minCredits > maxCredits) return res.status(400).json({ error: `minCredits must be less than or equal to maxCredits` });;

        const subject = await Subject.find({credits:{$gte: minCredits, $lte: maxCredits}});
        // const subject = await Subject.find();

        console.log(subject);

        return res.status(200).json(subject.map(s => ({
            id: s._id,
            code: s.code,
            name: s.name,
            credits: s.credits,
            status: s.status
        })));
    } catch (error) {
        return sendError(res, error);
    }
});

//Q2
app.get('/api/classes/workload-sumary', async (req, res) => {
    try {
        
        const {lecturer} = req.query;

        const classLecturer = await Class.find({lecturerName:lecturer});       

        if(!lecturer.trim()) return res.status(400).json({ error: `Query param lecturer is required` });;
        if(classLecturer.length === 0) return res.status(404).json({ error: `"No classes found for lecture \" ${lecturer} "`});;
        
        let returnValue = {};
        returnValue.lecturerName = lecturer;
        returnValue.totalClasses = classLecturer.length;
        
        let credits = 0;
        
        for(let i = 0; i < classLecturer.length; i++){
            // const subjectClass = await Subject.findById(classLecturer.subjectId)
            // console.log(classLecturer.subjectId);
            // console.log(subjectClass);
            // for(let j = 0; j < subjectClass.length; i++){
            //     credits += subjectClass[j].credits;
            // }         
        }
        returnValue.status = classLecturer.status;
        
        returnValue.totalCredits = credits;
        return res.status(200).json(returnValue);
    } catch (error) {
        return sendError(res, error);
    }
});


app.get('/api/subjects/:subjectId/curriculum', async (req, res) => {
    try {
        
        const {subjectId} = req.params;

        const subject = await Subject.findById(subjectId);
        if(!subject) return res.status(404).json({ error: `Subject with id = ${subjectId} not found` });;
        if(!mongoose.Types.ObjectId.isValid(subjectId)){
            return res.status(400).json({ error: `Invalid subjectID: ${subjectId}` });
        }

        return res.status(200).json();
    } catch (error) {
        return sendError(res, error);
    }
});



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
