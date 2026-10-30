require('dotenv').config();
const { connectDatabase, disconnectDatabase } = require('../src/config/database.js');
const models = require('../src/models/index.js');

async function initializeDatabase() {
  try {
    await connectDatabase();
    for (const Model of Object.values(models)) {
      await Model.createCollection();
      // Adds declared indexes without dropping existing indexes or records.
      await Model.createIndexes();
      console.log(`Ready: ${Model.collection.collectionName}`);
    }
    console.log('Database initialization completed. No sample users or passwords were created.');
  } catch (error) {
    // Avoid logging connection strings or credentials from driver error messages.
    console.error(`Database initialization failed (${error.name}). Check connectivity, configuration and index conflicts.`);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }

}
initializeDatabase().catch(error => {
  console.error('Database initialization failed (' + error.name + ').');
  process.exitCode = 1;
});
