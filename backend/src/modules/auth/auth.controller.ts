import type { Request, Response } from 'express';
import { getAuth } from '../../shared/auth/authContext.js';
import { validateRequest } from '../../shared/validation/validateRequest.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { authService } from './auth.service.js';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { body } = validateRequest(req, { body: registerSchema });
    res.status(201).json(await authService.register(body));
  },

  async login(req: Request, res: Response): Promise<void> {
    const { body } = validateRequest(req, { body: loginSchema });
    res.json(await authService.login(body));
  },

  async me(req: Request, res: Response): Promise<void> {
    res.json(await authService.getProfile(getAuth(req)));
  },
};
