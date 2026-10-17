const API_KEY = 'sdn302-secret';

// TODO: Nếu header "x-api-key" của request KHÁC API_KEY
//         -> trả về 401, JSON { "message": "Unauthorized" } và KHÔNG gọi next()
//       Ngược lại -> gọi next()
module.exports = (req, res, next) => {
  next();
};
