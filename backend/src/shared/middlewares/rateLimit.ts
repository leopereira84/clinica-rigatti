import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Per-user limiter for the AI chat, which has a real cost per request. Must
 * be placed after `authenticate`: the key is the authenticated user id.
 */
export function createChatRateLimiter(limit = 20): RateLimitRequestHandler {
  return rateLimit({
    windowMs: FIVE_MINUTES,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (!req.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      return `user:${req.auth.userId}`;
    },
    handler: (_req, _res, next) => {
      next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many messages, please wait a moment'));
    },
  });
}

/**
 * Per-IP limiter for credential endpoints (login, signup). Each call returns a
 * new limiter with its own counters. Behind a reverse proxy, `trust proxy`
 * must be configured so the real client IP is used.
 */
export function createAuthRateLimiter(limit = 20): RateLimitRequestHandler {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many attempts, please try again later'));
    },
  });
}
