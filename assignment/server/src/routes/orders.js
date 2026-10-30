const { Router } = require('express');
const { Order, PurchaseReceipt } = require('../models');
const { authenticate, admin } = require('../middleware/auth');
const { assert, list, found, dateRange } = require('../lib/http');
const commerce = require('../services/commerce');
const { orderStatuses } = require('../models/shared');

const router = Router();
router.use(authenticate);

function filter(query, statuses) {
  const result = dateRange(query);
  if (query.status !== undefined) {
    assert(statuses.includes(query.status), 400, 'INVALID_QUERY', 'Invalid status');
    result.status = query.status;
  }
  return result;
}

router.post('/orders', async (req, res) => res.status(201).json({ data: await commerce.createOrder(req.user, req.body, req.get('Idempotency-Key')) }));
router.get('/orders', async (req, res) => res.json(await list(Order, { ...filter(req.query, orderStatuses), user: req.user._id }, req.query)));
router.get('/orders/:id', async (req, res) => res.json({ data: await found(Order, req.params.id, { user: req.user._id }) }));
router.post('/orders/:id/cancel', async (req, res) => {
  // Keep customer URLs scoped to ownership even when an admin uses them.
  await found(Order, req.params.id, { user: req.user._id });
  res.json({ data: await commerce.transitionOrder({ _id: req.user._id, role: 'CUSTOMER' }, req.params.id, 'CANCELLED', req.body?.reason) });
});

router.use('/admin', admin);
router.get('/admin/orders', async (req, res) => res.json(await list(Order, filter(req.query, orderStatuses), req.query)));
router.get('/admin/orders/:id', async (req, res) => res.json({ data: await found(Order, req.params.id) }));
router.patch('/admin/orders/:id/status', async (req, res) => res.json({ data: await commerce.transitionOrder(req.user, req.params.id, req.body?.status, req.body?.reason) }));
router.post('/admin/orders/:id/payment', async (req, res) => res.json({ data: await commerce.markPaid(req.user, req.params.id) }));
router.get('/admin/purchase-receipts', async (req, res) => res.json(await list(PurchaseReceipt, filter(req.query, ['DRAFT', 'RECEIVED', 'CANCELLED']), req.query)));
router.get('/admin/purchase-receipts/:id', async (req, res) => res.json({ data: await found(PurchaseReceipt, req.params.id) }));
router.post('/admin/purchase-receipts', async (req, res) => res.status(201).json({ data: await commerce.createReceipt(req.user, req.body, req.get('Idempotency-Key')) }));
router.patch('/admin/purchase-receipts/:id', async (req, res) => res.json({ data: await commerce.updateReceipt(req.params.id, req.body) }));
router.patch('/admin/purchase-receipts/:id/status', async (req, res) => res.json({ data: await commerce.transitionReceipt(req.user, req.params.id, req.body?.status) }));

module.exports = router;
