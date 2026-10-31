const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');
  // Index creation is an explicit administrative operation (npm run db:init).
  return mongoose.connect(uri, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 10000,
  });
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
