const express = require('express');

const app = express();
const port = 3000;

// TODO 1: GET /  -> trả về HTML: <h1>Welcome to My Bookstore</h1>
// 1. Trang chủ: res.send() với chuỗi HTML -> Content-Type: text/html
app.get('/', (req, res) => {
  res.send('<h1>Welcome to My Bookstore</h1>');
});

// TODO 2: GET /hello  -> trả về text: Hello, World!
app.get('/hello', (req, res) => {
  res.send('Hello, World!');
});

// TODO 3: GET /hello/:name  -> trả về JSON: { "message": "Hello, <name>!" }
app.get('/hello/:name', (req, res) => {
  res.json({ message: `Hello, ${req.params.name}!` });
});
// TODO 4: GET /sum/:a/:b  -> trả về JSON: { "a": 3, "b": 5, "sum": 8 }
//          Nếu a hoặc b không phải số -> status 400, JSON: { "message": "a and b must be numbers" }
app.get('/sum/:a/:b', (req, res) => {
  const a = Number(req.params.a);
  const b = Number(req.params.b);

  if (Number.isNaN(a) || Number.isNaN(b)) {
    return res.status(400).json({ message: 'a and b must be numbers' });
  }

  res.json({ a, b, sum: a + b });
});

// TODO 5: GET /about  -> trả về JSON: { "course": "SDN302", "slot": "3.1", "framework": "Express" }
app.get('/about', (req, res) => {
  res.json({ course: 'SDN302', slot: '3.1', framework: 'Express' });
});
// TODO 6: Mọi route khác -> status 404, text: Sorry, that route doesn't exist. Have a nice day!
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
