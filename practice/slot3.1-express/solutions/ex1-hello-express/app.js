const express = require('express');

const app = express();
const port = 3000;

// 1. Trang chủ: res.send() với chuỗi HTML -> Content-Type: text/html
app.get('/', (req, res) => {
  res.send('<h1>Welcome to My Bookstore</h1>');
});

// 2. Route tĩnh trả về text
app.get('/hello', (req, res) => {
  res.send('Hello, World!');
});

// 3. Route có tham số -> đọc bằng req.params
app.get('/hello/:name', (req, res) => {
  res.json({ message: `Hello, ${req.params.name}!` });
});

// 4. Hai tham số - chú ý req.params luôn là STRING, phải ép kiểu trước khi cộng
app.get('/sum/:a/:b', (req, res) => {
  const a = Number(req.params.a);
  const b = Number(req.params.b);

  if (Number.isNaN(a) || Number.isNaN(b)) {
    return res.status(400).json({ message: 'a and b must be numbers' });
  }

  res.json({ a, b, sum: a + b });
});

// 5. Trả về JSON bằng res.json()
app.get('/about', (req, res) => {
  res.json({ course: 'SDN302', slot: '3.1', framework: 'Express' });
});

// 6. Middleware 404 - luôn đặt SAU tất cả các route
app.use((req, res) => {
  res.status(404).send("Sorry, that route doesn't exist. Have a nice day!");
});

module.exports = app;

// Chỉ listen khi chạy trực tiếp `node app.js` (khi test require file này thì không listen)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
