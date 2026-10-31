const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { assert } = require('../lib/http');

async function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  assert(header.startsWith('Bearer '), 401, 'UNAUTHORIZED', 'Bearer token is required');
  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'bookstore-api', audience: 'bookstore-web' });
  } catch {
    assert(false, 401, 'INVALID_TOKEN', 'Token is invalid or expired');
  }
  assert(typeof payload.sub === 'string' && /^[a-f\d]{24}$/i.test(payload.sub), 401, 'INVALID_TOKEN', 'Invalid token subject');
  const user = await User.findById(payload.sub).select('+tokenVersion');
  assert(user && user.isActive && (user.tokenVersion || 0) === payload.version, 401, 'INVALID_TOKEN', 'Session has been revoked');
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  assert(req.user?.role === 'ADMIN', 403, 'FORBIDDEN', 'Administrator permission is required');
  next();
}

function rateLimit({ limit, windowMs }) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    // No background timers; expired entries are removed on requests.
    for (const [key, value] of clients) if (value.reset <= now) clients.delete(key);
    const key = req.ip;
    const entry = clients.get(key) || { count: 0, reset: now + windowMs };
    entry.count += 1;
    clients.set(key, entry);
    if (entry.count > limit) res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
    assert(entry.count <= limit, 429, 'RATE_LIMITED', 'Too many requests; try again later');
    next();
  };
}

module.exports = { requireAuth, requireAdmin, rateLimit };
