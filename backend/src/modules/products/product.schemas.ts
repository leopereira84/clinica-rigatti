import { z } from 'zod';
import { objectIdSchema } from '../../shared/validation/objectId.js';

const MAX_PRICE_CENTS = 100_000_000; // R$ 1.000.000,00

// Only http(s): blocks `javascript:`, `data:` and other schemes the frontend would render.
const imageUrlSchema = z.url({ protocol: /^https?$/, error: 'Image URL must be a valid http(s) URL' }).max(2048);

/**
 * Body for create (POST) and full replacement (PUT). Strict: `companyId`,
 * `createdBy` or any unknown field is rejected. Optional fields omitted on
 * PUT are removed from the product.
 */
export const productInputSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(''),
  price: z.number().int('Price must be an integer amount in cents').min(0).max(MAX_PRICE_CENTS),
  category: z.string().trim().min(2).max(60),
  imageUrl: imageUrlSchema.optional(),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9._-]{1,64}$/, 'SKU may contain only letters, digits, ".", "_" and "-"')
    .optional(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
});

export const productIdParamsSchema = z.object({ id: objectIdSchema });

export const SORT_OPTIONS = ['name', '-name', 'price', '-price', 'createdAt', '-createdAt'] as const;

export const listProductsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(SORT_OPTIONS).default('-createdAt'),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ProductSort = (typeof SORT_OPTIONS)[number];
