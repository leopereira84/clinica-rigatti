import mongoose, { type QueryFilter } from 'mongoose';
import { escapeRegex } from '../../shared/utils/escapeRegex.js';
import { type Product, type ProductDocument, ProductModel } from './product.model.js';
import type { ProductInput, ProductSort } from './product.schemas.js';

export interface ProductFilters {
  search?: string;
  category?: string;
  /** Inclusive bounds, in cents. */
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

export interface ProductPage {
  skip: number;
  limit: number;
  sort: ProductSort;
}

const OPTIONAL_FIELDS = ['imageUrl', 'sku'] as const;

/**
 * The only access point to product data. Every method takes `companyId` as
 * its first argument and always includes it in the query, so a product from
 * another company behaves exactly like a product that does not exist.
 */
function buildFilter(companyId: string, filters: ProductFilters): QueryFilter<Product> {
  const filter: QueryFilter<Product> = { companyId };

  if (filters.category) {
    filter.category = filters.category;
  }

  if (filters.search) {
    // RegExp objects (not `$regex` objects) keep working with sanitizeFilter;
    // the input is escaped so it is always matched literally.
    const pattern = new RegExp(escapeRegex(filters.search), 'i');
    filter.$or = [{ name: pattern }, { sku: pattern }, { description: pattern }];
  }

  // sanitizeFilter would neutralize `{ $gte, $lte }` (it wraps nested `$`
  // operators in `$eq`), so server-built operators are marked as trusted.
  // Only validated numbers ever reach these objects.
  const priceRange = buildPriceRange(filters.minPrice, filters.maxPrice);
  if (priceRange) {
    filter.price = mongoose.trusted(priceRange);
  }

  if (filters.inStockOnly) {
    filter.stock = mongoose.trusted({ $gt: 0 });
  }

  return filter;
}

function buildPriceRange(min?: number, max?: number): { $gte?: number; $lte?: number } | null {
  if (min === undefined && max === undefined) return null;
  return {
    ...(min !== undefined && { $gte: min }),
    ...(max !== undefined && { $lte: max }),
  };
}

function toSortSpec(sort: ProductSort): Record<string, 1 | -1> {
  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');
  // Secondary key keeps pagination stable when values repeat.
  return { [field]: direction, _id: direction };
}

export const productRepository = {
  async findMany(
    companyId: string,
    filters: ProductFilters,
    page: ProductPage,
  ): Promise<{ items: ProductDocument[]; total: number }> {
    const filter = buildFilter(companyId, filters);

    const [items, total] = await Promise.all([
      ProductModel.find(filter).sort(toSortSpec(page.sort)).skip(page.skip).limit(page.limit).exec(),
      ProductModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  },

  findById(companyId: string, productId: string): Promise<ProductDocument | null> {
    return ProductModel.findOne({ _id: productId, companyId }).exec();
  },

  /** SKUs are stored uppercase and are unique only within a company. */
  findBySku(companyId: string, sku: string): Promise<ProductDocument | null> {
    return ProductModel.findOne({ companyId, sku: sku.trim().toUpperCase() }).exec();
  },

  create(companyId: string, createdBy: string, input: ProductInput): Promise<ProductDocument> {
    return new ProductModel({ ...input, companyId, createdBy }).save();
  },

  /** Full replacement of editable fields; optional fields left out are removed. */
  update(companyId: string, productId: string, input: ProductInput): Promise<ProductDocument | null> {
    const unset: Record<string, 1> = {};
    for (const field of OPTIONAL_FIELDS) {
      if (input[field] === undefined) unset[field] = 1;
    }

    return ProductModel.findOneAndUpdate(
      { _id: productId, companyId },
      { $set: input, ...(Object.keys(unset).length > 0 && { $unset: unset }) },
      { returnDocument: 'after', runValidators: true },
    ).exec();
  },

  async delete(companyId: string, productId: string): Promise<boolean> {
    const result = await ProductModel.deleteOne({ _id: productId, companyId }).exec();
    return result.deletedCount > 0;
  },

  async listCategories(companyId: string): Promise<string[]> {
    const categories = await ProductModel.distinct('category', { companyId }).exec();
    return categories.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },
};
