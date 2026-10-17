// Middleware SỬA ĐỔI REQUEST: gắn thêm thuộc tính cho req để các handler phía sau dùng
module.exports = (req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
};
