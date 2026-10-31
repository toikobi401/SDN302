const { Router } = require('express');
const { requireAuth, requireAdmin, rateLimit } = require('../middleware/auth');
const auth = require('../controllers/auth');
const book = require('../controllers/book');
const category = require('../controllers/category');
const supplier = require('../controllers/supplier');
const cart = require('../controllers/cart');
const order = require('../controllers/order');
const payment = require('../controllers/payment');
const upload = require('../controllers/upload');
const receipt = require('../controllers/receipt');
const report = require('../controllers/report');

const router = Router();
const admin = [requireAuth, requireAdmin];
const loginLimit = rateLimit({ limit: 15, windowMs: 15 * 60 * 1000 });
const uploadLimit = rateLimit({ limit: 30, windowMs: 60 * 1000 });

router.post('/auth/register', loginLimit, auth.register);
router.post('/auth/login', loginLimit, auth.login);
router.post('/auth/logout', requireAuth, auth.logout);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/me', requireAuth, auth.updateMe);

router.get('/books', book.list);
router.get('/books/:id', book.get);
router.get('/admin/books', admin, book.adminList);
router.get('/admin/books/:id', admin, book.adminGet);
router.post('/admin/books', admin, book.create);
router.patch('/admin/books/:id', admin, book.update);
router.delete('/admin/books/:id', admin, book.hide);
router.post('/admin/books/:id/stock-adjustments', admin, book.adjustStock);
router.get('/admin/inventory-movements', admin, book.inventoryMovements);
router.post('/admin/uploads/signature', admin, uploadLimit, upload.signature);

router.get('/categories', category.list);
router.get('/categories/:id', category.get);
router.get('/admin/categories', admin, category.adminList);
router.get('/admin/categories/:id', admin, category.adminGet);
router.post('/admin/categories', admin, category.create);
router.patch('/admin/categories/:id', admin, category.update);
router.delete('/admin/categories/:id', admin, category.remove);

router.get('/admin/suppliers', admin, supplier.adminList);
router.get('/admin/suppliers/:id', admin, supplier.adminGet);
router.post('/admin/suppliers', admin, supplier.create);
router.patch('/admin/suppliers/:id', admin, supplier.update);
router.delete('/admin/suppliers/:id', admin, supplier.remove);

router.get('/cart', requireAuth, cart.get);
router.put('/cart/items/:bookId', requireAuth, cart.setItem);
router.delete('/cart/items/:bookId', requireAuth, cart.removeItem);
router.delete('/cart', requireAuth, cart.clear);

router.post('/orders', requireAuth, order.create);
router.get('/orders', requireAuth, order.mine);
router.get('/orders/:id', requireAuth, order.get);
router.post('/orders/:id/cancel', requireAuth, order.cancel);
router.post('/orders/:id/payment/sync', requireAuth, payment.sync);
router.get('/orders/:id/items/:bookId/download', requireAuth, order.download);
router.get('/admin/orders', admin, order.adminList);
router.get('/admin/orders/:id', admin, order.adminGet);
router.patch('/admin/orders/:id/status', admin, order.updateStatus);
router.post('/admin/orders/:id/payment', admin, order.markPaid);
router.post('/admin/orders/:id/payment/sync', admin, payment.adminSync);
router.post('/admin/orders/:id/refund', admin, order.markRefunded);

router.post('/payments/payos/webhook', payment.webhook);

router.get('/admin/purchase-receipts', admin, receipt.list);
router.get('/admin/purchase-receipts/:id', admin, receipt.get);
router.post('/admin/purchase-receipts', admin, receipt.create);
router.patch('/admin/purchase-receipts/:id', admin, receipt.update);
router.patch('/admin/purchase-receipts/:id/status', admin, receipt.updateStatus);

router.get('/admin/reports/summary', admin, report.summary);
router.get('/admin/reports/best-sellers', admin, report.bestSellers);
router.get('/admin/reports/low-stock', admin, report.lowStock);

module.exports = router;
