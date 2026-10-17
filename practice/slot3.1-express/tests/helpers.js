// Tiện ích dùng chung cho các file test.
// Test sẽ require app từ exercises/ (mặc định) hoặc solutions/ (khi TARGET=solutions).

const path = require('node:path');

const TARGET = process.env.TARGET === 'solutions' ? 'solutions' : 'exercises';

function load(exerciseDir, file = 'app.js') {
  return require(path.join(__dirname, '..', TARGET, exerciseDir, file));
}

// Khởi động app ở một cổng ngẫu nhiên để không đụng cổng 3000 bạn đang dùng.
function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', (err) => {
      if (err) return reject(err);
      const { port } = server.address();
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
    server.on('error', reject);
  });
}

// Gửi request và trả về { status, headers, text, body } (body = JSON đã parse nếu có).
async function request(base, method, url, { json, form, raw, headers = {} } = {}) {
  const init = { method, headers: { ...headers }, signal: AbortSignal.timeout(3000) };

  if (json !== undefined) {
    init.body = JSON.stringify(json);
    init.headers['Content-Type'] = 'application/json';
  } else if (form !== undefined) {
    init.body = new URLSearchParams(form).toString();
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (raw !== undefined) {
    init.body = raw;
  }

  let res;
  try {
    res = await fetch(base + url, init);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error(
        `${method} ${url} bị treo quá 3 giây - có middleware/route nào quên gọi res.send()/res.json() hoặc next() không?`
      );
    }
    throw err;
  }

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: res.status, headers: res.headers, text, body };
}

module.exports = { TARGET, load, startServer, request };
