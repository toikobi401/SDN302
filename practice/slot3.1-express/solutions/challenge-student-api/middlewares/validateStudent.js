const createError = require('../utils/createError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware FACTORY: một hàm trả về middleware (giống morgan('dev'), express.static(...))
//   validateStudent()                  -> dùng cho POST: bắt buộc đủ name, email, gpa
//   validateStudent({ partial: true }) -> dùng cho PUT: chỉ kiểm tra field được gửi lên
function validateStudent({ partial = false } = {}) {
  return (req, res, next) => {
    const body = req.body || {};
    const errors = [];

    const has = (field) => body[field] !== undefined;

    if (partial && !has('name') && !has('email') && !has('gpa')) {
      errors.push('at least one of name, email, gpa is required');
    }

    if (!partial || has('name')) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        errors.push('name is required and must be a non-empty string');
      }
    }

    if (!partial || has('email')) {
      if (typeof body.email !== 'string' || !EMAIL_PATTERN.test(body.email)) {
        errors.push('email is required and must be a valid email');
      }
    }

    if (!partial || has('gpa')) {
      if (typeof body.gpa !== 'number' || body.gpa < 0 || body.gpa > 4) {
        errors.push('gpa is required and must be a number between 0 and 4');
      }
    }

    if (errors.length > 0) {
      return next(createError(400, 'Validation failed', errors));
    }
    next();
  };
}

module.exports = validateStudent;
