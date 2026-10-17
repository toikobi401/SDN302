// Tạo Error kèm HTTP status (và danh sách lỗi chi tiết nếu có) cho error handler
function createError(status, message, errors) {
  const err = new Error(message);
  err.status = status;
  if (errors) err.errors = errors;
  return err;
}

module.exports = createError;
