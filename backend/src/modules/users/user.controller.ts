import type { Request, Response } from 'express';
import { getAuth } from '../../shared/auth/authContext.js';
import { validateRequest } from '../../shared/validation/validateRequest.js';
import { createUserSchema } from './user.schemas.js';
import { userService } from './user.service.js';

export const userController = {
  async list(req: Request, res: Response): Promise<void> {
    res.json({ items: await userService.list(getAuth(req)) });
  },

  async create(req: Request, res: Response): Promise<void> {
    const { body } = validateRequest(req, { body: createUserSchema });
    res.status(201).json(await userService.create(getAuth(req), body));
  },
};
