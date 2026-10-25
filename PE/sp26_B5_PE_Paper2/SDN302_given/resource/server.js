const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
app.use(express.json());
connectDB();

const Employee = mongoose.model('Employee', new mongoose.Schema({
    empName: String,
    empSalary: Number,
    empSex: Boolean,
    empBirthdate: String,
    depId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    empStartdate: String
}), 'employees');

const Department = mongoose.model('Department', new mongoose.Schema({
    depName: String,
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    managerAssDate: String,
    location: [{ _id: false, locId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' } }]
}), 'departments');

const Project = mongoose.model('Project', new mongoose.Schema({
    proName: String,
    depId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    location: [{ _id: false, locId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' } }]
}), 'projects');

// Mixed so the handlers work whether the import stored these as ObjectId or as strings
const WorksOn = mongoose.model('WorksOn', new mongoose.Schema({
    empId: mongoose.Schema.Types.Mixed,
    proId: mongoose.Schema.Types.Mixed,
    workHours: Number
}, { versionKey: false }), 'worksons');

// match an id whether it was imported as a string or as an ObjectId
const idForms = id => [id, new mongoose.Types.ObjectId(id)];

app.get('/', async (req, res) => {
    try {
        res.send({ message: 'Welcome to Practical Exam!' });
    } catch (error) {
        res.send({ error: error.message });
    }
});

// Question 1: Retrieve projects by department (stub path kept as an alias)
app.get(['/api/projects/department/:depId', '/api/projects/departments/:depId'], async (req, res) => {
    try {
        const { depId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(depId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${depId}` });
        }

        const department = await Department.findById(depId).populate('managerId', 'empName');
        if (!department) {
            return res.status(404).json({ error: `Department with _id='${depId}' not found` });
        }

        const projects = await Project.find({ depId });

        return res.status(200).json({
            depName: department.depName,
            manager: department.managerId ? department.managerId.empName : null,
            projects: projects.map(p => ({ proId: p._id, proName: p.proName }))
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Question 2: Retrieve employees by project
app.get('/api/projects/:proId/employees', async (req, res) => {
    try {
        const { proId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(proId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${proId}` });
        }

        const project = await Project.findById(proId);
        if (!project) {
            return res.status(404).json({ error: `Project with _id='${proId}' not found` });
        }

        const worksOns = await WorksOn.find({ proId: { $in: idForms(proId) } });
        const employees = await Employee.find({ _id: { $in: worksOns.map(w => w.empId) } });
        const byId = new Map(employees.map(e => [String(e._id), e]));

        return res.status(200).json({
            project: project.proName,
            employees: worksOns.map(w => {
                const emp = byId.get(String(w.empId));
                return emp && { empName: emp.empName, empSalary: emp.empSalary, workHours: w.workHours };
            }).filter(Boolean)
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Question 3: Project work hours report
app.get('/api/reports/projects/work-hours', async (req, res) => {
    try {
        const report = await WorksOn.aggregate([
            { $group: { _id: '$proId', totalWorkHours: { $sum: '$workHours' }, empIds: { $addToSet: '$empId' } } },
            {
                $lookup: {
                    from: 'projects',
                    // $toObjectId normalises proId whether it was stored as ObjectId or string
                    let: { pid: { $toObjectId: '$_id' } },
                    pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }],
                    as: 'project'
                }
            },
            { $unwind: '$project' },
            { $lookup: { from: 'departments', localField: 'project.depId', foreignField: '_id', as: 'department' } },
            { $unwind: '$department' },
            { $sort: { totalWorkHours: -1 } },
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

// Question 4: Create project with employees
app.post('/api/projects', async (req, res) => {
    try {
        const { proName, depId, location, employees } = req.body;

        if (!proName || !depId) {
            return res.status(400).json({ error: 'proName and depId are required' });
        }
        if (!mongoose.Types.ObjectId.isValid(depId)) {
            return res.status(400).json({ error: `Invalid ObjectId: ${depId}` });
        }

        const department = await Department.findById(depId);
        if (!department) {
            return res.status(404).json({ error: `Department with _id='${depId}' not found` });
        }

        const assignments = Array.isArray(employees) ? employees : [];
        if (assignments.length) {
            const ids = assignments.map(e => e.empId);
            const found = await Employee.find({ _id: { $in: ids.filter(id => mongoose.Types.ObjectId.isValid(id)) } }, '_id');
            const foundIds = new Set(found.map(e => String(e._id)));
            const invalidEmployees = ids.filter(id => !foundIds.has(String(id)));
            if (invalidEmployees.length) {
                return res.status(400).json({ error: 'Some employees do not exist', invalidEmployees });
            }
        }

        const project = await Project.create({ proName, depId, location });

        const newProject = { projectId: project._id, projectName: project.proName };
        if (assignments.length) {
            newProject.worksOns = await WorksOn.insertMany(
                assignments.map(e => ({ proId: project._id, empId: new mongoose.Types.ObjectId(e.empId), workHours: e.workHours }))
            );
        }

        return res.status(201).json({ message: 'Project created successfully', newProject });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
