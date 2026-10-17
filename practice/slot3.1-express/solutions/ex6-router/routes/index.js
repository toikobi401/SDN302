const express = require('express');

const indexRouter = express.Router();

indexRouter.get('/', (req, res) => {
  res.json({ message: 'Welcome to Bookstore API', endpoints: ['/api/books'] });
});

module.exports = indexRouter;
