import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { CompanyModel } from '../src/modules/companies/company.model.js';
import { ProductModel } from '../src/modules/products/product.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { DEMO_COMPANIES } from '../src/seed/demoData.js';
import { seedDemoData } from '../src/seed/seedDemo.js';
import { registerCompany } from './helpers/auth.js';
import { createProduct } from './helpers/products.js';
import { clearDatabase, connectTestDatabase, disconnectTestDatabase } from './setup/database.js';

const SEED_PASSWORD = 'demo-password-123';
let app: Express;

beforeAll(connectTestDatabase);
afterAll(disconnectTestDatabase);
beforeEach(async () => {
  await clearDatabase();
  app = createApp();
});

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: SEED_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token;
}

describe('seedDemoData', () => {
  it('creates two companies with at least ten products, an admin and a user each', async () => {
    const summary = await seedDemoData(SEED_PASSWORD);

    expect(summary.companies).toHaveLength(2);
    for (const demo of DEMO_COMPANIES) {
      const company = await CompanyModel.findOne({ name: demo.name }).orFail();
      const roles = (await UserModel.find({ companyId: company._id })).map((user) => user.role).sort();

      expect(await ProductModel.countDocuments({ companyId: company._id })).toBeGreaterThanOrEqual(10);
      expect(roles).toEqual(['admin', 'user']);
    }
  });

  it('is idempotent: running twice keeps exactly one copy of the demo data', async () => {
    await seedDemoData(SEED_PASSWORD);
    const second = await seedDemoData(SEED_PASSWORD);

    expect(second.removedCompanies).toBe(2);
    expect(await CompanyModel.countDocuments()).toBe(2);
    expect(await UserModel.countDocuments()).toBe(4);
    expect(await ProductModel.countDocuments()).toBe(24);
  });

  it('does not touch companies that are not part of the demo', async () => {
    const other = await registerCompany(app, { companyName: 'Empresa Real' });
    const productId = await createProduct(app, other.token);

    await seedDemoData(SEED_PASSWORD);

    expect(await CompanyModel.exists({ _id: other.companyId })).not.toBeNull();
    expect(await UserModel.exists({ _id: other.userId })).not.toBeNull();
    expect(await ProductModel.exists({ _id: productId })).not.toBeNull();
  });

  it('produces demo users that log in and only see their own company catalog', async () => {
    await seedDemoData(SEED_PASSWORD);
    const [aurora, verde] = DEMO_COMPANIES;
    if (!aurora || !verde) throw new Error('Expected two demo companies');

    const auroraUserToken = await loginAs('user@aurora-moveis.example');
    const list = await request(app)
      .get('/api/products?limit=50')
      .set('Authorization', `Bearer ${auroraUserToken}`);
    const names = list.body.items.map((product: { name: string }) => product.name);

    expect(list.body.total).toBe(aurora.products.length);
    expect(names).toEqual(expect.arrayContaining(aurora.products.map((product) => product.name)));
    for (const product of verde.products) {
      expect(names).not.toContain(product.name);
    }

    const write = await request(app)
      .delete(`/api/products/${(list.body.items[0] as { id: string }).id}`)
      .set('Authorization', `Bearer ${auroraUserToken}`);
    expect(write.status).toBe(403);
  });
});
