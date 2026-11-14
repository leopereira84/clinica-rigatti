import type { Express } from 'express';
import request from 'supertest';

export const DEFAULT_PASSWORD = 'correct-horse-battery';

export interface RegisterPayload {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

export interface RegisteredCompany {
  payload: RegisterPayload;
  token: string;
  userId: string;
  companyId: string;
}

let sequence = 0;

export function buildRegisterPayload(overrides: Partial<RegisterPayload> = {}): RegisterPayload {
  sequence += 1;
  return {
    companyName: `Company ${sequence}`,
    name: `Admin ${sequence}`,
    email: `admin${sequence}@example.com`,
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
}

/** Registers a new company with its admin through the public API. */
export async function registerCompany(
  app: Express,
  overrides: Partial<RegisterPayload> = {},
): Promise<RegisteredCompany> {
  const payload = buildRegisterPayload(overrides);
  const res = await request(app).post('/api/auth/register').send(payload);

  if (res.status !== 201) {
    throw new Error(`Registration failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }

  return {
    payload,
    token: res.body.token,
    userId: res.body.user.id,
    companyId: res.body.company.id,
  };
}
