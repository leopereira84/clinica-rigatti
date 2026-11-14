import { z } from 'zod';

// bcrypt only uses the first 72 bytes of a password; longer inputs are
// rejected instead of being silently truncated.
const BCRYPT_MAX_BYTES = 72;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email').max(254));

export const newPasswordSchema = z
  .string()
  .min(8, 'Password must have at least 8 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES, {
    message: `Password must have at most ${BCRYPT_MAX_BYTES} bytes`,
  });

export const personNameSchema = z.string().trim().min(2).max(100);
