const { Router } = require('express');
const { Book, Category, Supplier, InventoryMovement } = require('../models');
const { authenticate, admin } = require('../middleware/auth');
const { assert, text, id, number, pick, list, found, dateRange } = require('../lib/http');
const { adjustStock } = require('../services/commerce');

const router = Router();
const bookFields = ['title', 'slug', 'authors', 'publisher', 'isbn', 'description', 'coverImageUrl', 'imageUrls', 'categories', 'price', 'lowStockThreshold', 'status'];

async function bookInput(input) {
  const fields = pick(input, bookFields);
  for (const key of ['title', 'slug', 'publisher', 'isbn', 'coverImageUrl']) {
    if (fields[key] !== undefined) fields[key] = text(fields[key], key, { max: 1000 });
  }
  if (fields.description !== undefined) {
    assert(typeof fields.description === 'string' && fields.description.length <= 20000, 400, 'INVALID_INPUT', 'Invalid description');
  }
  if (fields.authors !== undefined) {
    assert(Array.isArray(fields.authors) && fields.authors.length >= 1 && fields.authors.length <= 30, 400, 'INVALID_INPUT', 'Provide 1–30 authors');
    fields.authors = fields.authors.map(value => text(value, 'author'));
  }
  if (fields.imageUrls !== undefined) {
    assert(Array.isArray(fields.imageUrls) && fields.imageUrls.length <= 20, 400, 'INVALID_INPUT', 'Maximum 20 images');
    fields.imageUrls = fields.imageUrls.map(value => text(value, 'imageUrl', { max: 1000 }));
  }
  for (const value of [fields.coverImageUrl, ...(fields.imageUrls || [])].filter(Boolean)) {
    assert(/^https:\/\//i.test(value), 400, 'INVALID_INPUT', 'Image URLs must use HTTPS');
  }
  if (fields.categories !== undefined) {
    assert(Array.isArray(fields.categories) && fields.categories.length <= 30, 400, 'INVALID_INPUT', 'Invalid categories');
    fields.categories = [...new Set(fields.categories.map(value => id(value, 'category')))];
    const count = await Category.countDocuments({ _id: { $in: fields.categories }, isActive: true });
    assert(count === fields.categories.length, 400, 'INVALID_REFERENCE', 'Category does not exist or is inactive');
  }
  for (const key of ['price', 'lowStockThreshold']) if (fields[key] !== undefined) number(fields[key], key);
  if (fields.status !== undefined) assert(['ACTIVE', 'DISCONTINUED'].includes(fields.status), 400, 'INVALID_INPUT', 'Invalid book status');
  return fields;
}

function bookFilter(query, management = false) {
  const filter = management ? {} : { status: 'ACTIVE' };
  if (management && query.status !== undefined) {
    assert(['ACTIVE', 'DISCONTINUED'].includes(query.status), 400, 'INVALID_QUERY', 'Invalid status');
    filter.status = query.status;
  }
  if (query.q !== undefined) {
    const q = text(query.q, 'q');
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ title: { $regex: escaped, $options: 'i' } }, { authors: { $regex: escaped, $options: 'i' } }, { isbn: q.replace(/[\s-]/g, '') }];
  }
  if (query.category !== undefined) filter.categories = id(query.category, 'category');
  for (const [key, operator] of [['minPrice', '$gte'], ['maxPrice', '$lte']]) {
    if (query[key] !== undefined) {
      const raw = text(query[key], key);
      assert(/^\d+$/.test(raw), 400, 'INVALID_QUERY', 'Invalid price range');
      const value = number(Number(raw), key);
      filter.price = { ...filter.price, [operator]: value };
    }
  }
  assert(!filter.price || filter.price.$gte === undefined || filter.price.$lte === undefined || filter.price.$gte <= filter.price.$lte,
    400, 'INVALID_QUERY', 'minPrice must be <= maxPrice');
  if (query.inStock !== undefined) {
    assert(['true', 'false'].includes(query.inStock), 400, 'INVALID_QUERY', 'inStock must be true or false');
    filter.stock = query.inStock === 'true' ? { $gt: 0 } : 0;
  }
  return filter;
}

async function books(req, res, management = false) {
  const sorts = { newest: { createdAt: -1, _id: 1 }, price_asc: { price: 1, _id: 1 }, price_desc: { price: -1, _id: 1 }, title: { title: 1, _id: 1 } };
  const sort = req.query.sort || 'newest';
  assert(Object.hasOwn(sorts, sort), 400, 'INVALID_QUERY', 'Invalid sort');
  res.json(await list(Book, bookFilter(req.query, management), req.query, { sort: sorts[sort], populate: { path: 'categories', match: { isActive: true } } }));
}

router.get('/books', (req, res) => books(req, res));
router.get('/books/:id', async (req, res) => res.json({ data: await found(Book, req.params.id, { status: 'ACTIVE' }) }));
router.get('/categories', async (req, res) => res.json(await list(Category, { isActive: true }, req.query, { sort: { name: 1, _id: 1 } })));
router.get('/categories/:id', async (req, res) => res.json({ data: await found(Category, req.params.id, { isActive: true }) }));

router.use('/admin', authenticate, admin);
router.get('/admin/books', (req, res) => books(req, res, true));
router.get('/admin/books/:id', async (req, res) => res.json({ data: await found(Book, req.params.id) }));
router.post('/admin/books', async (req, res) => {
  assert(req.body?.stock === undefined, 400, 'INVALID_INPUT', 'Use purchase receipts or stock adjustments to change stock');
  res.status(201).json({ data: await Book.create(await bookInput(req.body)) });
});
router.patch('/admin/books/:id', async (req, res) => {
  assert(req.body?.stock === undefined, 400, 'INVALID_INPUT', 'Use stock adjustments to change stock');
  const book = await found(Book, req.params.id);
  const fields = await bookInput(req.body);
  if (fields.coverImageUrl !== undefined && fields.coverImageUrl !== book.coverImageUrl) book.coverImagePublicId = undefined;
  if (fields.imageUrls !== undefined) book.imagePublicIds = [];
  Object.assign(book, fields);
  await book.save();
  res.json({ data: book });
});
router.delete('/admin/books/:id', async (req, res) => {
  const book = await found(Book, req.params.id);
  book.status = 'DISCONTINUED';
  await book.save();
  res.json({ data: book });
});
router.post('/admin/books/:id/stock-adjustments', async (req, res) => {
  res.json({ data: await adjustStock(req.user, req.params.id, req.body, req.get('Idempotency-Key')) });
});
router.get('/admin/inventory-movements', async (req, res) => {
  const filter = dateRange(req.query);
  if (req.query.book !== undefined) filter.book = id(req.query.book, 'book');
  if (req.query.type !== undefined) {
    assert(['PURCHASE', 'SALE', 'CANCELLATION', 'ADJUSTMENT'].includes(req.query.type), 400, 'INVALID_QUERY', 'Invalid movement type');
    filter.type = req.query.type;
  }
  res.json(await list(InventoryMovement, filter, req.query));
});

function managementResource(path, Model, keys) {
  async function input(body) {
    const fields = pick(body, keys);
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'isActive') assert(typeof value === 'boolean', 400, 'INVALID_INPUT', 'isActive must be boolean');
      else fields[key] = text(value, key, { max: key === 'description' || key === 'note' ? 5000 : 1000 });
    }
    if (fields.imageUrl) assert(/^https:\/\//i.test(fields.imageUrl), 400, 'INVALID_INPUT', 'Image URL must use HTTPS');
    return fields;
  }
  router.get(`/admin/${path}`, async (req, res) => res.json(await list(Model, {}, req.query)));
  router.get(`/admin/${path}/:id`, async (req, res) => res.json({ data: await found(Model, req.params.id) }));
  router.post(`/admin/${path}`, async (req, res) => res.status(201).json({ data: await Model.create(await input(req.body)) }));
  router.patch(`/admin/${path}/:id`, async (req, res) => {
    const document = await found(Model, req.params.id);
    const fields = await input(req.body);
    if (Model === Category && fields.imageUrl !== undefined && fields.imageUrl !== document.imageUrl) document.imagePublicId = undefined;
    Object.assign(document, fields);
    await document.save();
    res.json({ data: document });
  });
  router.delete(`/admin/${path}/:id`, async (req, res) => {
    const document = await found(Model, req.params.id);
    document.isActive = false;
    await document.save();
    res.json({ data: document });
  });
}

managementResource('categories', Category, ['name', 'slug', 'description', 'imageUrl', 'isActive']);
managementResource('suppliers', Supplier, ['code', 'name', 'contactName', 'email', 'phone', 'address', 'note', 'isActive']);
module.exports = router;
