const http = require('http');

const users = [];

const server = http.createServer((req, res) => {
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/users\/(\d+)$/);

  if (req.method === 'POST' && url.pathname === '/users') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return send(400, { message: 'Invalid JSON' });
      }
      if (typeof data.name !== 'string' || !data.name) {
        return send(400, { message: 'name is required' });
      }
      const user = { id: users.length + 1, name: data.name };
      users.push(user);
      send(201, user);
    });
  } else if (req.method === 'GET' && match) {
    const user = users.find((u) => u.id === Number(match[1]));
    user ? send(200, user) : send(404, { message: 'User not found' });
  } else {
    send(404, { message: 'Route not found' });
  }
});

const port = process.env.PORT ?? 3001;
server.listen(port, () => console.log(`Node.js thuần chạy tại http://localhost:${port}`));
