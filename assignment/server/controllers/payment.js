const { Order } = require('../models');
const { found } = require('../lib/http');
const payos = require('../services/payos');

// Authenticated by the payOS signature instead of a user token.
async function webhook(req, res) {
  await payos.handleWebhook(req.body);
  res.json({ data: { received: true } });
}

async function sync(req, res) {
  res.json({ data: await payos.syncOrder(await found(Order, req.params.id, { user: req.user._id })) });
}

async function adminSync(req, res) {
  res.json({ data: await payos.syncOrder(await found(Order, req.params.id)) });
}

module.exports = { webhook, sync, adminSync };
