const { Coupon, Order } = require('../models');
const { assert } = require('../lib/http');

const CODE = /^[A-Z0-9_-]{3,30}$/;

function normalizeCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  assert(CODE.test(code), 400, 'COUPON_INVALID', 'This discount code is not valid');
  return code;
}

// Rounds down in the customer's disfavour by under 1 VND, and never exceeds the books' subtotal.
function couponDiscount(coupon, subtotal) {
  const raw = coupon.type === 'PERCENT' ? Math.floor(subtotal * coupon.value / 100) : coupon.value;
  const capped = coupon.maxDiscount === null || coupon.maxDiscount === undefined ? raw : Math.min(raw, coupon.maxDiscount);
  return Math.min(capped, subtotal);
}

async function usableCoupon(user, code, subtotal, session, now = new Date()) {
  const coupon = await Coupon.findOne({ code }).session(session || null);
  // One message for unknown, disabled and out-of-date codes, so codes cannot be probed.
  const live = coupon?.isActive && (!coupon.startsAt || coupon.startsAt <= now) && (!coupon.expiresAt || coupon.expiresAt > now);
  assert(live, 400, 'COUPON_INVALID', 'This discount code is not valid');
  assert(coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit, 409, 'COUPON_EXHAUSTED', 'This discount code has been fully used');
  assert(subtotal >= coupon.minSubtotal, 400, 'COUPON_MINIMUM', `This code needs a subtotal of at least ${coupon.minSubtotal} VND`);
  const used = await Order.exists({ user: user._id, couponCode: code, status: { $ne: 'CANCELLED' } }).session(session || null);
  assert(!used, 409, 'COUPON_USED', 'You have already used this discount code');
  return coupon;
}

async function redeemCoupon(user, code, subtotal, session) {
  const coupon = await usableCoupon(user, code, subtotal, session);
  // The conditional update stops concurrent orders going over the usage limit.
  const claimed = await Coupon.findOneAndUpdate({ _id: coupon._id, isActive: true, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
    { $inc: { usedCount: 1 } }, { session });
  assert(claimed, 409, 'COUPON_EXHAUSTED', 'This discount code has been fully used');
  return couponDiscount(coupon, subtotal);
}

async function releaseCoupon(code, session) {
  await Coupon.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
}

module.exports = { CODE, normalizeCode, couponDiscount, usableCoupon, redeemCoupon, releaseCoupon };
