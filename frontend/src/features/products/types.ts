export interface Product {
  id: string;
  name: string;
  description: string;
  /** Integer amount in cents, as stored by the API. */
  price: number;
  category: string;
  imageUrl: string | null;
  sku: string | null;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductList {
  items: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Body accepted by POST /products and PUT /products/:id. */
export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  sku?: string;
}

export const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Mais recentes' },
  { value: 'createdAt', label: 'Mais antigos' },
  { value: 'name', label: 'Nome (A–Z)' },
  { value: '-name', label: 'Nome (Z–A)' },
  { value: 'price', label: 'Menor preço' },
  { value: '-price', label: 'Maior preço' },
] as const;

export type ProductSort = (typeof SORT_OPTIONS)[number]['value'];

export interface ProductListParams {
  search: string;
  category: string;
  sort: ProductSort;
  page: number;
}
