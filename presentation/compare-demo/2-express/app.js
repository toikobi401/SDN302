const express = require('express');

const app = express();
app.use(express.json());

const users = [];

app.post('/users', (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== 'string' || !name) {
    return res.status(400).json({ message: 'name is required' });
  }
  const user = { id: users.length + 1, name };
  users.push(user);
  res.status(201).json(user);
});

app.get('/users/:id', (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

const port = process.env.PORT ?? 3002;
app.listen(port, () => console.log(`Express chạy tại http://localhost:${port}`));
