import { describe, expect, it } from 'vitest';
import { buildProductPayload, EMPTY_PRODUCT_FORM, type ProductFormValues, productToFormValues } from './productForm';
import type { Product } from './types';

const validForm: ProductFormValues = {
  name: '  Sofá Retrátil  ',
  description: ' Confortável ',
  price: '3.499,90',
  category: ' Sala ',
  stock: '8',
  sku: ' aur-sofa-001 ',
  imageUrl: ' https://picsum.photos/seed/sofa/600/400 ',
};

describe('buildProductPayload', () => {
  it('converts reais to integer cents and normalizes fields', () => {
    const result = buildProductPayload(validForm);

    expect(result).toEqual({
      ok: true,
      payload: {
        name: 'Sofá Retrátil',
        description: 'Confortável',
        price: 349_990,
        category: 'Sala',
        stock: 8,
        sku: 'AUR-SOFA-001',
        imageUrl: 'https://picsum.photos/seed/sofa/600/400',
      },
    });
  });

  it('omits optional fields left empty (the API removes them on update)', () => {
    const result = buildProductPayload({ ...validForm, sku: '  ', imageUrl: '' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).not.toHaveProperty('sku');
      expect(result.payload).not.toHaveProperty('imageUrl');
    }
  });

  it('reports every invalid field of an empty form', () => {
    const result = buildProductPayload({ ...EMPTY_PRODUCT_FORM, stock: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).filter((key) => result.errors[key as keyof typeof result.errors])).toEqual(
        expect.arrayContaining(['name', 'category', 'price', 'stock']),
      );
    }
  });

  it.each([
    ['price with three decimals', { price: '10,999' }, 'price'],
    ['price above the maximum', { price: '1.000.000,01' }, 'price'],
    ['negative stock', { stock: '-1' }, 'stock'],
    ['fractional stock', { stock: '1,5' }, 'stock'],
    ['SKU with spaces', { sku: 'SKU 1' }, 'sku'],
    ['javascript: image URL', { imageUrl: 'javascript:alert(1)' }, 'imageUrl'],
    ['relative image URL', { imageUrl: '/img/sofa.png' }, 'imageUrl'],
    ['one-letter name', { name: 'A' }, 'name'],
  ])('rejects %s', (_case, override, field) => {
    const result = buildProductPayload({ ...validForm, ...override });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field as keyof typeof result.errors]).toEqual(expect.any(String));
  });
});

describe('productToFormValues', () => {
  it('round-trips a product through the form without changing its price', () => {
    const product: Product = {
      id: '1',
      name: 'Cadeira',
      description: '',
      price: 54_990,
      category: 'Jantar',
      imageUrl: null,
      sku: null,
      stock: 40,
      createdAt: '',
      updatedAt: '',
    };

    const values = productToFormValues(product);
    const result = buildProductPayload(values);

    expect(values.price).toBe('549,90');
    expect(result.ok && result.payload.price).toBe(54_990);
  });
});
