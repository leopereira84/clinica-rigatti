import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Starts a single in-memory MongoDB replica set shared by all test files.
    // Each test file connects to its own database (see tests/setup/database.ts).
    globalSetup: ['tests/setup/global-setup.ts'],
    // The first run may download the MongoDB binary.
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      // Required by env validation; tests connect to the in-memory URI provided by globalSetup.
      MONGODB_URI: 'mongodb://127.0.0.1:1/unused-in-tests',
      JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      // Fast hashing in tests only; production default is 12.
      BCRYPT_ROUNDS: '4',
      CORS_ORIGIN: 'http://localhost:5173',
      // Tests never reach the real LLM provider, even if a key exists in the shell.
      OPENAI_API_KEY: '',
    },
  },
});
