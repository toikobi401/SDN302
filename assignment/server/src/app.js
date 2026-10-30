const express = require('express');
const cors = require('cors');
const { randomUUID } = require('node:crypto');
const { errorHandler, assert } = require('./lib/http');

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
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  if (req.body !== undefined) assert(req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body), 400, 'INVALID_INPUT', 'Expected a JSON object');
  next();
});
app.get('/api/health', (req, res) => res.json({ data: { status: 'ok' } }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalog'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/admin/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/images'));
app.use('/api', require('./routes/orders'));
app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found', requestId: req.requestId } }));
app.use(errorHandler);

module.exports = app;
