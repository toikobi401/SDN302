const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { load, startServer, request } = require('./helpers');

let server;
before(async () => {
  server = await startServer(load('ex6-router'));
});
after(() => server.close());

const NOT_FOUND = { message: 'Book not found' };

test('routes/bookRouter.js export một express.Router()', () => {
  const bookRouter = load('ex6-router', 'routes/bookRouter.js');
  assert.equal(typeof bookRouter, 'function', 'Phải module.exports = bookRouter');
  assert.equal(typeof bookRouter.route, 'function', 'bookRouter phải được tạo bằng express.Router()');
  assert.ok(bookRouter.stack.length > 0, 'bookRouter chưa có route nào');
});

test('GET / -> indexRouter trả về lời chào', async () => {
  const res = await request(server.base, 'GET', '/');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { message: 'Welcome to Bookstore API', endpoints: ['/api/books'] });
});

test('GET /api/books -> 200, mảng 3 sách', async () => {
  const res = await request(server.base, 'GET', '/api/books');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 3);
});

test('Đường dẫn cũ /books không còn tồn tại -> 404', async () => {
  const res = await request(server.base, 'GET', '/books');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { message: 'Not Found' });
});

test('POST /api/books -> 201 (JSON) và -> 400 khi thiếu field', async () => {
  const created = await request(server.base, 'POST', '/api/books', {
    json: { title: 'Refactoring', author: 'Martin Fowler', year: 1999 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.id, 4);

  const invalid = await request(server.base, 'POST', '/api/books', { json: { author: 'Nobody' } });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body, { message: 'title and author are required' });
});

test('POST /api/books bằng HTML form (urlencoded) -> 201', async () => {
  const res = await request(server.base, 'POST', '/api/books', {
    form: { title: 'Design Patterns', author: 'GoF' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Design Patterns');
});

test('PUT và DELETE trên /api/books -> 403', async () => {
  const put = await request(server.base, 'PUT', '/api/books', { json: {} });
  assert.equal(put.status, 403);
  assert.deepEqual(put.body, { message: 'PUT operation not supported on /api/books' });

  const del = await request(server.base, 'DELETE', '/api/books');
  assert.equal(del.status, 403);
  assert.deepEqual(del.body, { message: 'DELETE operation not supported on /api/books' });
});

test('GET /api/books/:id -> 200 / 404', async () => {
  const found = await request(server.base, 'GET', '/api/books/3');
  assert.equal(found.status, 200);
  assert.equal(found.body.author, 'Tô Hoài');

  const missing = await request(server.base, 'GET', '/api/books/999');
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, NOT_FOUND);
});

test('POST /api/books/:id -> 403', async () => {
  const res = await request(server.base, 'POST', '/api/books/3', { json: {} });
  assert.equal(res.status, 403);
  assert.deepEqual(res.body, { message: 'POST operation not supported on /api/books/3' });
});

test('PUT /api/books/:id -> 200 (không đổi id) / 404', async () => {
  const res = await request(server.base, 'PUT', '/api/books/3', { json: { title: 'Dế Mèn', id: 99 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 3);
  assert.equal(res.body.title, 'Dế Mèn');
  assert.equal(res.body.author, 'Tô Hoài');

  const missing = await request(server.base, 'PUT', '/api/books/999', { json: { title: 'X' } });
  assert.equal(missing.status, 404);
});

test('DELETE /api/books/:id -> 200 / 404', async () => {
  const res = await request(server.base, 'DELETE', '/api/books/1');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 1);

  const again = await request(server.base, 'DELETE', '/api/books/1');
  assert.equal(again.status, 404);
  assert.deepEqual(again.body, NOT_FOUND);
});
