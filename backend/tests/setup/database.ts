import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { inject } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../../src/config/database.js';

/** Connects the current test file to its own, uniquely named database. */
export async function connectTestDatabase(): Promise<void> {
  await connectDatabase(inject('mongoUri'), { dbName: `test_${randomUUID()}` });
  // Wait for indexes (e.g. unique email) so tests can rely on them.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init()));
}

export async function clearDatabase(): Promise<void> {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
}
