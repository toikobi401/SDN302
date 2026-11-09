const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { assert } = require('../lib/http');

const PDF_DIR = path.resolve(__dirname, '../data/books/pdfs');
// The name is the only input to the path, so this pattern keeps reads inside PDF_DIR.
const PDF_NAME = /^[a-z0-9-]+\.pdf$/;
const MAX_PDF_BYTES = 200 * 1024 * 1024;
const PDF_SIGNATURE = Buffer.from('%PDF-');

const isPdfName = name => typeof name === 'string' && PDF_NAME.test(name);
const pdfPath = name => (isPdfName(name) ? path.join(PDF_DIR, name) : null);
const pdfExists = name => isPdfName(name) && fs.existsSync(pdfPath(name));

// The generated name means an upload can never replace a file another book or customer relies on.
async function savePdf(stream, maxBytes = MAX_PDF_BYTES) {
  await fs.promises.mkdir(PDF_DIR, { recursive: true });
  const name = `upload-${randomUUID()}.pdf`;
  // The .part name fails PDF_NAME, so an unfinished upload can never be sold or downloaded.
  const part = `${pdfPath(name)}.part`;
  let head = Buffer.alloc(0);
  let size = 0;
  async function* checked() {
    // Keeps the request open on a rejected file, otherwise the client gets a dropped connection instead of the error.
    for await (const chunk of stream.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      assert(size <= maxBytes, 413, 'PDF_TOO_LARGE', 'The PDF is larger than the upload limit');
      if (head.length < PDF_SIGNATURE.length) {
        head = Buffer.concat([head, chunk]).subarray(0, PDF_SIGNATURE.length);
        assert(head.equals(PDF_SIGNATURE.subarray(0, head.length)), 400, 'INVALID_PDF', 'This file is not a PDF');
      }
      yield chunk;
    }
  }
  const out = fs.createWriteStream(part, { flags: 'wx' });
  try {
    await pipeline(checked, out);
    assert(head.length === PDF_SIGNATURE.length, 400, 'INVALID_PDF', 'This file is not a PDF');
    await fs.promises.rename(part, pdfPath(name));
  } catch (error) {
    // A file rejected on its first chunk can fail before the .part file is even opened; removing it earlier would miss it.
    if (!out.closed) await new Promise(resolve => out.once('close', resolve));
    await fs.promises.rm(part, { force: true });
    throw error;
  }
  return name;
}

module.exports = { MAX_PDF_BYTES, isPdfName, pdfPath, pdfExists, savePdf };
