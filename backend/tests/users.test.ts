import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { DEFAULT_PASSWORD, type RegisteredCompany, registerCompany } from './helpers/auth.js';
import { createMemberAndLogin } from './helpers/products.js';
import { clearDatabase, connectTestDatabase, disconnectTestDatabase } from './setup/database.js';

let app: Express;
let companyA: RegisteredCompany;
let companyB: RegisteredCompany;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const newMember = (email: string) => ({ name: 'Bruno', email, password: DEFAULT_PASSWORD });

beforeAll(connectTestDatabase);
afterAll(disconnectTestDatabase);

beforeEach(async () => {
  await clearDatabase();
  app = createApp();
  companyA = await registerCompany(app);
  companyB = await registerCompany(app);
});

describe('POST /api/users', () => {
  it("adds a member with the 'user' role to the admin's own company", async () => {
    const res = await request(app).post('/api/users').set(auth(companyA.token)).send(newMember('Bruno@Aurora.example'));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'bruno@aurora.example', role: 'user', companyId: companyA.companyId });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('lets the new member log in', async () => {
    await request(app).post('/api/users').set(auth(companyA.token)).send(newMember('bruno@aurora.example'));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bruno@aurora.example', password: DEFAULT_PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ role: 'user', companyId: companyA.companyId });
  });

  it.each([
    ['role', { role: 'admin' }],
    ['companyId', () => ({ companyId: companyB.companyId })],
  ])('rejects a client-provided %s', async (_field, extra) => {
    const extraFields = typeof extra === 'function' ? extra() : extra;
    const res = await request(app)
      .post('/api/users')
      .set(auth(companyA.token))
      .send({ ...newMember('eve@aurora.example'), ...extraFields });

    expect(res.status).toBe(400);
    expect(await UserModel.exists({ email: 'eve@aurora.example' })).toBeNull();
  });

  it('rejects an email already in use, even in another company', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(auth(companyA.token))
      .send(newMember(companyB.payload.email));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_IN_USE');
  });
});

describe('GET /api/users', () => {
  it('lists only users of the own company', async () => {
    await request(app).post('/api/users').set(auth(companyA.token)).send(newMember('bruno@aurora.example'));

    const res = await request(app).get('/api/users').set(auth(companyA.token));

    expect(res.status).toBe(200);
    const emails = res.body.items.map((u: { email: string }) => u.email);
    expect(emails).toEqual([companyA.payload.email, 'bruno@aurora.example']);
    expect(emails).not.toContain(companyB.payload.email);
  });
});

describe('User management permissions', () => {
  it("forbids the 'user' role from listing or creating users", async () => {
    const memberToken = await createMemberAndLogin(app, companyA.token, 'bruno@aurora.example');

    const list = await request(app).get('/api/users').set(auth(memberToken));
    const create = await request(app).post('/api/users').set(auth(memberToken)).send(newMember('x@aurora.example'));

    expect(list.status).toBe(403);
    expect(create.status).toBe(403);
    expect(await UserModel.exists({ email: 'x@aurora.example' })).toBeNull();
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});
