import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createChatRouter } from './modules/chat/chat.routes.js';
import { type ChatLimits, createChatService } from './modules/chat/chat.service.js';
import type { LlmProvider } from './modules/chat/llm/llm.types.js';
import { healthRouter } from './modules/health/health.routes.js';
import { createProductRouter } from './modules/products/product.routes.js';
import { createUserRouter } from './modules/users/user.routes.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/errorHandler.js';

export interface AppDependencies {
  /** LLM used by the chat. `null` (the default) disables it with a 503. */
  llmProvider?: LlmProvider | null;
  chatLimits?: ChatLimits;
}

/**
 * Builds the Express application without starting the HTTP server or
 * connecting to the database, so tests can exercise it with Supertest.
 * External services are injected, so tests never reach the real LLM.
 */
export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const chatService = createChatService(dependencies.llmProvider ?? null, { limits: dependencies.chatLimits });

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter());
  app.use('/api/products', createProductRouter());
  app.use('/api/users', createUserRouter());
  app.use('/api/chat', createChatRouter(chatService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
