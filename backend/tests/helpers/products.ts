import type { Express } from 'express';
import request from 'supertest';
import { DEFAULT_PASSWORD } from './auth.js';

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  sku?: string;
  stock?: number;
}

export function buildProductPayload(overrides: Partial<ProductPayload> = {}): ProductPayload {
  return {
    name: 'Cadeira Estofada',
    description: 'Cadeira com assento estofado',
    price: 45_990,
    category: 'Cadeiras',
    imageUrl: 'https://images.example.com/cadeira.jpg',
    sku: 'CAD-001',
    stock: 10,
    ...overrides,
  };
}

/** Creates a product through the API and returns its id. */
export async function createProduct(
  app: Express,
  token: string,
  overrides: Partial<ProductPayload> = {},
): Promise<string> {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send(buildProductPayload(overrides));

  if (res.status !== 201) {
    throw new Error(`Product creation failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.id;
}

/** Admin adds a `user`-role member to their company and logs in as that member. */
export async function createMemberAndLogin(app: Express, adminToken: string, email: string): Promise<string> {
  const created = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Membro', email, password: DEFAULT_PASSWORD });

  if (created.status !== 201) {
    throw new Error(`Member creation failed with ${created.status}: ${JSON.stringify(created.body)}`);
  }

  const login = await request(app).post('/api/auth/login').send({ email, password: DEFAULT_PASSWORD });
  return login.body.token;
}
