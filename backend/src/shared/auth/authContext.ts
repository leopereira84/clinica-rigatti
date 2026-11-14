import type { Request } from 'express';
import { AppError } from '../errors/AppError.js';
import type { Role } from './roles.js';

/**
 * Identity of the authenticated user, built by the `authenticate` middleware
 * from the database (not from client input). `companyId` is the tenant boundary
 * for every data access.
 */
export interface AuthContext {
  userId: string;
  companyId: string;
  role: Role;
}

/** Returns the auth context or fails with 401 if the route forgot `authenticate`. */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  return req.auth;
}
