import type { RequestHandler } from 'express';
import { userRepository } from '../../modules/users/user.repository.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { AppError } from '../errors/AppError.js';

const BEARER_PATTERN = /^Bearer ([^\s]+)$/i;

function extractBearerToken(header: string | undefined): string {
  if (!header) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  const token = BEARER_PATTERN.exec(header)?.[1];
  if (!token) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
  }

  return token;
}

/**
 * Validates the access token and builds `req.auth` from the database:
 * the role is always the current one, and a deleted user loses access
 * immediately, even with a token that has not expired yet.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const claims = verifyAccessToken(extractBearerToken(req.headers.authorization));

  const user = await userRepository.findByIdForAuthentication(claims.userId);
  if (!user || user.companyId.toString() !== claims.companyId) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
  }

  req.auth = {
    userId: user._id.toString(),
    companyId: user.companyId.toString(),
    role: user.role,
  };

  next();
};
