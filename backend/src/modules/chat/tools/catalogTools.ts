import { z } from 'zod';
import type { AuthContext } from '../../../shared/auth/authContext.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { formatCents, reaisToCents } from '../../../shared/utils/money.js';
import { objectIdSchema } from '../../../shared/validation/objectId.js';
import type { PublicProduct } from '../../products/product.model.js';
import type { ProductSort } from '../../products/product.schemas.js';
import { productService } from '../../products/product.service.js';
import { type ChatTool, defineTool } from './toolRunner.js';

/*
 * Read-only catalog tools. They call the same product service used by the
 * REST API, always with the authenticated user's context, so tenant isolation
 * is enforced by the same repository code. JSON Schemas follow strict mode:
 * every property is required, optional values are nullable, and no extra
 * properties are allowed. Zod re-validates everything before execution.
 */

const MAX_PRICE_REAIS = 1_000_000;
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 20;
const SUMMARY_DESCRIPTION_LENGTH = 200;

const SORT_MAP = {
  price_asc: 'price',
  price_desc: '-price',
  name: 'name',
  newest: '-createdAt',
} as const satisfies Record<string, ProductSort>;

type ToolSort = keyof typeof SORT_MAP;
const TOOL_SORTS = Object.keys(SORT_MAP) as [ToolSort, ...ToolSort[]];

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Fields shared with the model: no tenant or audit data (companyId, createdBy). */
function toToolProduct(product: PublicProduct) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price_cents: product.price,
    price_formatted: formatCents(product.price),
    stock: product.stock,
    in_stock: product.stock > 0,
  };
}

function isProductNotFound(error: unknown): boolean {
  return error instanceof AppError && error.code === 'PRODUCT_NOT_FOUND';
}

/** Case- and accent-insensitive match against the company's real categories. */
function findCategory(categories: string[], requested: string): string | undefined {
  return categories.find((category) => category.localeCompare(requested, 'pt-BR', { sensitivity: 'base' }) === 0);
}

// ---------------------------------------------------------------------------

const priceSchema = z.number().min(0).max(MAX_PRICE_REAIS);

const searchProductsSchema = z
  .strictObject({
    query: z.string().trim().max(100).nullish(),
    category: z.string().trim().max(60).nullish(),
    min_price: priceSchema.nullish(),
    max_price: priceSchema.nullish(),
    in_stock_only: z.boolean().nullish(),
    sort: z.enum(TOOL_SORTS).nullish(),
    limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).nullish(),
  })
  .refine((input) => input.min_price == null || input.max_price == null || input.min_price <= input.max_price, {
    message: 'min_price must be less than or equal to max_price',
    path: ['min_price'],
  });

const searchProducts = defineTool({
  definition: {
    name: 'search_products',
    description:
      'Searches the company product catalog. Combine filters as needed; use null for filters that do not apply. ' +
      'Returns at most `limit` products plus `total_matches`, the total number of matching products.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['query', 'category', 'min_price', 'max_price', 'in_stock_only', 'sort', 'limit'],
      properties: {
        query: {
          type: ['string', 'null'],
          description: 'One or two short keywords matched against name, SKU and description. null for no text filter.',
        },
        category: {
          type: ['string', 'null'],
          description: 'Category name (use list_categories to discover them). null for all categories.',
        },
        min_price: {
          type: ['number', 'null'],
          description: 'Minimum price in Brazilian reais (BRL), inclusive. Example: 100 or 49.9. null for no minimum.',
        },
        max_price: {
          type: ['number', 'null'],
          description: 'Maximum price in Brazilian reais (BRL), inclusive. Example: 500. null for no maximum.',
        },
        in_stock_only: {
          type: ['boolean', 'null'],
          description: 'true to return only products with stock greater than zero.',
        },
        sort: {
          anyOf: [{ type: 'string', enum: TOOL_SORTS }, { type: 'null' }],
          description: 'Result order. null for newest first.',
        },
        limit: {
          type: ['integer', 'null'],
          description: `Maximum number of products to return (1-${MAX_SEARCH_LIMIT}). null for ${DEFAULT_SEARCH_LIMIT}.`,
        },
      },
    },
  },
  schema: searchProductsSchema,
  async execute(auth: AuthContext, input) {
    let category: string | undefined;
    if (input.category) {
      const categories = await productService.listCategories(auth);
      category = findCategory(categories, input.category);
      if (!category) {
        return {
          data: { category_not_found: input.category, available_categories: categories, total_matches: 0, products: [] },
          resultCount: 0,
        };
      }
    }

    // The model works in reais; the database stores integer cents.
    const { items, total } = await productService.search(auth, {
      search: input.query || undefined,
      category,
      minPrice: input.min_price == null ? undefined : reaisToCents(input.min_price),
      maxPrice: input.max_price == null ? undefined : reaisToCents(input.max_price),
      inStockOnly: input.in_stock_only ?? false,
      sort: SORT_MAP[input.sort ?? 'newest'],
      limit: input.limit ?? DEFAULT_SEARCH_LIMIT,
    });

    return {
      data: {
        total_matches: total,
        returned: items.length,
        products: items.map((product) => ({
          ...toToolProduct(product),
          description: truncate(product.description, SUMMARY_DESCRIPTION_LENGTH),
        })),
      },
      resultCount: items.length,
    };
  },
});

// ---------------------------------------------------------------------------

const getProductDetailsSchema = z
  .strictObject({
    product_id: objectIdSchema.nullish(),
    sku: z.string().trim().min(1).max(64).nullish(),
  })
  .refine((input) => Boolean(input.product_id) !== Boolean(input.sku), {
    message: 'Provide exactly one of product_id or sku',
  });

const getProductDetails = defineTool({
  definition: {
    name: 'get_product_details',
    description:
      'Returns full details of one product of the company, by id (from search results) or by SKU. ' +
      'Provide exactly one of them and null for the other. Returns found=false when it does not exist.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['product_id', 'sku'],
      properties: {
        product_id: { type: ['string', 'null'], description: 'Product id returned by search_products.' },
        sku: { type: ['string', 'null'], description: 'Product SKU code.' },
      },
    },
  },
  schema: getProductDetailsSchema,
  async execute(auth: AuthContext, input) {
    try {
      const product = input.product_id
        ? await productService.getById(auth, input.product_id)
        : await productService.getBySku(auth, input.sku ?? '');

      return {
        data: {
          found: true,
          product: {
            ...toToolProduct(product),
            description: product.description,
            image_url: product.imageUrl,
            updated_at: product.updatedAt.toISOString(),
          },
        },
        resultCount: 1,
      };
    } catch (error) {
      // Missing and other-company products are indistinguishable by design.
      if (isProductNotFound(error)) return { data: { found: false }, resultCount: 0 };
      throw error;
    }
  },
});

// ---------------------------------------------------------------------------

const listCategories = defineTool({
  definition: {
    name: 'list_categories',
    description: 'Lists the product categories that exist in the company catalog.',
    parameters: { type: 'object', additionalProperties: false, required: [], properties: {} },
  },
  schema: z.strictObject({}),
  async execute(auth: AuthContext) {
    const categories = await productService.listCategories(auth);
    return { data: { categories }, resultCount: categories.length };
  },
});

export const catalogTools: ReadonlyMap<string, ChatTool> = new Map(
  [searchProducts, getProductDetails, listCategories].map((tool) => [tool.definition.name, tool]),
);
