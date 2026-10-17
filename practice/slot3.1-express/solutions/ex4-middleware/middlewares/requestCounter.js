// Middleware THỰC THI CODE BẤT KỲ: đếm tổng số request server đã nhận.
// app.locals là object dùng chung cho cả app, truy cập được qua req.app.locals
module.exports = (req, res, next) => {
  req.app.locals.requestCount = (req.app.locals.requestCount || 0) + 1;
  next();
};
