import type { Request } from 'express';
import type { z } from 'zod';
import { AppError } from '../errors/AppError.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

interface RequestSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

type ValidatedRequest<S extends RequestSchemas> = {
  [K in keyof S]: S[K] extends z.ZodType ? z.output<S[K]> : never;
};

const REQUEST_PARTS = ['body', 'params', 'query'] as const;

export function formatZodIssues(issues: readonly z.core.$ZodIssue[], prefix?: string): ValidationIssue[] {
  return issues.map((issue) => ({
    path: [...(prefix ? [prefix] : []), ...issue.path.map(String)].join('.'),
    message: issue.message,
  }));
}

/**
 * Validates the selected parts of a request and returns the parsed, typed data.
 *
 * Called from controllers instead of a mutating middleware: in Express 5
 * `req.query` is read-only, and returning the parsed data keeps types flowing
 * into the controller without casts. Issues from all parts are reported at once.
 */
export function validateRequest<S extends RequestSchemas>(req: Request, schemas: S): ValidatedRequest<S> {
  const output: Record<string, unknown> = {};
  const issues: ValidationIssue[] = [];

  for (const part of REQUEST_PARTS) {
    const schema = schemas[part];
    if (!schema) continue;

    const result = schema.safeParse(req[part]);
    if (result.success) {
      output[part] = result.data;
    } else {
      issues.push(...formatZodIssues(result.error.issues, part));
    }
  }

  if (issues.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', issues);
  }

  return output as ValidatedRequest<S>;
}
