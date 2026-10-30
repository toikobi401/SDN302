const path = require('node:path');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

async function checkCloudinary() {
  const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });
  if (result.error) throw new Error('Cannot read server/.env.');

  const requiredKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = requiredKeys.filter(key => !process.env[key]?.trim() || /^your_/i.test(process.env[key]));
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const response = await cloudinary.api.ping({ timeout: 10000 });
  if (response.status !== 'ok') throw new Error('Cloudinary returned an unexpected status.');
  console.log('Cloudinary connection: OK');
}

function redact(value) {
  let text = String(value);
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_URL']) {
    const secret = process.env[key];
    if (secret) {
      text = text.split(secret).join('[REDACTED]');
      text = text.split(encodeURIComponent(secret)).join('[REDACTED]');
    }
  }
  return text.replace(/https?:\/\/\S+/gi, '[URL REDACTED]').replace(/[\r\n]+/g, ' ').slice(0, 500);
}

checkCloudinary().catch(error => {
  // Cloudinary Admin API can reject with { error: { message, http_code } }.
  const detail = error?.error ?? error;
  const httpCode = detail?.http_code;
  const code = detail?.code ?? detail?.message?.code ?? error?.cause?.code;
  const message = typeof detail?.message === 'string'
    ? detail.message
    : detail?.message?.message ?? 'No error message returned.';

  console.error('Cloudinary connection: FAILED');
  if (httpCode) console.error('HTTP status: ' + redact(httpCode));
  if (code) console.error('Error code: ' + redact(code));
  console.error('Reason: ' + redact(message));

  if ([401, 403].includes(Number(httpCode))) {
    console.error('Check Cloud Name, API Key, API Secret and API key permissions in Cloudinary Console.');
  } else if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(code)) {
    console.error('Check DNS, internet connection, proxy and firewall settings.');
  }
  process.exitCode = 1;
});
