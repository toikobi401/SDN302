const { PurchaseReceipt } = require('../models');
const { assert, list: paginate, found, dateRange } = require('../lib/http');
const commerce = require('../services/commerce');

async function list(req, res) {
  const filter = dateRange(req.query);
  if (req.query.status !== undefined) {
    assert(['DRAFT', 'RECEIVED', 'CANCELLED'].includes(req.query.status), 400, 'INVALID_QUERY', 'Invalid status');
    filter.status = req.query.status;
  }
  res.json(await paginate(PurchaseReceipt, filter, req.query));
}

async function get(req, res) {
  res.json({ data: await found(PurchaseReceipt, req.params.id) });
}

async function create(req, res) {
  res.status(201).json({ data: await commerce.createReceipt(req.user, req.body, req.get('Idempotency-Key')) });
}

async function update(req, res) {
  res.json({ data: await commerce.updateReceipt(req.params.id, req.body) });
}

async function updateStatus(req, res) {
  res.json({ data: await commerce.transitionReceipt(req.user, req.params.id, req.body?.status) });
}

module.exports = { list, get, create, update, updateStatus };
