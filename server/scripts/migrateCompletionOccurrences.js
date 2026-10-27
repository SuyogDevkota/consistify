import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/config/db.js';

const collectionName = 'taskcompletions';
const occurrenceIndexName = 'uniq_active_completion_occurrence';

async function migrate() {
  await connectDb();
  const db = mongoose.connection.db;

  try {
    await db.createCollection(collectionName);
  } catch (error) {
    if (error.codeName !== 'NamespaceExists') throw error;
  }

  const collection = db.collection(collectionName);
  const indexes = await collection.indexes();
  const legacyIndex = indexes.find(
    (index) =>
      index.unique &&
      index.key.group === 1 &&
      index.key.user === 1 &&
      index.key.task === 1 &&
      index.key.dateKey === 1 &&
      index.key.occurrence === undefined &&
      index.name !== '_id_'
  );

  if (legacyIndex) await collection.dropIndex(legacyIndex.name);
  await collection.updateMany(
    { occurrence: { $exists: false } },
    { $set: { occurrence: 1 } }
  );
  await collection.createIndex(
    { group: 1, user: 1, task: 1, dateKey: 1, occurrence: 1 },
    {
      unique: true,
      partialFilterExpression: { undoneAt: null },
      name: occurrenceIndexName,
    }
  );
  console.info('Task completion occurrence index is ready.');
}

try {
  await migrate();
} catch (error) {
  console.error('Task completion index migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
