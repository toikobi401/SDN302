// Các test chạy TUẦN TỰ và dùng chung dữ liệu trong bộ nhớ (4 sinh viên ban đầu).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { load, startServer, request } = require('./helpers');

const BASE = '/api/students';
let server;

before(async () => {
  server = await startServer(load('challenge-student-api'));
});
after(() => server.close());

const call = (method, url, options) => request(server.base, method, url, options);

function assertJsonError(res, status, message) {
  assert.equal(res.status, status);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/, 'Lỗi phải trả về JSON');
  assert.equal(res.body?.status, status, 'Body lỗi phải có field status');
  assert.equal(res.body?.message, message);
}

// ---------- Cấu trúc ----------

test('routes/studentRouter.js export một express.Router()', () => {
  let studentRouter;
  try {
    studentRouter = load('challenge-student-api', 'routes/studentRouter.js');
  } catch (err) {
    assert.fail(`Không require được routes/studentRouter.js: ${err.message}`);
  }
  assert.equal(typeof studentRouter.route, 'function', 'Phải export một express.Router()');
});

// ---------- requestId ----------

test('Mọi response có header X-Request-Id, mỗi request một giá trị khác nhau', async () => {
  const a = await call('GET', BASE);
  const b = await call('GET', '/khong-ton-tai');
  const idA = a.headers.get('x-request-id');
  const idB = b.headers.get('x-request-id');
  assert.ok(idA, 'Thiếu X-Request-Id ở GET /api/students');
  assert.ok(idB, 'Thiếu X-Request-Id ở response 404');
  assert.notEqual(idA, idB);
});

// ---------- GET ----------

test('GET /api/students -> { count, data }', async () => {
  const res = await call('GET', BASE);
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 4);
  assert.equal(res.body.data.length, 4);
});

test('GET /api/students?minGpa=3.5 -> chỉ sinh viên có gpa >= 3.5', async () => {
  const res = await call('GET', `${BASE}?minGpa=3.5`);
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
  assert.ok(res.body.data.every((s) => s.gpa >= 3.5));
});

test('GET /api/students?minGpa=abc -> 400', async () => {
  const res = await call('GET', `${BASE}?minGpa=abc`);
  assertJsonError(res, 400, 'minGpa must be a number');
});

test('GET /api/students/:id -> 200 / 400 / 404', async () => {
  const found = await call('GET', `${BASE}/2`);
  assert.equal(found.status, 200);
  assert.equal(found.body.name, 'Trần Thị Bình');

  assertJsonError(await call('GET', `${BASE}/abc`), 400, 'Invalid student id: abc');
  assertJsonError(await call('GET', `${BASE}/999`), 404, 'Student not found');
});

// ---------- POST ----------

test('POST body rỗng -> 400 Validation failed với 3 lỗi', async () => {
  const res = await call('POST', BASE, { json: {} });
  assertJsonError(res, 400, 'Validation failed');
  assert.ok(Array.isArray(res.body.errors), 'Phải có mảng errors');
  assert.equal(res.body.errors.length, 3);
});

test('POST dữ liệu sai kiểu -> 400, errors chỉ ra đúng field sai', async () => {
  const badGpa = await call('POST', BASE, { json: { name: 'A', email: 'a@example.com', gpa: 5 } });
  assertJsonError(badGpa, 400, 'Validation failed');
  assert.equal(badGpa.body.errors.length, 1);
  assert.match(badGpa.body.errors[0], /gpa/);

  const gpaString = await call('POST', BASE, { json: { name: 'A', email: 'a@example.com', gpa: '3.5' } });
  assert.equal(gpaString.status, 400, 'gpa phải là number, không nhận string "3.5"');

  const badEmail = await call('POST', BASE, { json: { name: 'A', email: 'not-an-email', gpa: 3 } });
  assert.equal(badEmail.status, 400);
  assert.match(badEmail.body.errors[0], /email/);

  const blankName = await call('POST', BASE, { json: { name: '   ', email: 'b@example.com', gpa: 3 } });
  assert.equal(blankName.status, 400, 'name chỉ toàn khoảng trắng phải bị từ chối');
  assert.match(blankName.body.errors[0], /name/);
});

test('POST email đã tồn tại (không phân biệt hoa thường) -> 409', async () => {
  const res = await call('POST', BASE, { json: { name: 'Copy', email: 'AN.NV@example.com', gpa: 3 } });
  assertJsonError(res, 409, 'Email already exists');
});

test('POST hợp lệ -> 201, id = 5', async () => {
  const res = await call('POST', BASE, {
    json: { name: 'Võ Thị Em', email: 'em.vt@example.com', gpa: 3.9 },
  });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { id: 5, name: 'Võ Thị Em', email: 'em.vt@example.com', gpa: 3.9 });

  const list = await call('GET', BASE);
  assert.equal(list.body.count, 5);
});

test('POST JSON sai cú pháp -> 400 Invalid JSON body', async () => {
  const res = await call('POST', BASE, {
    raw: '{"name": "Broken"',
    headers: { 'Content-Type': 'application/json' },
  });
  assertJsonError(res, 400, 'Invalid JSON body');
});

// ---------- PUT ----------

test('PUT /api/students/3 cập nhật một phần -> 200', async () => {
  const res = await call('PUT', `${BASE}/3`, { json: { gpa: 3.0 } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { id: 3, name: 'Lê Hoàng Cường', email: 'cuong.lh@example.com', gpa: 3.0 });
});

test('PUT body rỗng hoặc sai kiểu -> 400', async () => {
  assertJsonError(await call('PUT', `${BASE}/3`, { json: {} }), 400, 'Validation failed');
  assertJsonError(await call('PUT', `${BASE}/3`, { json: { gpa: -1 } }), 400, 'Validation failed');
});

test('PUT đổi sang email của người khác -> 409, giữ nguyên email của chính mình -> 200', async () => {
  const conflict = await call('PUT', `${BASE}/3`, { json: { email: 'binh.tt@example.com' } });
  assertJsonError(conflict, 409, 'Email already exists');

  const same = await call('PUT', `${BASE}/3`, { json: { email: 'cuong.lh@example.com' } });
  assert.equal(same.status, 200);
});

test('PUT /api/students/999 -> 404', async () => {
  const res = await call('PUT', `${BASE}/999`, { json: { gpa: 3 } });
  assertJsonError(res, 404, 'Student not found');
});

// ---------- DELETE ----------

test('DELETE /api/students/1 -> 204 không có body, sau đó -> 404', async () => {
  const res = await call('DELETE', `${BASE}/1`);
  assert.equal(res.status, 204);
  assert.equal(res.text, '');

  assertJsonError(await call('GET', `${BASE}/1`), 404, 'Student not found');
  assertJsonError(await call('DELETE', `${BASE}/1`), 404, 'Student not found');
});

test('POST sau khi xoá không sinh id trùng', async () => {
  const res = await call('POST', BASE, { json: { name: 'Mới', email: 'moi@example.com', gpa: 2 } });
  assert.equal(res.status, 201);

  const list = await call('GET', BASE);
  const ids = list.body.data.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, `Có id bị trùng: [${ids.join(', ')}]`);
});

// ---------- Không hỗ trợ / không tồn tại ----------

test('PUT và DELETE trên /api/students -> 403', async () => {
  assertJsonError(await call('PUT', BASE, { json: {} }), 403, 'PUT operation not supported on /api/students');
  assertJsonError(await call('DELETE', BASE), 403, 'DELETE operation not supported on /api/students');
});

test('Route không tồn tại -> 404 JSON', async () => {
  assertJsonError(await call('GET', '/api/teachers'), 404, 'Route GET /api/teachers not found');
});
