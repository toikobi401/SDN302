// Đáp án Bài 7 - copy file này vào myapp/routes/articleRouter.js
// Sau đó trong myapp/app.js thêm:
//   var articleRouter = require('./routes/articleRouter');
//   app.use('/articles', articleRouter);      // đặt cạnh app.use('/users', usersRouter)
const express = require('express');

const articleRouter = express.Router();

articleRouter.use(express.json());
articleRouter.use(express.urlencoded({ extended: true }));

articleRouter
  .route('/')
  .get((req, res) => {
    res.status(200).end('Will send all the articles to you!');
  })
  .post((req, res) => {
    res
      .status(201)
      .end(`Will add the article: ${req.body.title} with details: ${req.body.text} and ${req.body.date}`);
  })
  .put((req, res) => {
    res.status(403).end('PUT operation not supported on /articles');
  })
  .delete((req, res) => {
    res.status(200).end('Deleting all articles');
  });

articleRouter
  .route('/:id')
  .get((req, res) => {
    res.status(200).end(`Will send details of the article: ${req.params.id} to you!`);
  })
  .post((req, res) => {
    res.status(403).end(`POST operation not supported on /articles/${req.params.id}`);
  })
  .put((req, res) => {
    // Slide viết res.write() trước rồi mới res.status(201) -> status bị bỏ qua (vẫn là 200).
    // Muốn đổi status thì phải gọi TRƯỚC res.write().
    res.status(200);
    res.write(`Updating the article: ${req.params.id}\n`);
    res.end(`Will update the article: ${req.body.title} with details: ${req.body.text} and ${req.body.date}`);
  })
  .delete((req, res) => {
    res.status(200).end(`Deleting article: ${req.params.id}`);
  });

module.exports = articleRouter;
