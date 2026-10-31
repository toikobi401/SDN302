// Imports data/books/catalog.json into MongoDB. Stores only paths and links, never file contents.
const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB, disconnectDB } = require('../config/db');
const { Book, Category } = require('../models');

const CATALOG = path.resolve(__dirname, '../data/books/catalog.json');
const OPENING_STOCK = 20;
// shortcut: PDFs start on sale only when the licence allows selling; the admin can change this per book.
const canSellPdf = book => Boolean(book.ebook.file) && !/NonCommercial/i.test(book.license);
const samplePdfPrice = book => Math.ceil(samplePrice(book) * 0.4 / 5000) * 5000;
const TOP_CATEGORIES = { gutenberg: ['Literature', 'literature'], openstax: ['Textbooks', 'textbooks'] };
const GENRE_NAMES = {
  romance: 'Romance', 'mystery-crime': 'Mystery & Crime', adventure: 'Adventure', 'fantasy-scifi': 'Fantasy & Sci-Fi',
  'horror-gothic': 'Horror & Gothic', classics: 'Classics', 'drama-poetry': 'Drama & Poetry', children: 'Children',
  science: 'Science', math: 'Math', business: 'Business', 'social-sciences': 'Social Sciences', nursing: 'Nursing',
  humanities: 'Humanities', 'computer-science': 'Computer Science', 'college-success': 'College Success',
};

// shortcut: the sources have no prices, so these are stable sample prices; replace them before real sales.
function samplePrice(book) {
  const [low, steps] = book.source === 'openstax' ? [150000, 41] : [60000, 25];
  return low + createHash('sha256').update(book.id).digest().readUInt32BE(0) % steps * 5000;
}

function toBookDocument(book, categoryIds) {
  return {
    title: book.title,
    slug: path.basename(book.cover, path.extname(book.cover)),
    authors: book.authors,
    description: book.description,
    // Source ISBNs can contain invisible soft hyphens, which the model's cleanup does not remove.
    ...(book.isbn ? { isbn: book.isbn.replace(/[^\dXx]/g, '') } : {}),
    coverImageUrl: `/api/${book.cover}`,
    categories: categoryIds,
    price: samplePrice(book),
    stock: OPENING_STOCK,
    source: book.source,
    sourceId: book.id,
    license: book.license,
    licenseUrl: book.licenseUrl,
    ebookFormat: book.ebook.format,
    ebookUrl: book.ebook.url,
    ...(book.ebook.file ? { pdfFile: path.basename(book.ebook.file), pdfPrice: samplePdfPrice(book) } : {}),
    pdfForSale: canSellPdf(book),
  };
}

async function ensureCategory(name, slug) {
  const found = await Category.findOne({ slug });
  return found?._id || (await Category.create({ name, slug }))._id;
}

async function importBooks() {
  const { books } = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  await connectDB();
  const ids = {};
  for (const [name, slug] of Object.values(TOP_CATEGORIES)) ids[slug] = await ensureCategory(name, slug);
  for (const genre of new Set(books.map(book => book.genre))) {
    if (!GENRE_NAMES[genre]) throw new Error(`Setup: unknown genre ${genre}`);
    ids[genre] = await ensureCategory(GENRE_NAMES[genre], genre);
  }
  let added = 0;
  for (const book of books) {
    // Existing books are left alone so a rerun cannot overwrite the admin's prices or stock.
    if (await Book.exists({ sourceId: book.id })) {
      // Books imported before PDF sales existed get their PDF settings once; later admin edits are kept.
      if (book.ebook.file) await Book.updateOne({ sourceId: book.id, pdfForSale: { $exists: false } }, { $set: { pdfForSale: canSellPdf(book), pdfPrice: samplePdfPrice(book) } });
      continue;
    }
    try {
      await Book.create(toBookDocument(book, [ids[TOP_CATEGORIES[book.source][1]], ids[book.genre]]));
    } catch (error) {
      throw new Error(`Setup: could not import ${book.id}: ${error.message}`, { cause: error });
    }
    added += 1;
  }
  console.log(`Imported ${added} new books; ${books.length - added} already existed.`);
}

if (require.main === module) {
  importBooks().catch(error => {
    console.error(error.message?.startsWith('Setup:') ? error.message : `Import failed (${error.name}; ${error.code || 'no code'})`);
    process.exitCode = 1;
  }).finally(disconnectDB);
}

module.exports = { toBookDocument, samplePrice };
