import { apiRequest } from '../../lib/api';
import type { Product, ProductList, ProductListParams, ProductPayload } from './types';

export const PAGE_SIZE = 12;

function toQueryString({ search, category, sort, page }: ProductListParams): string {
  const query = new URLSearchParams({ sort, page: String(page), limit: String(PAGE_SIZE) });
  if (search) query.set('search', search);
  if (category) query.set('category', category);
  return query.toString();
}

export const productsApi = {
  list: (params: ProductListParams, signal?: AbortSignal) =>
    apiRequest<ProductList>(`/products?${toQueryString(params)}`, { signal }),

  categories: (signal?: AbortSignal) => apiRequest<{ items: string[] }>('/products/categories', { signal }),

  get: (id: string, signal?: AbortSignal) => apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { signal }),

  create: (payload: ProductPayload) => apiRequest<Product>('/products', { method: 'POST', body: payload }),

  update: (id: string, payload: ProductPayload) =>
    apiRequest<Product>(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: payload }),

  remove: (id: string) => apiRequest<void>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
