import type { Request, Response } from 'express';
import { getAuth } from '../../shared/auth/authContext.js';
import { validateRequest } from '../../shared/validation/validateRequest.js';
import { chatRequestSchema } from './chat.schemas.js';
import type { ChatService } from './chat.service.js';

export function createChatController(chatService: ChatService) {
  return {
    async send(req: Request, res: Response): Promise<void> {
      const { body } = validateRequest(req, { body: chatRequestSchema });

      // Stops calling the provider (and spending tokens) if the client goes away.
      const abort = new AbortController();
      res.on('close', () => {
        if (!res.writableFinished) abort.abort();
      });

      res.json(await chatService.reply(getAuth(req), body.messages, abort.signal));
    },
  };
}
