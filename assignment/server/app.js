const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { assert } = require('./lib/http');
const { errorHandler, notFound } = require('./middleware/error');

const app = express();
app.disable('x-powered-by');
app.set('query parser', 'simple');
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set('X-Request-Id', req.requestId);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'no-store');
  const started = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({ event: req.user?.role === 'ADMIN' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? 'admin_action' : 'request',
      requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode,
      actor: req.user ? String(req.user._id) : undefined, durationMs: Date.now() - started }));
  });
  next();
});
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  if (req.body !== undefined) assert(req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body), 400, 'INVALID_INPUT', 'Expected a JSON object');
  next();
});
app.get('/api/health', (req, res) => res.json({ data: { status: 'ok' } }));
// Only covers are public. data/books/pdfs must never be served statically.
app.use('/api/covers', express.static(path.join(__dirname, 'data/books/covers'), {
  index: false,
  setHeaders: res => {
    res.set('Cache-Control', 'public, max-age=86400');
    // Some covers are SVG: stop them running scripts if opened directly.
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  },
}));
app.use('/api', require('./routes'));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
