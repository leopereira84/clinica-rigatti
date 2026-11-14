import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';

// Compared against when there is no stored hash (unknown email), so a login
// attempt takes about the same time whether or not the account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-timing', env.BCRYPT_ROUNDS);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

/** Always runs a bcrypt comparison, even when `storedHash` is missing. */
export async function verifyPassword(password: string, storedHash: string | undefined): Promise<boolean> {
  const matches = await bcrypt.compare(password, storedHash ?? DUMMY_PASSWORD_HASH);
  return storedHash !== undefined && matches;
}
