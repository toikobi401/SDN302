const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');
const { Book, Category, User } = require('../models');
const { adjustStock } = require('../services/commerce');
const cloudinary = require('../services/cloudinary');

const IMAGES = path.resolve(__dirname, '../../client/public/images');
const OPENING_STOCK = 20;
const categories = [
  ['Fiction', 'fiction'],
  ['Lifestyle', 'lifestyle'],
  ['Travel', 'travel'],
];
const books = [
  ['Simple way of piece life', 'Armor Ramsey', 'lifestyle', 120000, 'product-item1.jpg'],
  ['Great travel at desert', 'Sanchit Howdy', 'travel', 98000, 'product-item2.jpg'],
  ['The lady beauty Scarlett', 'Arthur Doyle', 'fiction', 145000, 'product-item3.jpg'],
  ['Once upon a time', 'Klien Marry', 'fiction', 85000, 'product-item4.jpg'],
  ['Portrait photography', 'Adam Silber', 'lifestyle', 160000, 'tab-item1.jpg'],
  ['Tips of simple lifestyle', 'Bratt Smith', 'lifestyle', 110000, 'tab-item3.jpg'],
  ['Just felt from outside', 'Nicole Wilson', 'fiction', 90000, 'tab-item4.jpg'],
  ['Peaceful Enlightment', 'Marmik Lama', 'travel', 130000, 'tab-item5.jpg'],
];

// Reads <prefix>_EMAIL, <prefix>_NAME and <prefix>_PASSWORD, e.g. ADMIN_EMAIL.
async function ensureAccount(role, prefix, defaultName) {
  const email = process.env[`${prefix}_EMAIL`]?.trim().toLowerCase();
  const name = process.env[`${prefix}_NAME`]?.trim() || defaultName;
  const password = process.env[`${prefix}_PASSWORD`];
  const existing = email && await User.findOne({ email });
  if (existing) {
    // Never change the role or password of an account that already exists.
    if (existing.role !== role) throw new Error(`Setup: ${email} already exists with another role; no account was changed`);
    return existing;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error(`Setup: set a valid ${prefix}_EMAIL and ${prefix}_PASSWORD (12+ characters, max 72 bytes) in .env`);
  }
  const account = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role });
  console.log(`${defaultName} account created. Remove ${prefix}_PASSWORD from .env after use.`);
  return account;
}

async function coverFields(file) {
  // Without a Cloudinary account the sample covers are served from client/public.
  if (!cloudinary.isConfigured()) return { coverImageUrl: `/images/${file}` };
  const asset = await cloudinary.uploadFile(path.join(IMAGES, file));
  return { coverImageUrl: asset.secure_url, coverImagePublicId: asset.public_id };
}

async function seed() {
  await connectDB();
  const admin = await ensureAccount('ADMIN', 'ADMIN', 'Bookstore Admin');
  // The shipper account is optional.
  if (process.env.SHIPPER_EMAIL?.trim()) await ensureAccount('SHIPPER', 'SHIPPER', 'Shipper');
  const ids = {};
  for (const [name, slug] of categories) {
    ids[slug] = (await Category.findOneAndUpdate({ slug }, { $setOnInsert: { name, slug } }, { upsert: true, returnDocument: 'after' }))._id;
  }
  for (const [title, author, category, price, file] of books) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (await Book.exists({ slug })) continue;
    const book = await Book.create({ title, slug, authors: [author], categories: [ids[category]], price, ...await coverFields(file),
      description: `${title} by ${author}. Sample book created by the seed script.` });
    await adjustStock(admin, String(book._id), { quantityChange: OPENING_STOCK, reason: 'Sample opening stock' }, `seed-${slug}`);
  }
  console.log('Sample categories and books are ready. Existing records were not changed.');
}

seed().catch(error => {
  const upload = error.http_code ? `; Cloudinary refused the upload with status ${error.http_code}, check the API key permissions` : '';
  console.error(error.message?.startsWith('Setup:') ? error.message : `Seeding failed (${error.name}${upload})`);
  process.exitCode = 1;
}).finally(disconnectDB);
