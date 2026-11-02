const { Coupon } = require('../models');
const { assert, text, number, pick, list, found } = require('../lib/http');
const { CODE } = require('../services/coupon');

function dateInput(value, name) {
  if (value === null) return null;
  const date = new Date(typeof value === 'string' ? value : NaN);
  assert(!Number.isNaN(date.getTime()), 400, 'INVALID_INPUT', `${name} must be an ISO date`);
  return date;
}

function input(body) {
  const fields = pick(body, ['code', 'description', 'type', 'value', 'minSubtotal', 'maxDiscount', 'usageLimit', 'startsAt', 'expiresAt', 'isActive']);
  if (fields.code !== undefined) {
    fields.code = text(fields.code, 'code', { max: 30 }).toUpperCase();
    assert(CODE.test(fields.code), 400, 'INVALID_INPUT', 'Code must be 3–30 letters, numbers, hyphens or underscores');
  }
  if (fields.description !== undefined) fields.description = text(fields.description, 'description', { max: 500 });
  if (fields.type !== undefined) assert(['PERCENT', 'FIXED'].includes(fields.type), 400, 'INVALID_INPUT', 'type must be PERCENT or FIXED');
  if (fields.value !== undefined) number(fields.value, 'value', 1);
  if (fields.minSubtotal !== undefined) number(fields.minSubtotal, 'minSubtotal');
  for (const key of ['maxDiscount', 'usageLimit']) if (fields[key] !== undefined && fields[key] !== null) number(fields[key], key, 1);
  for (const key of ['startsAt', 'expiresAt']) if (fields[key] !== undefined) fields[key] = dateInput(fields[key], key);
  if (fields.isActive !== undefined) assert(typeof fields.isActive === 'boolean', 400, 'INVALID_INPUT', 'isActive must be boolean');
  return fields;
}

function assertConsistent(coupon) {
  assert(coupon.type !== 'PERCENT' || coupon.value <= 100, 400, 'INVALID_INPUT', 'A percentage cannot be above 100');
  assert(!coupon.startsAt || !coupon.expiresAt || coupon.startsAt < coupon.expiresAt, 400, 'INVALID_INPUT', 'The end date must be after the start date');
}

async function adminList(req, res) {
  res.json(await list(Coupon, {}, req.query));
}

async function adminGet(req, res) {
  res.json({ data: await found(Coupon, req.params.id) });
}

async function create(req, res) {
  const fields = input(req.body);
  assert(fields.code && fields.type && fields.value, 400, 'INVALID_INPUT', 'code, type and value are required');
  assertConsistent(fields);
  res.status(201).json({ data: await Coupon.create(fields) });
}

async function update(req, res) {
  const coupon = await found(Coupon, req.params.id);
  const fields = input(req.body);
  // Orders refer to the code, so renaming would break the once-per-customer check.
  assert(fields.code === undefined || fields.code === coupon.code, 400, 'INVALID_INPUT', 'A code cannot be renamed');
  delete fields.code;
  Object.assign(coupon, fields);
  assertConsistent(coupon);
  await coupon.save();
  res.json({ data: coupon });
}

// Deactivates only, because past orders still refer to the code.
async function remove(req, res) {
  const coupon = await found(Coupon, req.params.id);
  coupon.isActive = false;
  await coupon.save();
  res.json({ data: coupon });
}

module.exports = { adminList, adminGet, create, update, remove };
