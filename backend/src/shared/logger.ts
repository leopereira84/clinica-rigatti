import { env } from '../config/env.js';

const isSilent = env.NODE_ENV === 'test';

/**
 * Minimal logger. Kept as a single module so it can be swapped for a structured
 * logger later without touching call sites. Silent during tests.
 */
export const logger = {
  info(message: string): void {
    if (!isSilent) console.log(`[info] ${message}`);
  },
  error(message: string, error?: unknown): void {
    if (!isSilent) console.error(`[error] ${message}`, error ?? '');
  },
};
