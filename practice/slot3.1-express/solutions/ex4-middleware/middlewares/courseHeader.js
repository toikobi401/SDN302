// Middleware SỬA ĐỔI RESPONSE: gắn thêm header cho mọi response
module.exports = (req, res, next) => {
  res.set('X-Course', 'SDN302');
  next();
};
