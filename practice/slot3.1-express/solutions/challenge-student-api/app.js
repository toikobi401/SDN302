const express = require('express');
const morgan = require('morgan');

const requestId = require('./middlewares/requestId');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const studentRouter = require('./routes/studentRouter');

const app = express();
const port = 3000;

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(requestId);
app.use(express.json());

app.use('/api/students', studentRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Student API listening at http://localhost:${port}`);
  });
}
