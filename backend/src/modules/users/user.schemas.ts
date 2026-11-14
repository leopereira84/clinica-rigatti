import { z } from 'zod';
import { emailSchema, newPasswordSchema, personNameSchema } from '../../shared/validation/credentials.js';

// Strict: neither `role` nor `companyId` can be chosen by the client. New
// members always join the admin's own company with the `user` role.
export const createUserSchema = z.strictObject({
  name: personNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
