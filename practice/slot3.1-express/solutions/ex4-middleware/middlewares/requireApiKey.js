const API_KEY = 'sdn302-secret';

// Middleware KẾT THÚC CHU TRÌNH request-response: nếu sai key thì trả lời luôn, KHÔNG gọi next()
module.exports = (req, res, next) => {
  if (req.get('x-api-key') !== API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};
