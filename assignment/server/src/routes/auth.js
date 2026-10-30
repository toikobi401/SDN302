const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticate, rateLimit } = require('../middleware/auth');
const { assert, text, pick } = require('../lib/http');

const router = Router();
const loginLimit = rateLimit({ limit: 15, windowMs: 15 * 60 * 1000 });

function publicUser(user) {
  const value = user.toObject();
  delete value.passwordHash;
  delete value.tokenVersion;
  return value;
}

function credentials(body, registration = false) {
  const email = text(body?.email, 'email', { max: 254 }).toLowerCase();
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, 'INVALID_INPUT', 'Invalid email');
  const password = body?.password;
  assert(typeof password === 'string' && password.length >= (registration ? 8 : 1) && Buffer.byteLength(password) <= 72,
    400, 'INVALID_INPUT', 'Password must contain 8–72 bytes when registering (maximum 72 bytes)');
  return { email, password };
}

router.post('/register', loginLimit, async (req, res) => {
  const { email, password } = credentials(req.body, true);
  const name = text(req.body.name, 'name');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'CUSTOMER' });
  res.status(201).json({ data: publicUser(user) });
});

router.post('/login', loginLimit, async (req, res) => {
  const { email, password } = credentials(req.body);
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  // Compare against a valid dummy hash when the email does not exist.
  const hash = user?.passwordHash || '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
  const valid = await bcrypt.compare(password, hash);
  assert(user && valid && user.isActive, 401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  const token = jwt.sign({ version: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    subject: String(user._id), expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    algorithm: 'HS256', issuer: 'bookstore-api', audience: 'bookstore-web',
  });
  res.json({ data: { token, tokenType: 'Bearer', user: publicUser(user) } });
});

router.post('/logout', authenticate, async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json({ data: { message: 'All sessions have been revoked' } });
});

router.get('/me', authenticate, (req, res) => res.json({ data: publicUser(req.user) }));
router.patch('/me', authenticate, async (req, res) => {
  const fields = pick(req.body, ['name', 'phone', 'addresses']);
  if (fields.name !== undefined) fields.name = text(fields.name, 'name');
  if (fields.phone !== undefined) fields.phone = text(fields.phone, 'phone', { max: 30 });
  if (fields.addresses !== undefined) {
    assert(Array.isArray(fields.addresses) && fields.addresses.length <= 20, 400, 'INVALID_INPUT', 'Maximum 20 addresses');
    fields.addresses = fields.addresses.map(entry => {
      assert(entry && typeof entry === 'object' && !Array.isArray(entry), 400, 'INVALID_INPUT', 'Invalid address entry');
      const address = pick(entry.address, ['recipientName', 'phone', 'addressLine', 'ward', 'province']);
      for (const key of ['recipientName', 'phone', 'addressLine', 'province']) address[key] = text(address[key], key, { max: 500 });
      if (address.ward !== undefined) address.ward = text(address.ward, 'ward');
      return { label: text(entry.label, 'label', { optional: true }), address };
    });
  }
  Object.assign(req.user, fields);
  await req.user.save();
  res.json({ data: publicUser(req.user) });
});

module.exports = router;
