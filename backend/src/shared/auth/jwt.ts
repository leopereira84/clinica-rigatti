import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';
import { objectIdSchema } from '../validation/objectId.js';

// Pinned on both sign and verify, so tokens with `alg: none` or another
// algorithm are rejected.
const ALGORITHM = 'HS256';

const accessTokenPayloadSchema = z.object({
  sub: objectIdSchema,
  companyId: objectIdSchema,
});

export interface AccessTokenClaims {
  userId: string;
  companyId: string;
}

function invalidToken(): AppError {
  return new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
}

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign({ companyId: claims.companyId }, env.JWT_SECRET, {
    subject: claims.userId,
    algorithm: ALGORITHM,
    // Format validated in env.ts ("15m", "2h", ...), which jsonwebtoken accepts.
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  let decoded: unknown;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token expired');
    }
    throw invalidToken();
  }

  const payload = accessTokenPayloadSchema.safeParse(decoded);
  if (!payload.success) {
    throw invalidToken();
  }

  return { userId: payload.data.sub, companyId: payload.data.companyId };
}
