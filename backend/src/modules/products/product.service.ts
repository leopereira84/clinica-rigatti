import type { AuthContext } from '../../shared/auth/authContext.js';
import { isDuplicateKeyError } from '../../shared/database/errors.js';
import { AppError } from '../../shared/errors/AppError.js';
import { type PublicProduct, toPublicProduct } from './product.model.js';
import { type ProductFilters, productRepository } from './product.repository.js';
import type { ListProductsQuery, ProductInput, ProductSort } from './product.schemas.js';

export interface ProductSearchCriteria extends ProductFilters {
  sort: ProductSort;
  limit: number;
}

export interface ProductSearchResult {
  items: PublicProduct[];
  /** Total of matching products, which may exceed the number of returned items. */
  total: number;
}

export interface ProductList {
  items: PublicProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Same error for "does not exist" and "belongs to another company".
function productNotFound(): AppError {
  return new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
}

function skuAlreadyExists(): AppError {
  return new AppError(409, 'SKU_ALREADY_EXISTS', 'Another product already uses this SKU');
}

function rethrowSkuConflict(error: unknown): never {
  if (isDuplicateKeyError(error)) throw skuAlreadyExists();
  throw error;
}

// Every operation takes the tenant from `auth` (built server-side by
// `authenticate`), never from request data.

async function list(auth: AuthContext, query: ListProductsQuery): Promise<ProductList> {
  const { page, limit, sort, search, category } = query;
  const { items, total } = await productRepository.findMany(
    auth.companyId,
    { search, category },
    { skip: (page - 1) * limit, limit, sort },
  );

  return {
    items: items.map(toPublicProduct),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getById(auth: AuthContext, productId: string): Promise<PublicProduct> {
  const product = await productRepository.findById(auth.companyId, productId);
  if (!product) throw productNotFound();
  return toPublicProduct(product);
}

async function getBySku(auth: AuthContext, sku: string): Promise<PublicProduct> {
  const product = await productRepository.findBySku(auth.companyId, sku);
  if (!product) throw productNotFound();
  return toPublicProduct(product);
}

/** Filtered search (price range in cents, stock) used by the AI assistant tools. */
async function search(auth: AuthContext, criteria: ProductSearchCriteria): Promise<ProductSearchResult> {
  const { sort, limit, ...filters } = criteria;
  const { items, total } = await productRepository.findMany(auth.companyId, filters, { skip: 0, limit, sort });
  return { items: items.map(toPublicProduct), total };
}

async function create(auth: AuthContext, input: ProductInput): Promise<PublicProduct> {
  try {
    const product = await productRepository.create(auth.companyId, auth.userId, input);
    return toPublicProduct(product);
  } catch (error) {
    return rethrowSkuConflict(error);
  }
}

async function update(auth: AuthContext, productId: string, input: ProductInput): Promise<PublicProduct> {
  try {
    const product = await productRepository.update(auth.companyId, productId, input);
    if (!product) throw productNotFound();
    return toPublicProduct(product);
  } catch (error) {
    return rethrowSkuConflict(error);
  }
}

async function remove(auth: AuthContext, productId: string): Promise<void> {
  const deleted = await productRepository.delete(auth.companyId, productId);
  if (!deleted) throw productNotFound();
}

function listCategories(auth: AuthContext): Promise<string[]> {
  return productRepository.listCategories(auth.companyId);
}

export const productService = { list, getById, getBySku, search, create, update, remove, listCategories };
