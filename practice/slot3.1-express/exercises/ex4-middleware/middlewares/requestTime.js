// TODO: Gắn req.requestTime = thời điểm hiện tại dạng ISO string (new Date().toISOString())
//       rồi chuyển sang middleware kế tiếp
module.exports = (req, res, next) => {
  next();
};
