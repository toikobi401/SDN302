const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { load, startServer, request } = require('./helpers');

let server;
before(async () => {
  server = await startServer(load('ex4-middleware'));
});
after(() => server.close());

const KEY = { 'x-api-key': 'sdn302-secret' };

test('express.static: GET / trả về public/index.html', async () => {
  const res = await request(server.base, 'GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  assert.match(res.text, /My Bookstore/);
});

test('express.static: GET /css/style.css trả về file CSS', async () => {
  const res = await request(server.base, 'GET', '/css/style.css');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/css/);
});

test('courseHeader: mọi response (kể cả file tĩnh và 404) đều có header X-Course: SDN302', async () => {
  for (const url of ['/', '/css/style.css', '/time', '/khong-ton-tai']) {
    const res = await request(server.base, 'GET', url);
    assert.equal(res.headers.get('x-course'), 'SDN302', `Thiếu header X-Course ở ${url}`);
  }
});

test('requestTime: GET /time trả về thời điểm request dạng ISO string', async () => {
  const res = await request(server.base, 'GET', '/time');
  assert.equal(res.status, 200);
  assert.equal(typeof res.body?.requestTime, 'string', 'Thiếu requestTime trong JSON');
  assert.equal(new Date(res.body.requestTime).toISOString(), res.body.requestTime, 'Không phải ISO string');
  assert.ok(Math.abs(Date.now() - Date.parse(res.body.requestTime)) < 5000, 'Thời gian lệch quá xa hiện tại');
});

test('requestCounter: mỗi request làm totalRequests tăng đúng 1', async () => {
  const first = await request(server.base, 'GET', '/stats');
  assert.equal(first.status, 200);
  assert.equal(typeof first.body?.totalRequests, 'number', 'totalRequests phải là number');

  await request(server.base, 'GET', '/time');
  const second = await request(server.base, 'GET', '/stats');
  assert.equal(second.body.totalRequests - first.body.totalRequests, 2);
});

test('requireApiKey: thiếu hoặc sai x-api-key -> 401', async () => {
  const noKey = await request(server.base, 'GET', '/admin/dashboard');
  assert.equal(noKey.status, 401);
  assert.deepEqual(noKey.body, { message: 'Unauthorized' });

  const wrongKey = await request(server.base, 'GET', '/admin/dashboard', {
    headers: { 'x-api-key': 'hacker' },
  });
  assert.equal(wrongKey.status, 401);
});

test('requireApiKey: đúng x-api-key -> 200', async () => {
  const res = await request(server.base, 'GET', '/admin/dashboard', { headers: KEY });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: 'Welcome admin' });
});

test('Router-level: MỌI đường dẫn dưới /admin đều bị chặn khi thiếu key, route ngoài /admin thì không', async () => {
  const adminAny = await request(server.base, 'GET', '/admin/bat-ky');
  assert.equal(adminAny.status, 401, 'requireApiKey phải chạy trước khi tìm route trong adminRouter');

  const publicRoute = await request(server.base, 'GET', '/time');
  assert.equal(publicRoute.status, 200, '/time không được yêu cầu API key');
});

test('Route không tồn tại -> 404 JSON', async () => {
  const res = await request(server.base, 'GET', '/khong-ton-tai');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { message: 'Not Found' });
});
