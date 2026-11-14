import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../src/shared/errors/AppError.js';
import { errorHandler } from '../src/shared/middlewares/errorHandler.js';
import { validateRequest } from '../src/shared/validation/validateRequest.js';

/** Small app whose routes throw specific errors, to exercise the error handler in isolation. */
function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/app-error', () => {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  });

  app.get('/async-error', async () => {
    await Promise.resolve();
    throw new AppError(409, 'ASYNC_CONFLICT', 'Thrown from an async handler');
  });

  app.get('/zod-error', () => {
    z.object({ name: z.string() }).parse({ name: 42 });
  });

  app.get('/cast-error', () => {
    throw new mongoose.Error.CastError('ObjectId', 'not-an-id', 'productId');
  });

  app.get('/duplicate-key', () => {
    throw new mongoose.mongo.MongoServerError({
      code: 11000,
      errmsg: 'E11000 duplicate key error',
      keyPattern: { email: 1 },
      keyValue: { email: 'secret@example.com' },
    });
  });

  app.get('/unexpected', () => {
    throw new Error('database password is hunter2');
  });

  const schemas = {
    params: z.object({ id: z.string().length(4) }),
    query: z.object({ page: z.coerce.number().int().min(1) }),
    body: z.strictObject({ name: z.string().min(1) }),
  };

  app.post('/validated/:id', (req, res) => {
    const { params, query, body } = validateRequest(req, schemas);
    res.json({ id: params.id, page: query.page, name: body.name });
  });

  app.use(errorHandler);
  return app;
}

const app = buildTestApp();

describe('errorHandler', () => {
  it('maps AppError to its status and code', async () => {
    const res = await request(app).get('/app-error');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
  });

  it('catches errors thrown by async handlers (Express 5)', async () => {
    const res = await request(app).get('/async-error');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ASYNC_CONFLICT');
  });

  it('maps ZodError to 400 with field details', async () => {
    const res = await request(app).get('/zod-error');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ path: 'name', message: expect.any(String) }]);
  });

  it('maps Mongoose CastError to 400', async () => {
    const res = await request(app).get('/cast-error');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_VALUE');
  });

  it('maps duplicate key errors to 409 without leaking stored values', async () => {
    const res = await request(app).get('/duplicate-key');

    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'CONFLICT',
      message: 'Resource already exists',
      details: { fields: ['email'] },
    });
    expect(JSON.stringify(res.body)).not.toContain('secret@example.com');
  });

  it('hides internal details of unexpected errors', async () => {
    const res = await request(app).get('/unexpected');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });
});

describe('validateRequest', () => {
  it('returns parsed and coerced data when the request is valid', async () => {
    const res = await request(app).post('/validated/abcd?page=2').send({ name: 'Chair' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'abcd', page: 2, name: 'Chair' });
  });

  it('reports issues from params, query and body together', async () => {
    const res = await request(app).post('/validated/abc?page=0').send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = (res.body.error.details as { path: string }[]).map((issue) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(['params.id', 'query.page', 'body.name']));
  });

  it('rejects unknown fields in strict schemas (mass assignment)', async () => {
    const res = await request(app)
      .post('/validated/abcd?page=1')
      .send({ name: 'Chair', companyId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('body');
  });
});
