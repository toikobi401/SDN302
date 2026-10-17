// TODO: Gắn header "X-Course: SDN302" vào response rồi chuyển sang middleware kế tiếp
module.exports = (req, res, next) => {
  next();
};
