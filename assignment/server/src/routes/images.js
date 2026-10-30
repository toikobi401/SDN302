const { Router } = require('express');
const { randomUUID } = require('node:crypto');
const cloudinary = require('cloudinary').v2;
const { Book, Category } = require('../models');
const { authenticate, admin, rateLimit } = require('../middleware/auth');
const { assert, found, HttpError } = require('../lib/http');

const router = Router();
router.use(authenticate, admin, rateLimit({ limit: 30, windowMs: 60 * 1000 }));

function fileInput(value) {
  assert(typeof value === 'string', 400, 'INVALID_IMAGE', 'image must be a base64 data URI');
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  assert(match && match[2].length % 4 === 0, 400, 'INVALID_IMAGE', 'Only base64 JPEG, PNG and WebP images are accepted');
  const buffer = Buffer.from(match[2], 'base64');
  assert(buffer.length > 0 && buffer.length <= 5 * 1024 * 1024, 400, 'INVALID_IMAGE', 'Image must be at most 5 MiB');
  const signatures = {
    jpeg: buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    png: buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    webp: buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP',
  };
  assert(signatures[match[1]], 400, 'INVALID_IMAGE', 'Image content does not match MIME type');
  return value;
}

async function upload(req, res, category = false) {
  const image = fileInput(req.body?.image);
  const kind = category ? 'category' : req.body?.kind || 'cover';
  assert(['category', 'cover', 'gallery'].includes(kind) && (category || kind !== 'category'), 400, 'INVALID_INPUT', 'kind must be cover or gallery');
  const document = await found(category ? Category : Book, req.params.id);
  if (kind === 'gallery') assert(document.imageUrls.length < 20, 400, 'IMAGE_LIMIT', 'Maximum 20 gallery images');
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  };
  assert(config.cloud_name && config.api_key && config.api_secret, 503, 'MEDIA_UNAVAILABLE', 'Cloudinary is not configured');
  cloudinary.config(config);
  let asset;
  try {
    asset = await cloudinary.uploader.upload(image, { folder: `${process.env.CLOUDINARY_FOLDER || 'bookstore'}/${category ? 'categories' : 'books'}`,
      public_id: randomUUID(), resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], timeout: 30000 });
  } catch {
    throw new HttpError(502, 'UPLOAD_FAILED', 'Cloudinary upload failed');
  }
  if (category) {
    document.imageUrl = asset.secure_url;
    document.imagePublicId = asset.public_id;
  } else if (kind === 'cover') {
    document.coverImageUrl = asset.secure_url;
    document.coverImagePublicId = asset.public_id;
  } else {
    document.imageUrls.push(asset.secure_url);
    document.imagePublicIds.push(asset.public_id);
  }
  try {
    await document.save();
  } catch (error) {
    try { await cloudinary.uploader.destroy(asset.public_id, { resource_type: 'image', timeout: 10000 }); }
    catch { console.error(JSON.stringify({ event: 'image_cleanup_failed', publicId: asset.public_id, requestId: req.requestId })); }
    throw error;
  }
  // Old images are retained to preserve historical order image URLs.
  res.status(201).json({ data: { url: asset.secure_url, publicId: asset.public_id, resource: document } });
}

router.post('/books/:id/images', (req, res) => upload(req, res));
router.post('/categories/:id/image', (req, res) => upload(req, res, true));
module.exports = router;
