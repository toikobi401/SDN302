const express = require('express');
const students = require('../data/students');
const validateStudent = require('../middlewares/validateStudent');
const createError = require('../utils/createError');

const studentRouter = express.Router();

// Tìm vị trí sinh viên theo :id; id sai định dạng thì ném lỗi 400
function findIndexOrFail(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError(400, `Invalid student id: ${rawId}`);
  }
  const index = students.findIndex((student) => student.id === id);
  if (index === -1) {
    throw createError(404, 'Student not found');
  }
  return index;
}

function emailTaken(email, exceptId) {
  const normalized = email.toLowerCase();
  return students.some(
    (student) => student.email.toLowerCase() === normalized && student.id !== exceptId
  );
}

studentRouter
  .route('/')
  .get((req, res, next) => {
    let result = students;

    if (req.query.minGpa !== undefined) {
      const minGpa = Number(req.query.minGpa);
      if (Number.isNaN(minGpa)) {
        return next(createError(400, 'minGpa must be a number'));
      }
      result = result.filter((student) => student.gpa >= minGpa);
    }

    res.json({ count: result.length, data: result });
  })
  .post(validateStudent(), (req, res, next) => {
    const { name, email, gpa } = req.body;

    if (emailTaken(email)) {
      return next(createError(409, 'Email already exists'));
    }

    const nextId = students.length === 0 ? 1 : Math.max(...students.map((s) => s.id)) + 1;
    const student = { id: nextId, name: name.trim(), email, gpa };
    students.push(student);
    res.status(201).json(student);
  })
  .put((req, res, next) => {
    next(createError(403, `PUT operation not supported on ${req.baseUrl}`));
  })
  .delete((req, res, next) => {
    next(createError(403, `DELETE operation not supported on ${req.baseUrl}`));
  });

// Lỗi ném ra (throw) trong handler đồng bộ sẽ được Express tự chuyển tới error handler
studentRouter
  .route('/:id')
  .get((req, res) => {
    const index = findIndexOrFail(req.params.id);
    res.json(students[index]);
  })
  .put(validateStudent({ partial: true }), (req, res, next) => {
    const index = findIndexOrFail(req.params.id);
    const student = students[index];
    const { name, email, gpa } = req.body;

    if (email !== undefined && emailTaken(email, student.id)) {
      return next(createError(409, 'Email already exists'));
    }

    if (name !== undefined) student.name = name.trim();
    if (email !== undefined) student.email = email;
    if (gpa !== undefined) student.gpa = gpa;

    res.json(student);
  })
  .delete((req, res) => {
    const index = findIndexOrFail(req.params.id);
    students.splice(index, 1);
    res.status(204).end(); // 204 No Content: thành công nhưng KHÔNG có body
  });

module.exports = studentRouter;
