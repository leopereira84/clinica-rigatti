import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { createAuthRateLimiter } from '../../shared/middlewares/rateLimit.js';
import { authController } from './auth.controller.js';

/** Factory so each app instance (and each test) gets its own rate-limit counters. */
export function createAuthRouter(): Router {
  const router = Router();

  router.post('/register', createAuthRateLimiter(), authController.register);
  router.post('/login', createAuthRateLimiter(), authController.login);
  router.get('/me', authenticate, authController.me);

  return router;
}
