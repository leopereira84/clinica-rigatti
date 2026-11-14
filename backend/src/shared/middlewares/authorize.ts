import type { RequestHandler } from 'express';
import { getAuth } from '../auth/authContext.js';
import { hasPermission, type Permission } from '../auth/permissions.js';
import { AppError } from '../errors/AppError.js';

/** Must run after `authenticate`. Responds 403 when the role lacks the permission. */
export function authorize(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    const { role } = getAuth(req);

    if (!hasPermission(role, permission)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
    }

    next();
  };
}
