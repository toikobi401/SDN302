const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { load, startServer, request } = require('./helpers');

let server;
before(async () => {
  server = await startServer(load('ex5-error-handling'));
});
after(() => server.close());

function assertJsonError(res, status, message) {
  assert.equal(res.status, status);
  assert.match(
    res.headers.get('content-type') ?? '',
    /application\/json/,
    'Lỗi phải trả về JSON (đã có error-handling middleware 4 tham số chưa?)'
  );
  assert.deepEqual(res.body, { status, message });
}

test('GET /books vẫn hoạt động bình thường', async () => {
  const res = await request(server.base, 'GET', '/books');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 3);
});

test('GET /books/1 -> 200', async () => {
  const res = await request(server.base, 'GET', '/books/1');
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Clean Code');
});

test('GET /books/abc -> 400 Invalid book id', async () => {
  const res = await request(server.base, 'GET', '/books/abc');
  assertJsonError(res, 400, 'Invalid book id: abc');
});

test('GET /books/999 -> 404 Book not found', async () => {
  const res = await request(server.base, 'GET', '/books/999');
  assertJsonError(res, 404, 'Book not found');
});

test('POST /books thiếu author -> 400', async () => {
  const res = await request(server.base, 'POST', '/books', { json: { title: 'Only title' } });
  assertJsonError(res, 400, 'title and author are required');
});

test('POST /books hợp lệ -> 201', async () => {
  const res = await request(server.base, 'POST', '/books', {
    json: { title: 'Refactoring', author: 'Martin Fowler' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.id, 4);
});

test('POST /books với JSON sai cú pháp -> 400 Invalid JSON body', async () => {
  const res = await request(server.base, 'POST', '/books', {
    raw: '{"title": "Broken",',
    headers: { 'Content-Type': 'application/json' },
  });
  assertJsonError(res, 400, 'Invalid JSON body');
});

test('GET /boom (lỗi đồng bộ) -> 500', async () => {
  const res = await request(server.base, 'GET', '/boom');
  assertJsonError(res, 500, 'Boom!');
});

test('GET /async-boom (lỗi bất đồng bộ) -> 500, không bị treo', async () => {
  const res = await request(server.base, 'GET', '/async-boom');
  assertJsonError(res, 500, 'Async boom!');
});

test('Route không tồn tại -> 404 JSON có method và url', async () => {
  const res = await request(server.base, 'GET', '/khong-ton-tai');
  assertJsonError(res, 404, 'Route GET /khong-ton-tai not found');

  const res2 = await request(server.base, 'DELETE', '/books');
  assertJsonError(res2, 404, 'Route DELETE /books not found');
});
