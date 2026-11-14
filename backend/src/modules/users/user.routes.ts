import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { userController } from './user.controller.js';

export function createUserRouter(): Router {
  const router = Router();

  router.use(authenticate, authorize('users:manage'));

  router.get('/', userController.list);
  router.post('/', userController.create);

  return router;
}
