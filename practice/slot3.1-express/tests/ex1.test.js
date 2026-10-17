const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { load, startServer, request } = require('./helpers');

let server;
before(async () => {
  server = await startServer(load('ex1-hello-express'));
});
after(() => server.close());

test('GET / trả về HTML chứa <h1>Welcome to My Bookstore</h1>', async () => {
  const res = await request(server.base, 'GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  assert.match(res.text, /<h1>Welcome to My Bookstore<\/h1>/);
});

test('GET /hello trả về "Hello, World!"', async () => {
  const res = await request(server.base, 'GET', '/hello');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'Hello, World!');
});

test('GET /hello/:name trả về JSON lời chào với tên (kể cả tên có dấu cách)', async () => {
  const res = await request(server.base, 'GET', '/hello/Dat');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(res.body, { message: 'Hello, Dat!' });

  const res2 = await request(server.base, 'GET', '/hello/Nguyen%20Van%20A');
  assert.deepEqual(res2.body, { message: 'Hello, Nguyen Van A!' });
});

test('GET /sum/3/5 cộng SỐ chứ không nối chuỗi ("35")', async () => {
  const res = await request(server.base, 'GET', '/sum/3/5');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { a: 3, b: 5, sum: 8 });
});

test('GET /sum/abc/5 trả về 400 khi tham số không phải số', async () => {
  const res = await request(server.base, 'GET', '/sum/abc/5');
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { message: 'a and b must be numbers' });
});

test('GET /about trả về JSON thông tin môn học', async () => {
  const res = await request(server.base, 'GET', '/about');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(res.body, { course: 'SDN302', slot: '3.1', framework: 'Express' });
});

test('Route không tồn tại trả về 404 với thông báo tuỳ chỉnh', async () => {
  for (const url of ['/khong-ton-tai', '/hello/a/b/c']) {
    const res = await request(server.base, 'GET', url);
    assert.equal(res.status, 404, `${url} phải trả về 404`);
    assert.equal(res.text, "Sorry, that route doesn't exist. Have a nice day!");
  }
  const res = await request(server.base, 'POST', '/hello');
  assert.equal(res.status, 404, 'POST /hello cũng phải 404 vì chỉ định nghĩa GET');
});
