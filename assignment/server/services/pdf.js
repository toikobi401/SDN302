const fs = require('node:fs');
const path = require('node:path');

const PDF_DIR = path.resolve(__dirname, '../data/books/pdfs');
// The name is the only input to the path, so this pattern keeps reads inside PDF_DIR.
const PDF_NAME = /^[a-z0-9-]+\.pdf$/;

const isPdfName = name => typeof name === 'string' && PDF_NAME.test(name);
const pdfPath = name => (isPdfName(name) ? path.join(PDF_DIR, name) : null);
const pdfExists = name => isPdfName(name) && fs.existsSync(pdfPath(name));

module.exports = { isPdfName, pdfPath, pdfExists };
