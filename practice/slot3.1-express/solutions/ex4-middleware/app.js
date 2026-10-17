const path = require('node:path');
const express = require('express');
const morgan = require('morgan');

const courseHeader = require('./middlewares/courseHeader');
const requestCounter = require('./middlewares/requestCounter');
const requestTime = require('./middlewares/requestTime');
const requireApiKey = require('./middlewares/requireApiKey');

const app = express();
const port = 3000;

// 1. Third-party middleware: log request (tắt khi chạy test cho đỡ rối màn hình)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 2. Application-level middleware - thứ tự khai báo = thứ tự chạy
app.use(courseHeader); // đặt TRƯỚC static để file tĩnh cũng có header X-Course
app.use(requestCounter);

// 3. Built-in middleware: phục vụ file tĩnh trong thư mục public
//    GET /              -> public/index.html
//    GET /css/style.css -> public/css/style.css
app.use(express.static(path.join(__dirname, 'public')));

app.use(requestTime);

app.get('/time', (req, res) => {
  res.json({ requestTime: req.requestTime });
});

app.get('/stats', (req, res) => {
  res.json({ totalRequests: req.app.locals.requestCount });
});

// 4. Router-level middleware: chỉ áp dụng cho các route bên trong adminRouter
const adminRouter = express.Router();
adminRouter.use(requireApiKey);

adminRouter.get('/dashboard', (req, res) => {
  res.json({ message: 'Welcome admin' });
});

app.use('/admin', adminRouter);

// 5. 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
