const path = require('node:path');
const express = require('express');
const morgan = require('morgan');

const courseHeader = require('./middlewares/courseHeader');
const requestCounter = require('./middlewares/requestCounter');
const requestTime = require('./middlewares/requestTime');
const requireApiKey = require('./middlewares/requireApiKey');

const app = express();
const port = 3000;

// TODO 1 (third-party): dùng morgan('dev') để log request
//         Gợi ý: bọc trong if (process.env.NODE_ENV !== 'test') để lúc chấm bài đỡ rối màn hình

// TODO 2 (application-level): dùng courseHeader và requestCounter cho MỌI request
//         Suy nghĩ: phải đặt TRƯỚC hay SAU express.static để file tĩnh cũng có header X-Course?

// TODO 3 (built-in): phục vụ file tĩnh trong thư mục public bằng express.static
//         GET /              -> public/index.html
//         GET /css/style.css -> public/css/style.css

// TODO 4: dùng requestTime, sau đó viết 2 route:
//         GET /time  -> JSON { "requestTime": req.requestTime }
//         GET /stats -> JSON { "totalRequests": <tổng số request đã nhận> }

// TODO 5 (router-level): tạo adminRouter = express.Router()
//         - adminRouter.use(requireApiKey)  -> bảo vệ MỌI route bên trong /admin
//         - GET /admin/dashboard -> JSON { "message": "Welcome admin" }
//         - gắn router vào app ở đường dẫn /admin

// TODO 6: Mọi route khác -> 404, JSON { "message": "Not Found" }

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
