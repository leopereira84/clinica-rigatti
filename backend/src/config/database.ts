import mongoose from 'mongoose';

// Strip query operators (e.g. `$gt`, `$ne`) from user-provided filter values,
// as a defense against NoSQL injection.
mongoose.set('sanitizeFilter', true);
// Ignore filter fields that are not declared in the schema.
mongoose.set('strictQuery', true);

interface ConnectOptions {
  dbName?: string;
}

export async function connectDatabase(uri: string, options: ConnectOptions = {}): Promise<void> {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    ...options,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
