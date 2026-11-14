import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ProductModel } from '../src/modules/products/product.model.js';
import { type RegisteredCompany, registerCompany } from './helpers/auth.js';
import { buildProductPayload, createMemberAndLogin, createProduct } from './helpers/products.js';
import { clearDatabase, connectTestDatabase, disconnectTestDatabase } from './setup/database.js';

let app: Express;
let companyA: RegisteredCompany;
let companyB: RegisteredCompany;
let memberTokenA: string;
let productA: string;
let productB: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(connectTestDatabase);
afterAll(disconnectTestDatabase);

// Two tenants, each with one product. Names overlap on purpose ("Banco"),
// so a leaky query would be visible in search results.
beforeEach(async () => {
  await clearDatabase();
  app = createApp();
  companyA = await registerCompany(app, { companyName: 'Aurora Móveis' });
  companyB = await registerCompany(app, { companyName: 'Verde Jardim' });
  memberTokenA = await createMemberAndLogin(app, companyA.token, 'membro@aurora.example');

  productA = await createProduct(app, companyA.token, { name: 'Banco Estofado', sku: 'BANCO-1', category: 'Sala' });
  productB = await createProduct(app, companyB.token, { name: 'Banco de Jardim', sku: 'BANCO-1', category: 'Jardim' });
});

describe('Tenant isolation between companies', () => {
  it('lists only products of the authenticated company', async () => {
    const resA = await request(app).get('/api/products').set(auth(companyA.token));
    const resB = await request(app).get('/api/products').set(auth(companyB.token));

    expect(resA.body.items.map((p: { id: string }) => p.id)).toEqual([productA]);
    expect(resB.body.items.map((p: { id: string }) => p.id)).toEqual([productB]);
    expect(resA.body.total).toBe(1);
  });

  it('does not find the other company products through search or category', async () => {
    const bySearch = await request(app).get('/api/products?search=jardim').set(auth(companyA.token));
    const byCategory = await request(app).get('/api/products?category=Jardim').set(auth(companyA.token));
    const categories = await request(app).get('/api/products/categories').set(auth(companyA.token));

    expect(bySearch.body.items).toEqual([]);
    expect(byCategory.body.items).toEqual([]);
    expect(categories.body.items).toEqual(['Sala']);
  });

  it('returns 404 when reading a product of another company', async () => {
    const res = await request(app).get(`/api/products/${productB}`).set(auth(companyA.token));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns 404 and changes nothing when updating a product of another company', async () => {
    const res = await request(app)
      .put(`/api/products/${productB}`)
      .set(auth(companyA.token))
      .send(buildProductPayload({ name: 'Invadido', price: 1 }));

    expect(res.status).toBe(404);
    const stored = await ProductModel.findById(productB).orFail();
    expect(stored.name).toBe('Banco de Jardim');
    expect(stored.companyId.toString()).toBe(companyB.companyId);
  });

  it('returns 404 and keeps the product when deleting a product of another company', async () => {
    const res = await request(app).delete(`/api/products/${productB}`).set(auth(companyA.token));

    expect(res.status).toBe(404);
    expect(await ProductModel.exists({ _id: productB })).not.toBeNull();
  });

  it('answers the same way for another company product and a nonexistent id', async () => {
    const other = await request(app).get(`/api/products/${productB}`).set(auth(companyA.token));
    const missing = await request(app).get('/api/products/507f1f77bcf86cd799439011').set(auth(companyA.token));

    expect(other.status).toBe(missing.status);
    expect(other.body).toEqual(missing.body);
  });

  it.each([
    ['companyId', () => ({ companyId: companyB.companyId })],
    ['createdBy', () => ({ createdBy: companyB.userId })],
  ])('rejects a client-provided %s on create and on update', async (_field, extra) => {
    const create = await request(app)
      .post('/api/products')
      .set(auth(companyA.token))
      .send({ ...buildProductPayload({ sku: 'NEW-1' }), ...extra() });
    const update = await request(app)
      .put(`/api/products/${productA}`)
      .set(auth(companyA.token))
      .send({ ...buildProductPayload(), ...extra() });

    expect(create.status).toBe(400);
    expect(update.status).toBe(400);
    expect(await ProductModel.countDocuments({ companyId: companyB.companyId })).toBe(1);
    const stored = await ProductModel.findById(productA).orFail();
    expect(stored.companyId.toString()).toBe(companyA.companyId);
  });

  it('allows the same SKU in different companies but not twice in the same company', async () => {
    const duplicate = await request(app)
      .post('/api/products')
      .set(auth(companyA.token))
      .send(buildProductPayload({ sku: 'banco-1' })); // normalized to BANCO-1

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('SKU_ALREADY_EXISTS');
  });
});

describe('Permissions by role', () => {
  it('lets a user read products of their own company', async () => {
    const list = await request(app).get('/api/products').set(auth(memberTokenA));
    const one = await request(app).get(`/api/products/${productA}`).set(auth(memberTokenA));

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(one.status).toBe(200);
  });

  it('forbids a user from creating, updating or deleting products', async () => {
    const create = await request(app).post('/api/products').set(auth(memberTokenA)).send(buildProductPayload());
    const update = await request(app)
      .put(`/api/products/${productA}`)
      .set(auth(memberTokenA))
      .send(buildProductPayload());
    const remove = await request(app).delete(`/api/products/${productA}`).set(auth(memberTokenA));

    for (const res of [create, update, remove]) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
    expect(await ProductModel.countDocuments({ companyId: companyA.companyId })).toBe(1);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });
});

describe('Product CRUD', () => {
  it('creates a product with normalized fields and without exposing tenant fields', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(companyA.token))
      .send(buildProductPayload({ name: '  Mesa Lateral  ', sku: ' mesa-02 ' }));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: 'Mesa Lateral',
      sku: 'MESA-02',
      price: 45_990,
      imageUrl: 'https://images.example.com/cadeira.jpg',
    });
    expect(res.body).not.toHaveProperty('companyId');
    expect(res.body).not.toHaveProperty('createdBy');

    const stored = await ProductModel.findById(res.body.id).orFail();
    expect(stored.companyId.toString()).toBe(companyA.companyId);
    expect(stored.createdBy.toString()).toBe(companyA.userId);
  });

  it('applies defaults for optional fields', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(companyA.token))
      .send({ name: 'Puff', price: 9_990, category: 'Sala' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ description: '', stock: 0, imageUrl: null, sku: null });
  });

  it.each([
    ['javascript: URL', { imageUrl: 'javascript:alert(1)' }],
    ['ftp URL', { imageUrl: 'ftp://files.example.com/a.jpg' }],
    ['decimal price', { price: 19.99 }],
    ['negative price', { price: -1 }],
    ['negative stock', { stock: -5 }],
    ['invalid SKU', { sku: 'sku com espaço' }],
    ['short name', { name: 'A' }],
  ])('rejects %s', async (_case, override) => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(companyA.token))
      .send({ ...buildProductPayload({ sku: 'X-1' }), ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('replaces a product on PUT and removes optional fields left out', async () => {
    const res = await request(app)
      .put(`/api/products/${productA}`)
      .set(auth(companyA.token))
      .send({ name: 'Banco Estofado Veludo', price: 59_900, category: 'Sala', stock: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Banco Estofado Veludo',
      price: 59_900,
      stock: 3,
      imageUrl: null,
      sku: null,
      description: '',
    });
  });

  it('deletes a product of the own company', async () => {
    const res = await request(app).delete(`/api/products/${productA}`).set(auth(companyA.token));
    const after = await request(app).get(`/api/products/${productA}`).set(auth(companyA.token));

    expect(res.status).toBe(204);
    expect(after.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/products/not-an-id').set(auth(companyA.token));
    expect(res.status).toBe(400);
  });
});

describe('Product listing', () => {
  beforeEach(async () => {
    await createProduct(app, companyA.token, { name: 'Sofá Retrátil', sku: 'SOFA-1', price: 250_000 });
    await createProduct(app, companyA.token, { name: 'Abajur', sku: 'ABJ-1', price: 8_000, category: 'Decoração' });
  });

  it('paginates and reports totals', async () => {
    const res = await request(app).get('/api/products?limit=2&page=2&sort=name').set(auth(companyA.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(['Sofá Retrátil']);
  });

  it('sorts by price descending', async () => {
    const res = await request(app).get('/api/products?sort=-price').set(auth(companyA.token));
    const prices = res.body.items.map((p: { price: number }) => p.price);

    expect(prices).toEqual([...prices].sort((a: number, b: number) => b - a));
  });

  it('searches case-insensitively by name, SKU or description', async () => {
    const byName = await request(app).get('/api/products?search=SOFÁ').set(auth(companyA.token));
    const bySku = await request(app).get('/api/products?search=abj').set(auth(companyA.token));

    expect(byName.body.items.map((p: { name: string }) => p.name)).toEqual(['Sofá Retrátil']);
    expect(bySku.body.items.map((p: { name: string }) => p.name)).toEqual(['Abajur']);
  });

  it('treats regex characters in the search literally', async () => {
    const res = await request(app).get(`/api/products?search=${encodeURIComponent('.*')}`).set(auth(companyA.token));

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it.each([
    ['limit above 50', 'limit=51'],
    ['unknown sort field', 'sort=companyId'],
    ['repeated parameter', 'category=Sala&category=Jardim'],
  ])('rejects %s', async (_case, query) => {
    const res = await request(app).get(`/api/products?${query}`).set(auth(companyA.token));
    expect(res.status).toBe(400);
  });

  it('ignores operator-like query keys instead of turning them into filters', async () => {
    const res = await request(app).get('/api/products?category[$ne]=nada').set(auth(companyA.token));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
  });
});
