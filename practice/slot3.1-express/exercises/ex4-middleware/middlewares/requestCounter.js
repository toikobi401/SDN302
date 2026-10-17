// TODO: Mỗi request tăng req.app.locals.requestCount thêm 1 (lần đầu chưa có thì coi như 0)
//       rồi chuyển sang middleware kế tiếp
module.exports = (req, res, next) => {
  next();
};
