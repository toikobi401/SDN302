const { finished } = require('node:stream/promises');
const { assert } = require('../lib/http');
const { signUpload } = require('../services/cloudinary');
const { MAX_PDF_BYTES, savePdf } = require('../services/pdf');

function signature(req, res) {
  res.json({ data: signUpload() });
}

// The request body is the file itself, so it streams to disk instead of being held in memory.
async function pdf(req, res) {
  try {
    assert(req.is('application/pdf'), 415, 'INVALID_PDF', 'Send the file with Content-Type application/pdf');
    assert(!(Number(req.get('Content-Length')) > MAX_PDF_BYTES), 413, 'PDF_TOO_LARGE', 'The PDF is larger than the upload limit');
    const pdfFile = await savePdf(req);
    res.status(201).json({ data: { pdfFile } });
  } catch (error) {
    // Proxies reset the connection if the answer arrives mid-upload, so the rest is read and discarded first.
    req.resume();
    await finished(req).catch(() => {});
    throw error;
  }
}

module.exports = { signature, pdf };
