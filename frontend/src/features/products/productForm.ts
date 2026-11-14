import { centsToInputValue, parseCurrencyToCents } from '../../lib/money';
import { isHttpUrl } from '../../lib/url';
import { type FieldErrors, hasErrors, validateLength } from '../../lib/validation';
import type { Product, ProductPayload } from './types';

/** Form state is kept as strings; conversion happens only on submit. */
export type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  sku: string;
  imageUrl: string;
};

export type ProductFormErrors = FieldErrors<keyof ProductFormValues>;

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock: '0',
  sku: '',
  imageUrl: '',
};

// Same limits as the backend schema.
export const LIMITS = {
  maxPriceCents: 100_000_000,
  maxStock: 1_000_000,
  maxDescription: 2000,
  maxImageUrl: 2048,
} as const;

const SKU_PATTERN = /^[A-Z0-9._-]{1,64}$/;

export function productToFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description,
    price: centsToInputValue(product.price),
    category: product.category,
    stock: String(product.stock),
    sku: product.sku ?? '',
    imageUrl: product.imageUrl ?? '',
  };
}

function validatePrice(value: string): string | undefined {
  if (!value.trim()) return 'Informe o preço.';
  const cents = parseCurrencyToCents(value);
  if (cents === null) return 'Informe um valor válido, como 199,90.';
  if (cents > LIMITS.maxPriceCents) return 'O preço máximo é R$ 1.000.000,00.';
  return undefined;
}

function validateStock(value: string): string | undefined {
  const stock = value.trim();
  if (!/^\d+$/.test(stock)) return 'Informe um número inteiro igual ou maior que zero.';
  if (Number(stock) > LIMITS.maxStock) return 'O estoque máximo é 1.000.000.';
  return undefined;
}

function validateSku(value: string): string | undefined {
  const sku = value.trim().toUpperCase();
  if (sku && !SKU_PATTERN.test(sku)) return 'Use apenas letras, números, ponto, hífen ou sublinhado (até 64).';
  return undefined;
}

function validateImageUrl(value: string): string | undefined {
  const url = value.trim();
  if (!url) return undefined;
  if (url.length > LIMITS.maxImageUrl || !isHttpUrl(url)) return 'Informe uma URL começando com http:// ou https://.';
  return undefined;
}

export type ProductFormResult =
  | { ok: true; payload: ProductPayload }
  | { ok: false; errors: ProductFormErrors };

/** Validates the form and converts it into the API payload (price in cents). */
export function buildProductPayload(values: ProductFormValues): ProductFormResult {
  const errors: ProductFormErrors = {
    name: validateLength(values.name, 'o nome do produto', 2, 120),
    category: validateLength(values.category, 'a categoria', 2, 60),
    price: validatePrice(values.price),
    stock: validateStock(values.stock),
    sku: validateSku(values.sku),
    imageUrl: validateImageUrl(values.imageUrl),
    description:
      values.description.trim().length > LIMITS.maxDescription
        ? `Use no máximo ${LIMITS.maxDescription} caracteres.`
        : undefined,
  };

  if (hasErrors(errors)) return { ok: false, errors };

  const sku = values.sku.trim().toUpperCase();
  const imageUrl = values.imageUrl.trim();

  return {
    ok: true,
    payload: {
      name: values.name.trim(),
      description: values.description.trim(),
      price: parseCurrencyToCents(values.price) ?? 0,
      category: values.category.trim(),
      stock: Number(values.stock.trim()),
      ...(sku && { sku }),
      ...(imageUrl && { imageUrl }),
    },
  };
}
