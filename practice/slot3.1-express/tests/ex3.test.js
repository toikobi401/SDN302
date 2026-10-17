// Các test chạy TUẦN TỰ và dùng chung dữ liệu trong bộ nhớ (3 cuốn sách ban đầu).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { load, startServer, request } = require('./helpers');

let server;
before(async () => {
  server = await startServer(load('ex3-crud-in-memory'));
});
after(() => server.close());

const NOT_FOUND = { message: 'Book not found' };

test('GET /books -> 200, JSON mảng 3 cuốn sách', async () => {
  const res = await request(server.base, 'GET', '/books');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.ok(Array.isArray(res.body), 'Phải trả về một mảng');
  assert.equal(res.body.length, 3);
});

test('GET /books/2 -> 200, đúng cuốn sách id 2 (so sánh number với string param)', async () => {
  const res = await request(server.base, 'GET', '/books/2');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 2);
  assert.equal(res.body.author, 'Kyle Simpson');
});

test('GET /books/999 -> 404', async () => {
  const res = await request(server.base, 'GET', '/books/999');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, NOT_FOUND);
});

test('POST /books thiếu author -> 400', async () => {
  const res = await request(server.base, 'POST', '/books', { json: { title: 'No Author' } });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { message: 'title and author are required' });
});

test('POST /books hợp lệ -> 201, sách mới có id 4 và được lưu lại', async () => {
  const res = await request(server.base, 'POST', '/books', {
    json: { title: 'Refactoring', author: 'Martin Fowler', year: 1999 },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.id, 4);
  assert.equal(res.body.title, 'Refactoring');
  assert.equal(res.body.author, 'Martin Fowler');

  const list = await request(server.base, 'GET', '/books');
  assert.equal(list.body.length, 4);
});

test('PUT /books/1 -> 200, chỉ cập nhật field gửi lên và KHÔNG đổi id', async () => {
  const res = await request(server.base, 'PUT', '/books/1', { json: { year: 2009, id: 100 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 1, 'id không được thay đổi');
  assert.equal(res.body.year, 2009);
  assert.equal(res.body.title, 'Clean Code', 'Các field không gửi lên phải giữ nguyên');

  const again = await request(server.base, 'GET', '/books/1');
  assert.equal(again.body.year, 2009, 'Thay đổi phải được lưu vào mảng books');
});

test('PUT /books/999 -> 404', async () => {
  const res = await request(server.base, 'PUT', '/books/999', { json: { title: 'X' } });
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, NOT_FOUND);
});

test('DELETE /books/2 -> 200, trả về sách đã xoá và sách biến mất khỏi danh sách', async () => {
  const res = await request(server.base, 'DELETE', '/books/2');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 2);

  const gone = await request(server.base, 'GET', '/books/2');
  assert.equal(gone.status, 404);
});

test('DELETE /books/999 -> 404', async () => {
  const res = await request(server.base, 'DELETE', '/books/999');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, NOT_FOUND);
});

test('POST sau khi xoá không được sinh id trùng (bẫy books.length + 1)', async () => {
  const res = await request(server.base, 'POST', '/books', {
    json: { title: 'The Pragmatic Programmer', author: 'Andy Hunt' },
  });
  assert.equal(res.status, 201);

  const list = await request(server.base, 'GET', '/books');
  const ids = list.body.map((book) => book.id);
  assert.equal(new Set(ids).size, ids.length, `Có id bị trùng: [${ids.join(', ')}]`);
});
