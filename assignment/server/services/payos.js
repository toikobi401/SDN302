const { randomInt } = require('node:crypto');
const { PayOS } = require('@payos/node');
const { Order } = require('../models');
const { assert, found, text, HttpError } = require('../lib/http');
const commerce = require('./commerce');

const LINK_MINUTES = 15;
let client;

function payos() {
  const { PAYOS_CLIENT_ID: clientId, PAYOS_API_KEY: apiKey, PAYOS_CHECKSUM_KEY: checksumKey, CLIENT_URL } = process.env;
  assert(clientId && apiKey && checksumKey && CLIENT_URL, 503, 'PAYMENT_UNAVAILABLE', 'Online payment is not configured');
  client ||= new PayOS({ clientId, apiKey, checksumKey, logLevel: 'off' });
  return client;
}

async function call(work) {
  const sdk = payos();
  try {
    return await work(sdk);
  } catch (error) {
    console.error(JSON.stringify({ event: 'payos_error', name: error.name, code: String(error.code || '') }));
    throw new HttpError(502, 'PAYMENT_FAILED', 'The payment provider did not respond; try again');
  }
}

// Mutable so offline tests can replace provider calls.
const gateway = {
  assertConfigured: () => { payos(); },
  create: order => call(sdk => sdk.paymentRequests.create({
    orderCode: order.orderCode,
    amount: order.total,
    // payOS allows 9 characters when the bank account is not linked through payOS.
    description: `BS${String(order.orderCode).slice(-7)}`,
    // A discount has no line of its own, so a discounted order is sent as one line matching the amount.
    items: order.discount ? [{ name: `Order ${order.orderCode}`, quantity: 1, price: order.total }] : [
      ...order.items.map(item => ({ name: `${item.title.slice(0, 90)}${item.format === 'PDF' ? ' (PDF)' : ''}`, quantity: item.quantity, price: item.unitPrice })),
      ...(order.shippingFee ? [{ name: 'Shipping', quantity: 1, price: order.shippingFee }] : []),
    ],
    returnUrl: `${process.env.CLIENT_URL}/orders/${order._id}`,
    cancelUrl: `${process.env.CLIENT_URL}/orders/${order._id}`,
    expiredAt: Math.floor(order.paymentExpiresAt.getTime() / 1000),
  })),
  get: orderCode => call(sdk => sdk.paymentRequests.get(orderCode)),
  cancel: (orderCode, reason) => call(sdk => sdk.paymentRequests.cancel(orderCode, reason)),
  verify: async body => {
    const sdk = payos();
    try {
      return await sdk.webhooks.verify(body);
    } catch {
      throw new HttpError(400, 'INVALID_SIGNATURE', 'Webhook signature is invalid');
    }
  },
};

const newPaymentFields = () => ({
  // Date.now() * 1000 stays below Number.MAX_SAFE_INTEGER; the unique index rejects collisions.
  orderCode: Date.now() * 1000 + randomInt(1000),
  paymentExpiresAt: new Date(Date.now() + LINK_MINUTES * 60 * 1000),
});

const ownerOf = order => ({ _id: order.user, role: 'CUSTOMER' });
const awaitingPayment = order => order.paymentMethod === 'PAYOS' && order.status === 'PENDING' && order.paymentStatus === 'UNPAID';

async function placeOrder(user, input, key) {
  const online = input?.paymentMethod === 'PAYOS';
  if (online) gateway.assertConfigured();
  const order = await commerce.createOrder(user, input, key, online ? newPaymentFields() : {});
  if (!awaitingPayment(order) || order.checkoutUrl) return order;
  let link;
  try {
    link = await gateway.create(order);
  } catch (error) {
    await commerce.transitionOrder(ownerOf(order), String(order._id), 'CANCELLED', 'Payment link could not be created');
    throw error;
  }
  order.checkoutUrl = link.checkoutUrl;
  await order.save();
  return order;
}

// The conditional filter makes repeated webhooks and sync calls record a payment only once.
async function recordPaid(orderCode, amount, reference) {
  const order = await Order.findOne({ orderCode, paymentMethod: 'PAYOS' });
  if (!order) return null;
  // Written so a missing amount or total fails closed.
  if (!(amount >= order.total)) {
    console.error(JSON.stringify({ event: 'payos_amount_mismatch', order: String(order._id) }));
    return order;
  }
  const now = new Date();
  const $set = { paymentStatus: 'PAID', paidAt: now, paymentReference: reference };
  const update = { $set, $inc: { __v: 1 } };
  // Nothing is left to deliver by hand once a PDF-only order is paid.
  if (order.status === 'PENDING' && order.items.every(item => item.format === 'PDF')) {
    Object.assign($set, { status: 'COMPLETED', completedAt: now });
    update.$push = { statusHistory: { status: 'COMPLETED', changedBy: order.user, changedAt: now, note: 'PDF order paid' } };
  }
  // Matching the status read above stops this overwriting an order cancelled in the meantime.
  const updated = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: 'UNPAID', status: order.status }, update, { returnDocument: 'after' });
  if (updated) return updated;
  const current = await Order.findById(order._id);
  return current.paymentStatus === 'UNPAID' ? recordPaid(orderCode, amount, reference) : current;
}

async function handleWebhook(body) {
  const data = await gateway.verify(body);
  // Unknown orders still succeed: payOS sends a sample transaction when the webhook URL is confirmed.
  if (data.code === '00' && Number.isSafeInteger(data.orderCode)) await recordPaid(data.orderCode, data.amount, data.reference);
}

async function syncOrder(order) {
  if (!awaitingPayment(order)) return order;
  const link = await gateway.get(order.orderCode);
  if (link.status === 'PAID') return recordPaid(order.orderCode, link.amountPaid, link.transactions?.[0]?.reference);
  if (['CANCELLED', 'EXPIRED'].includes(link.status)) {
    return commerce.transitionOrder(ownerOf(order), String(order._id), 'CANCELLED', `Payment link ${link.status.toLowerCase()}`);
  }
  return order;
}

async function cancelOrder(actor, value, reason) {
  let order = await found(Order, value, actor.role === 'ADMIN' ? {} : { user: actor._id });
  if (awaitingPayment(order) && order.checkoutUrl) {
    const cancellationReason = text(reason, 'reason', { max: 1000 });
    order = await syncOrder(order);
    // A provider failure stops here so a cancelled order cannot keep a payable link.
    if (awaitingPayment(order)) await gateway.cancel(order.orderCode, cancellationReason);
  }
  return commerce.transitionOrder(actor, value, 'CANCELLED', reason);
}

async function expireOrders(now = new Date()) {
  const orders = await Order.find({ paymentMethod: 'PAYOS', paymentStatus: 'UNPAID', status: 'PENDING', paymentExpiresAt: { $lt: now } }).limit(50);
  for (const order of orders) {
    try {
      if (order.checkoutUrl) await syncOrder(order);
      else await commerce.transitionOrder(ownerOf(order), String(order._id), 'CANCELLED', 'Payment link expired');
    } catch (error) {
      console.error(JSON.stringify({ event: 'order_expiry_failed', order: String(order._id), name: error.name }));
    }
  }
}

module.exports = { gateway, placeOrder, handleWebhook, syncOrder, cancelOrder, expireOrders };
