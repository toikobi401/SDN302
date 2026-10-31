const cloudinary = require('cloudinary').v2;
const { assert } = require('../lib/http');

const ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
const folder = () => `${process.env.CLOUDINARY_FOLDER || 'bookstore'}/books`;

function isConfigured() {
  return ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].every(key => process.env[key]?.trim() && !/^your_/i.test(process.env[key]));
}

function configure() {
  assert(isConfigured(), 503, 'MEDIA_UNAVAILABLE', 'Image storage is not configured');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// The browser uploads straight to Cloudinary with this signature, so the API secret stays here.
function signUpload() {
  configure();
  const params = { allowed_formats: ALLOWED_FORMATS, folder: folder(), timestamp: Math.floor(Date.now() / 1000) };
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    allowedFormats: params.allowed_formats,
    folder: params.folder,
    timestamp: params.timestamp,
    signature: cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET),
  };
}

function assertOwnImage(url, publicId) {
  configure();
  assert(typeof url === 'string' && url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`),
    400, 'INVALID_IMAGE', 'Image must come from the store Cloudinary account');
  assert(typeof publicId === 'string' && publicId.startsWith(`${folder()}/`), 400, 'INVALID_IMAGE', 'Image must be in the store book folder');
}

// Called after the database save: a failed cleanup only leaves an unused file behind.
async function destroyImages(publicIds) {
  if (!publicIds.length || !isConfigured()) return;
  configure();
  const results = await Promise.allSettled(publicIds.map(publicId => cloudinary.uploader.destroy(publicId, { resource_type: 'image', timeout: 10000 })));
  results.forEach((result, index) => {
    if (result.status === 'rejected') console.error(JSON.stringify({ event: 'image_cleanup_failed', publicId: publicIds[index] }));
  });
}

async function uploadFile(file) {
  configure();
  return cloudinary.uploader.upload(file, { folder: folder(), resource_type: 'image', allowed_formats: ALLOWED_FORMATS.split(','), timeout: 30000 });
}

module.exports = { isConfigured, signUpload, assertOwnImage, destroyImages, uploadFile };
