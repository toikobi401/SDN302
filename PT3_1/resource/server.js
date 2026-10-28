const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
app.use(express.json());
connectDB();

const Department = mongoose.model('Department', new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Department name is required'],
        unique: true,
        trim: true
    },
    description: String
}), 'departments');

const Job = mongoose.model('Job', new mongoose.Schema({
    name: String,
    issues: [{
        title: String,
        date: { type: Date, default: Date.now },
        isCompleted: { type: Boolean, default: false }
    }],
    startDate: Date,
    endDate: Date
}), 'jobs');

const Employee = mongoose.model('Employee', new mongoose.Schema({
    name: {
        firstName: { type: String, required: [true, 'First name is required'] },
        lastName: { type: String, required: [true, 'Last name is required'] },
        middleName: { type: String, required: [true, 'Middle name is required'] }
    },
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: {
            values: ['male', 'female', 'other'],
            message: 'Gender must be male, female, or other'
        },
        required: [true, 'Gender is required']
    },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    account: {
        email: {
            type: String,
            required: [true, 'Email is required'],
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            match: [
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
                'Password must be at least 8 characters, including uppercase, lowercase and special characters'
            ]
        }
    },
    dependents: [{
        fullname: String,
        relation: String
    }],
    jobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }]
}), 'employees');

const formatFullName = nameObj => {
    if (!nameObj) return '';
    return [nameObj.firstName, nameObj.middleName, nameObj.lastName].filter(Boolean).join(' ');
};

app.get('/', async (req, res) => {
    try {
        res.send({ message: 'Welcome to Practical Exam!' });
    } catch (error) {
        res.send({ error: error.message });
    }
});

//Q1
app.get('/employee/list', async (req, res) => {
    try {
        const employees = await Employee.find()
            .populate('department')
            .populate('manager');

        const result = employees.map(emp => ({
            employeeId: emp._id,
            fullName: formatFullName(emp.name),
            dob: emp.dateOfBirth,
            gender: emp.gender,
            email: emp.account ? emp.account.email : '',
            department: emp.department ? emp.department.name : '',
            manager: emp.manager ? formatFullName(emp.manager.name) : '',
            dependents: (emp.dependents || []).map(dep => ({
                name: dep.fullname,
                relation: dep.relation
            }))
        }));

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


//Q2
app.get('/department/:departmentId', async (req, res) => {
    try {
        const { departmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(departmentId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${departmentId}` });
        }

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ error: `Department with _id='${departmentId}' not found` });
        }

        const allEmployees = await Employee.find({ department: departmentId });
        const managerObj = allEmployees.find(emp => !emp.manager);
        const staffList = allEmployees.filter(emp => emp.manager !== null);

        return res.status(200).json({
            department: department.name,
            manager: managerObj ? formatFullName(managerObj.name) : '',
            employees: staffList.map(emp => ({
                id: emp._id,
                fullName: formatFullName(emp.name)
            }))
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.post('/department/create', async (req, res) => {
    try {
        const { name, description, employees } = req.body;

        if (name) {
            const existingDept = await Department.findOne({ name: name.trim() });
            if (existingDept) {
                return res.status(400).json({ error: 'Department name has existed' });
            }
        }

        const newDepartment = new Department({ name, description });
        await newDepartment.validate();

        const employeeDocs = [];
        if (Array.isArray(employees) && employees.length > 0) {
            for (const empData of employees) {
                const empDoc = new Employee({
                    ...empData,
                    department: newDepartment._id
                });
                await empDoc.validate();
                employeeDocs.push(empDoc);
            }
        }

        const savedDepartment = await newDepartment.save();
        const savedEmployees = employeeDocs.length > 0 ? await Employee.insertMany(employeeDocs) : [];

        return res.status(201).json({
            message: 'Create a new department and add employees succesfully',
            result: {
                departmentId: savedDepartment._id,
                departmentName: savedDepartment.name,
                employeesList: savedEmployees.map(emp => ({
                    name: formatFullName(emp.name)
                }))
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: errors });
        }
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Department name has existed' });
        }
        return res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));