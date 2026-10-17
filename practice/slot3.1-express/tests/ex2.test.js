const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { load, startServer, request } = require('./helpers');

let server;
before(async () => {
  server = await startServer(load('ex2-restful-routes'));
});
after(() => server.close());

const book = { title: 'Clean Code', author: 'Robert C. Martin' };

test('GET /books -> 200 và Content-Type text/plain (set bởi app.all)', async () => {
  const res = await request(server.base, 'GET', '/books');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'Will send all the books to you!');
  assert.match(res.headers.get('content-type') ?? '', /^text\/plain/);
});

test('POST /books với body JSON -> 201', async () => {
  const res = await request(server.base, 'POST', '/books', { json: book });
  assert.equal(res.status, 201);
  assert.equal(res.text, 'Will add the book: Clean Code by Robert C. Martin');
});

test('POST /books với body x-www-form-urlencoded (HTML form) -> 201', async () => {
  const res = await request(server.base, 'POST', '/books', { form: book });
  assert.equal(res.status, 201, 'Bạn đã khai báo express.urlencoded() chưa?');
  assert.equal(res.text, 'Will add the book: Clean Code by Robert C. Martin');
});

test('PUT /books -> 403', async () => {
  const res = await request(server.base, 'PUT', '/books', { json: book });
  assert.equal(res.status, 403);
  assert.equal(res.text, 'PUT operation not supported on /books');
});

test('DELETE /books -> 200', async () => {
  const res = await request(server.base, 'DELETE', '/books');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'Deleting all books');
});

test('GET /books/new trả về form, KHÔNG bị hiểu nhầm là :id = "new"', async () => {
  const res = await request(server.base, 'GET', '/books/new');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'Will show the form to add a new book');
});

test('GET /books/:id/edit -> 200', async () => {
  const res = await request(server.base, 'GET', '/books/7/edit');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'Will show the form to edit book: 7');
});

test('GET /books/:id -> 200 và Content-Type text/plain', async () => {
  const res = await request(server.base, 'GET', '/books/42');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'Will send details of the book: 42 to you!');
  assert.match(res.headers.get('content-type') ?? '', /^text\/plain/);
});

test('POST /books/:id -> 403', async () => {
  const res = await request(server.base, 'POST', '/books/42', { json: book });
  assert.equal(res.status, 403);
  assert.equal(res.text, 'POST operation not supported on /books/42');
});

test('PUT /books/:id -> 200, trả về 2 dòng', async () => {
  const res = await request(server.base, 'PUT', '/books/42', { json: book });
  assert.equal(res.status, 200);
  assert.equal(
    res.text,
    'Updating the book: 42\nWill update the book: Clean Code by Robert C. Martin'
  );
});

test('DELETE /books/:id -> 200', async () => {
  const res = await request(server.base, 'DELETE', '/books/42');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'Deleting book: 42');
});
