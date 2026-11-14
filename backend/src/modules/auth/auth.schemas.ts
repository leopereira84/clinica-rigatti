import { z } from 'zod';
import { emailSchema, newPasswordSchema, personNameSchema } from '../../shared/validation/credentials.js';

// Strict: `role`, `companyId` or any other extra field is rejected, so a
// public signup can never choose privileges or join an existing company.
export const registerSchema = z.strictObject({
  companyName: z.string().trim().min(2).max(100),
  name: personNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

// No password policy on login: only presence and a sane upper bound.
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
