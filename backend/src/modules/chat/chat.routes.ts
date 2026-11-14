import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { createChatRateLimiter } from '../../shared/middlewares/rateLimit.js';
import { createChatController } from './chat.controller.js';
import type { ChatService } from './chat.service.js';

export function createChatRouter(chatService: ChatService): Router {
  const router = Router();
  const controller = createChatController(chatService);

  router.use(authenticate);
  router.post('/', authorize('chat:use'), createChatRateLimiter(), controller.send);

  return router;
}
