// Gửi cùng một bộ request tới cả 3 server và in bảng status code để so sánh.
// Chạy 3 server trước, sau đó: node test.mjs
const servers = {
  'Node thuần': 'http://localhost:3001',
  Express: 'http://localhost:3002',
  NestJS: 'http://localhost:3003',
};

const json = { 'Content-Type': 'application/json' };
const cases = [
  ['POST /users {"name":"An"}', 'POST', '/users', '{"name":"An"}'],
  ['POST /users {}', 'POST', '/users', '{}'],
  ['POST /users {"name":123}', 'POST', '/users', '{"name":123}'],
  ['POST /users (JSON sai)', 'POST', '/users', '{name:'],
  ['GET /users/1', 'GET', '/users/1'],
  ['GET /users/99', 'GET', '/users/99'],
  ['GET /users/abc', 'GET', '/users/abc'],
];

const rows = [];
for (const [label, method, path, body] of cases) {
  const row = { 'Test case': label };
  for (const [name, base] of Object.entries(servers)) {
    try {
      const res = await fetch(base + path, { method, headers: body && json, body });
      row[name] = `${res.status} ${(await res.text()).slice(0, 60)}`;
    } catch {
      row[name] = 'server chưa chạy';
    }
  }
  rows.push(row);
}
console.table(rows);
