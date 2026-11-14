import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { CompanyModel } from '../src/modules/companies/company.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { userRepository } from '../src/modules/users/user.repository.js';
import { buildRegisterPayload, DEFAULT_PASSWORD, registerCompany } from './helpers/auth.js';
import { clearDatabase, connectTestDatabase, disconnectTestDatabase } from './setup/database.js';

let app: Express;

beforeAll(connectTestDatabase);
afterAll(disconnectTestDatabase);
// A fresh app per test also resets the rate-limit counters.
beforeEach(() => {
  app = createApp();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await clearDatabase();
});

function bearer(token: string): string {
  return `Bearer ${token}`;
}

describe('POST /api/auth/register', () => {
  it('creates a company with its admin and returns an access token', async () => {
    const payload = buildRegisterPayload({ email: '  Owner@Example.COM ' });

    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.company).toEqual({ id: expect.any(String), name: payload.companyName });
    expect(res.body.user).toMatchObject({
      name: payload.name,
      email: 'owner@example.com',
      role: 'admin',
      companyId: res.body.company.id,
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('stores only a bcrypt hash of the password', async () => {
    const { userId } = await registerCompany(app);

    const stored = await UserModel.findById(userId).select('+passwordHash').orFail();

    expect(stored.passwordHash).not.toBe(DEFAULT_PASSWORD);
    expect(await bcrypt.compare(DEFAULT_PASSWORD, stored.passwordHash)).toBe(true);
  });

  it.each([
    ['role', { role: 'admin' }],
    ['companyId', { companyId: '507f1f77bcf86cd799439011' }],
  ])('rejects a client-provided %s and creates nothing', async (_field, extra) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...buildRegisterPayload(), ...extra });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await CompanyModel.countDocuments()).toBe(0);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('reports invalid fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ companyName: 'A', name: 'Ana', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    const paths = (res.body.error.details as { path: string }[]).map((issue) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(['body.companyName', 'body.email', 'body.password']));
  });

  it('rejects passwords longer than 72 bytes (bcrypt limit)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(buildRegisterPayload({ password: 'á'.repeat(37) })); // 74 bytes in UTF-8

    expect(res.status).toBe(400);
  });

  it('rejects an email already in use, regardless of case', async () => {
    await registerCompany(app, { email: 'taken@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send(buildRegisterPayload({ email: 'TAKEN@example.com' }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_IN_USE');
    expect(await CompanyModel.countDocuments()).toBe(1);
  });

  it('rolls back the company when the admin cannot be created (transaction)', async () => {
    vi.spyOn(userRepository, 'create').mockRejectedValueOnce(new Error('simulated failure'));

    const res = await request(app).post('/api/auth/register').send(buildRegisterPayload());

    expect(res.status).toBe(500);
    expect(await CompanyModel.countDocuments()).toBe(0);
    expect(await UserModel.countDocuments()).toBe(0);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials, ignoring email case', async () => {
    const { payload, userId, companyId } = await registerCompany(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email.toUpperCase(), password: payload.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ id: userId, role: 'admin', companyId });
    expect(res.body.company.id).toBe(companyId);
  });

  it('returns the same generic error for a wrong password and an unknown email', async () => {
    const { payload } = await registerCompany(app);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('rejects unexpected fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'x', companyId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(400);
  });

  it('rate limits repeated attempts from the same IP', async () => {
    const attempt = () =>
      request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });

    for (let i = 0; i < 20; i += 1) {
      expect((await attempt()).status).toBe(401);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user and company', async () => {
    const { token, userId, companyId, payload } = await registerCompany(app);

    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: {
        id: userId,
        name: payload.name,
        email: payload.email,
        role: 'admin',
        companyId,
        createdAt: expect.any(String),
      },
      company: { id: companyId, name: payload.companyName },
    });
  });

  it('requires a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each(['Token abc', 'Bearer', 'Bearer not-a-jwt'])('rejects a malformed header: %s', async (header) => {
    const res = await request(app).get('/api/auth/me').set('Authorization', header);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token signed with another secret', async () => {
    const { userId, companyId } = await registerCompany(app);
    const forged = jwt.sign({ companyId }, 'another-secret-with-at-least-32-characters', {
      subject: userId,
      algorithm: 'HS256',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(forged));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects unsigned tokens (alg: none) and other algorithms', async () => {
    const { userId, companyId } = await registerCompany(app);
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: userId, companyId })}.`;
    const hs512 = jwt.sign({ companyId }, env.JWT_SECRET, { subject: userId, algorithm: 'HS512' });

    for (const token of [unsigned, hs512]) {
      const res = await request(app).get('/api/auth/me').set('Authorization', bearer(token));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    }
  });

  it('rejects an expired token', async () => {
    const { userId, companyId } = await registerCompany(app);
    const expired = jwt.sign({ companyId, exp: Math.floor(Date.now() / 1000) - 60 }, env.JWT_SECRET, {
      subject: userId,
      algorithm: 'HS256',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(expired));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it("rejects a validly signed token whose companyId is not the user's company", async () => {
    const companyA = await registerCompany(app);
    const companyB = await registerCompany(app);
    const crossTenant = jwt.sign({ companyId: companyB.companyId }, env.JWT_SECRET, {
      subject: companyA.userId,
      algorithm: 'HS256',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(crossTenant));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects the token of a user that no longer exists', async () => {
    const { token, userId } = await registerCompany(app);
    await UserModel.deleteOne({ _id: userId });

    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(token));

    expect(res.status).toBe(401);
  });

  it('uses the current role from the database, not from the token', async () => {
    const { token, userId } = await registerCompany(app);
    await UserModel.updateOne({ _id: userId }, { role: 'user' });

    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('user');
  });
});
