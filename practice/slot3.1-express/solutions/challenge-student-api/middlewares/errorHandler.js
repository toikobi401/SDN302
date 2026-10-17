const createError = require('../utils/createError');

// 404 cho mọi route không khớp
function notFound(req, res, next) {
  next(createError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

// Error-handling middleware: đủ 4 tham số
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const body = { status, message: err.message };

  if (err.type === 'entity.parse.failed') {
    body.message = 'Invalid JSON body';
  } else if (status >= 500 && process.env.NODE_ENV === 'production') {
    body.message = 'Internal Server Error';
  }

  if (err.errors) {
    body.errors = err.errors;
  }

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
