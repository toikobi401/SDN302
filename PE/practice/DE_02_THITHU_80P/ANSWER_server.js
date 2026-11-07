/* ĐÁP ÁN — DE_02_THITHU_80P.  Copy đè lên resource/server.js để chạy thử.
   Đã test thật, cả 4 câu. */

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

const Department = mongoose.model('Department', new mongoose.Schema({
    depName: { type: String, required: true },
    location: { type: String, required: true }
}, { versionKey: false }), 'departments');

const Doctor = mongoose.model('Doctor', new mongoose.Schema({
    doctorName: { type: String, required: true },
    depId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    specialty: { type: String, required: true },
    fee: { type: Number, required: true, min: 0 }
}, { versionKey: false }), 'doctors');

const Patient = mongoose.model('Patient', new mongoose.Schema({
    patientName: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: String, required: true }
}, { versionKey: false }), 'patients');

const Appointment = mongoose.model('Appointment', new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, required: true },
    fee: { type: Number, required: true }
}, { versionKey: false }), 'appointments');

const User = mongoose.model('User', new mongoose.Schema({
    name: String, role: String, access_key: String
}, { versionKey: false }), 'users');

/* ===== HELPERS ===== */

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

// Đề bắt trả 403 cho CẢ BA trường hợp, kể cả thiếu key (chuẩn REST là 401).
const requireKey = (...roles) => async (req, res, next) => {
    try {
        const key = req.headers['access_key'];
        if (!key) return res.status(403).json({ error: 'Missing access_key' });

        const user = await User.findOne({ access_key: key });
        if (!user) return res.status(403).json({ error: 'Invalid access_key' });

        if (roles.length && !roles.includes(user.role)) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        req.user = user;
        return next();
    } catch (error) {
        return sendError(res, error);
    }
};

/* ===== Q1 — GET /api/doctors ===== */

app.get('/api/doctors', async (req, res) => {
    try {
        const { depId, specialty, maxFee } = req.query;

        const filter = {};
        if (depId) {
            if (!mongoose.Types.ObjectId.isValid(depId)) {
                return res.status(400).json({ error: `Invalid depId: ${depId}` });
            }
            filter.depId = depId;
        }
        if (specialty) filter.specialty = { $regex: specialty, $options: 'i' };
        if (maxFee) filter.fee = { $lte: Number(maxFee) };

        const doctors = await Doctor.find(filter)
            .populate('depId', 'depName')
            .sort({ fee: -1 });

        return res.status(200).json(doctors.map(d => ({
            doctorName: d.doctorName,
            specialty: d.specialty,
            fee: d.fee,
            departmentName: d.depId ? d.depId.depName : null
        })));
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== Q2 — GET /api/doctors/:doctorId/appointments ===== */

app.get('/api/doctors/:doctorId/appointments', async (req, res) => {
    try {
        const { doctorId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({ error: `Invalid doctorId: ${doctorId}` });
        }

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ error: `Doctor with id = ${doctorId} not found` });

        const appointments = await Appointment.find({ doctorId })
            .populate('patientId', 'patientName')
            .sort({ startTime: 1 });

        return res.status(200).json({
            doctorName: doctor.doctorName,
            specialty: doctor.specialty,
            totalAppointments: appointments.length,
            appointments: appointments.map(a => ({
                patientName: a.patientId ? a.patientId.patientName : null,
                startTime: a.startTime,
                endTime: a.endTime,
                status: a.status
            }))
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== Q3 — POST /api/appointments (protected) ===== */

app.post('/api/appointments', requireKey('staff', 'manager'), async (req, res) => {
    try {
        const { doctorId, patientId, startTime, endTime } = req.body;

        if (!doctorId || !patientId || !startTime || !endTime) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({ error: `Invalid doctorId: ${doctorId}` });
        }
        if (!mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({ error: `Invalid patientId: ${patientId}` });
        }
        if (!(startTime < endTime)) {
            return res.status(400).json({ error: 'startTime must be before endTime' });
        }

        const [doctor, patient] = await Promise.all([
            Doctor.findById(doctorId),
            Patient.findById(patientId)
        ]);
        if (!doctor) return res.status(404).json({ error: `Doctor with id = ${doctorId} not found` });
        if (!patient) return res.status(404).json({ error: `Patient with id = ${patientId} not found` });

        // Hai khoảng [s1,e1) và [s2,e2) giao nhau <=> s1 < e2 && s2 < e1.
        // PHẢI $lt/$gt: dùng $lte/$gte sẽ báo trùng cả khi hai lịch chỉ chạm mép.
        const clash = await Appointment.findOne({
            doctorId,
            status: { $ne: 'CANCELED' },
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
        });
        if (clash) return res.status(409).json({ error: 'Doctor is not available in this time range' });

        const created = await Appointment.create({
            doctorId, patientId, startTime, endTime,
            status: 'BOOKED',
            fee: doctor.fee              // lấy từ bác sĩ, KHÔNG lấy từ body
        });

        return res.status(201).json({
            message: 'Appointment booked successfully',
            appointment: {
                doctorName: doctor.doctorName,
                patientName: patient.patientName,
                startTime: created.startTime,
                endTime: created.endTime,
                status: created.status,
                fee: created.fee
            }
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ===== Q4 — GET /api/reports/doctors/workload ===== */

app.get('/api/reports/doctors/workload', async (req, res) => {
    try {
        const report = await Appointment.aggregate([
            { $match: { status: { $ne: 'CANCELED' } } },
            {
                $group: {
                    _id: '$doctorId',
                    totalAppointments: { $sum: 1 },
                    patientIds: { $addToSet: '$patientId' },
                    totalRevenue: { $sum: '$fee' }
                }
            },
            { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
            { $unwind: '$doctor' },
            { $lookup: { from: 'departments', localField: 'doctor.depId', foreignField: '_id', as: 'department' } },
            { $unwind: '$department' },
            { $sort: { totalRevenue: -1 } },
            {
                $project: {
                    _id: 0,
                    doctorName: '$doctor.doctorName',
                    departmentName: '$department.depName',
                    totalAppointments: 1,
                    totalPatients: { $size: '$patientIds' },
                    totalRevenue: 1
                }
            }
        ]);

        return res.status(200).json(report);
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
