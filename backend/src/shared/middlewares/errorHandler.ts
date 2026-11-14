import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isDuplicateKeyError } from '../database/errors.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';
import { formatZodIssues } from '../validation/validateRequest.js';

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface ErrorResponse {
  status: number;
  body: ErrorResponseBody;
}

function errorResponse(status: number, code: string, message: string, details?: unknown): ErrorResponse {
  const body: ErrorResponseBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return { status, body };
}

/** Errors raised by express.json() (body-parser) carry a `type` and an HTTP `status`. */
function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof err.type === 'string' &&
    'status' in err &&
    typeof err.status === 'number'
  );
}

function toErrorResponse(err: unknown): ErrorResponse {
  if (err instanceof AppError) {
    return errorResponse(err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid request data', formatZodIssues(err.issues));
  }

  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') return errorResponse(400, 'INVALID_JSON', 'Malformed JSON body');
    if (err.type === 'entity.too.large') return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    if (err.status >= 400 && err.status < 500) return errorResponse(err.status, 'BAD_REQUEST', 'Invalid request body');
  }

  if (err instanceof mongoose.Error.CastError) {
    return errorResponse(400, 'INVALID_VALUE', `Invalid value for field "${err.path}"`);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid data', details);
  }

  if (isDuplicateKeyError(err)) {
    // Expose only the conflicting field names, never the stored values.
    const fields = Object.keys((err.keyPattern ?? {}) as Record<string, unknown>);
    return errorResponse(409, 'CONFLICT', 'Resource already exists', { fields });
  }

  return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const { status, body } = toErrorResponse(err);

  if (status >= 500) {
    // Expected failures (e.g. AI provider unavailable) were already logged
    // with context where they happened; only unexpected errors get a stack.
    if (err instanceof AppError) {
      logger.error(`${req.method} ${req.path} -> ${status} ${err.code}`);
    } else {
      logger.error(`Unhandled error on ${req.method} ${req.path}`, err);
    }
  }

  res.status(status).json(body);
};
