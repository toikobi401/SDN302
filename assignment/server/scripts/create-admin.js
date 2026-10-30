const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const { User } = require('../src/models');

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !password || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Set ADMIN_NAME, a valid ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters, max 72 bytes)');
  }
  await connectDatabase();
  if (await User.exists({ email })) throw new Error('Account already exists; no account was changed');
  await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' });
  console.log('Administrator created. Remove ADMIN_PASSWORD from .env after use.');
}

createAdmin().catch(error => {
  const known = ['Set ADMIN_NAME', 'Account already exists'];
  console.error(known.some(prefix => error.message?.startsWith(prefix)) ? error.message : `Admin creation failed (${error.name})`);
  process.exitCode = 1;
}).finally(disconnectDatabase);
