const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, disconnectDB } = require('./config/db');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace_')) {
    throw new Error('JWT_SECRET must contain at least 32 random characters');
  }
  const fee = Number(process.env.SHIPPING_FEE_VND || 0);
  if (!Number.isSafeInteger(fee) || fee < 0) throw new Error('Invalid SHIPPING_FEE_VND');
  await connectDB();
  const app = require('./app');
  const { expireOrders } = require('./services/payos');
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => console.log(`Bookstore API listening on port ${port}`));
  const expiry = setInterval(() => expireOrders().catch(error => console.error(JSON.stringify({ event: 'order_expiry_failed', name: error.name }))), 60 * 1000);
  expiry.unref();
  server.on('error', () => { console.error('HTTP server failed to start'); process.exitCode = 1; disconnectDB(); });
  let closing = false;
  async function stop() {
    if (closing) return;
    closing = true;
    clearInterval(expiry);
    const timer = setTimeout(() => process.exit(1), 10000);
    timer.unref();
    server.close(async () => {
      await disconnectDB();
      clearTimeout(timer);
    });
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch(error => {
  // Never log connection strings or database credentials.
  console.error(error.message?.startsWith('JWT_SECRET') || error.message === 'Invalid SHIPPING_FEE_VND'
    ? error.message : `Startup failed (${error.name}); check database and configuration`);
  process.exitCode = 1;
  disconnectDB();
});
