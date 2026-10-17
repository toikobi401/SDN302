let counter = 0;

// Gắn id tăng dần cho mỗi request (req.id) và trả về qua header X-Request-Id
module.exports = (req, res, next) => {
  counter += 1;
  req.id = counter;
  res.set('X-Request-Id', String(req.id));
  next();
};
