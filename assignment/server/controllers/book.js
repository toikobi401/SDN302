const { Book, Category, InventoryMovement } = require('../models');
const { assert, text, id, number, pick, list: paginate, found, dateRange } = require('../lib/http');
const commerce = require('../services/commerce');
const cloudinary = require('../services/cloudinary');
const { isPdfName, pdfExists } = require('../services/pdf');

const MAX_GALLERY_IMAGES = 5;
const bookFields = ['title', 'slug', 'authors', 'publisher', 'isbn', 'description', 'coverImageUrl', 'coverImagePublicId', 'imageUrls', 'imagePublicIds', 'categories', 'price', 'lowStockThreshold', 'status', 'pdfFile', 'pdfPrice', 'pdfForSale'];
const ADMIN_FIELDS = '+pdfFile';

async function bookInput(input) {
  const fields = pick(input, bookFields);
  for (const key of ['title', 'slug', 'publisher', 'isbn']) {
    if (fields[key] !== undefined) fields[key] = text(fields[key], key, { max: 1000 });
  }
  if (fields.description !== undefined) {
    assert(typeof fields.description === 'string' && fields.description.length <= 20000, 400, 'INVALID_INPUT', 'Invalid description');
  }
  if (fields.authors !== undefined) {
    assert(Array.isArray(fields.authors) && fields.authors.length >= 1 && fields.authors.length <= 30, 400, 'INVALID_INPUT', 'Provide 1–30 authors');
    fields.authors = fields.authors.map(value => text(value, 'author'));
  }
  if (fields.coverImageUrl !== undefined || fields.coverImagePublicId !== undefined) {
    cloudinary.assertOwnImage(fields.coverImageUrl, fields.coverImagePublicId);
  }
  if (fields.imageUrls !== undefined || fields.imagePublicIds !== undefined) {
    assert(Array.isArray(fields.imageUrls) && Array.isArray(fields.imagePublicIds) && fields.imageUrls.length === fields.imagePublicIds.length
      && fields.imageUrls.length <= MAX_GALLERY_IMAGES, 400, 'INVALID_IMAGE', `Provide at most ${MAX_GALLERY_IMAGES} gallery images`);
    fields.imageUrls.forEach((url, index) => cloudinary.assertOwnImage(url, fields.imagePublicIds[index]));
  }
  if (fields.categories !== undefined) {
    assert(Array.isArray(fields.categories) && fields.categories.length <= 30, 400, 'INVALID_INPUT', 'Invalid categories');
    fields.categories = [...new Set(fields.categories.map(value => id(value, 'category')))];
    const count = await Category.countDocuments({ _id: { $in: fields.categories }, isActive: true });
    assert(count === fields.categories.length, 400, 'INVALID_REFERENCE', 'Category does not exist or is inactive');
  }
  for (const key of ['price', 'lowStockThreshold']) if (fields[key] !== undefined) number(fields[key], key);
  if (fields.status !== undefined) assert(['ACTIVE', 'DISCONTINUED'].includes(fields.status), 400, 'INVALID_INPUT', 'Invalid book status');
  if (fields.pdfFile !== undefined) assert(isPdfName(fields.pdfFile), 400, 'INVALID_INPUT', 'pdfFile must be a file name such as my-book.pdf');
  if (fields.pdfPrice !== undefined) number(fields.pdfPrice, 'pdfPrice', 1);
  if (fields.pdfForSale !== undefined) assert(typeof fields.pdfForSale === 'boolean', 400, 'INVALID_INPUT', 'pdfForSale must be boolean');
  return fields;
}

function assertPdfSellable(book) {
  if (!book.pdfForSale) return;
  assert(book.pdfPrice, 400, 'INVALID_INPUT', 'Set a PDF price before selling the PDF');
  assert(pdfExists(book.pdfFile), 400, 'PDF_MISSING', 'The PDF file is not in data/books/pdfs');
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

async function books(req, res, management) {
  const sorts = { newest: { createdAt: -1, _id: 1 }, price_asc: { price: 1, _id: 1 }, price_desc: { price: -1, _id: 1 }, title: { title: 1, _id: 1 } };
  const sort = req.query.sort || 'newest';
  assert(Object.hasOwn(sorts, sort), 400, 'INVALID_QUERY', 'Invalid sort');
  res.json(await paginate(Book, bookFilter(req.query, management), req.query, { sort: sorts[sort], populate: { path: 'categories', match: { isActive: true } }, select: management ? ADMIN_FIELDS : undefined }));
}

const imageIds = book => [book.coverImagePublicId, ...book.imagePublicIds].filter(Boolean);

const list = (req, res) => books(req, res, false);
const adminList = (req, res) => books(req, res, true);

async function get(req, res) {
  res.json({ data: await found(Book, req.params.id, { status: 'ACTIVE' }) });
}

async function adminGet(req, res) {
  res.json({ data: await found(Book, req.params.id, {}, null, ADMIN_FIELDS) });
}

async function create(req, res) {
  assert(req.body?.stock === undefined, 400, 'INVALID_INPUT', 'Use purchase receipts or stock adjustments to change stock');
  const fields = await bookInput(req.body);
  assert(fields.coverImageUrl, 400, 'INVALID_IMAGE', 'A cover image is required');
  assertPdfSellable(fields);
  res.status(201).json({ data: await Book.create(fields) });
}

async function update(req, res) {
  assert(req.body?.stock === undefined, 400, 'INVALID_INPUT', 'Use stock adjustments to change stock');
  const book = await found(Book, req.params.id, {}, null, ADMIN_FIELDS);
  const before = imageIds(book);
  Object.assign(book, await bookInput(req.body));
  assertPdfSellable(book);
  await book.save();
  // Only IDs read from the stored book are deleted, never values sent by the client.
  const kept = new Set(imageIds(book));
  await cloudinary.destroyImages(before.filter(publicId => !kept.has(publicId)));
  res.json({ data: book });
}

// Hiding keeps the images, so the book can be put back on sale.
async function hide(req, res) {
  const book = await found(Book, req.params.id);
  book.status = 'DISCONTINUED';
  await book.save();
  res.json({ data: book });
}

async function adjustStock(req, res) {
  res.json({ data: await commerce.adjustStock(req.user, req.params.id, req.body, req.get('Idempotency-Key')) });
}

async function inventoryMovements(req, res) {
  const filter = dateRange(req.query);
  if (req.query.book !== undefined) filter.book = id(req.query.book, 'book');
  if (req.query.type !== undefined) {
    assert(['PURCHASE', 'SALE', 'CANCELLATION', 'ADJUSTMENT'].includes(req.query.type), 400, 'INVALID_QUERY', 'Invalid movement type');
    filter.type = req.query.type;
  }
  res.json(await paginate(InventoryMovement, filter, req.query));
}

module.exports = { list, adminList, get, adminGet, create, update, hide, adjustStock, inventoryMovements };
