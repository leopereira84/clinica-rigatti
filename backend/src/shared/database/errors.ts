import mongoose from 'mongoose';

const MONGO_DUPLICATE_KEY = 11000;

export function isDuplicateKeyError(error: unknown): error is mongoose.mongo.MongoServerError {
  return error instanceof mongoose.mongo.MongoServerError && error.code === MONGO_DUPLICATE_KEY;
}
