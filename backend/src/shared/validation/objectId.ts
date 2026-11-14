import { z } from 'zod';

/** 24-character hex string accepted as a MongoDB ObjectId. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
