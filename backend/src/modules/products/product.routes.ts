import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { productController } from './product.controller.js';

export function createProductRouter(): Router {
  const router = Router();

  router.use(authenticate);

  router.get('/', authorize('products:read'), productController.list);
  // Declared before "/:id" so "categories" is not treated as an id.
  router.get('/categories', authorize('products:read'), productController.listCategories);
  router.get('/:id', authorize('products:read'), productController.getById);
  router.post('/', authorize('products:write'), productController.create);
  router.put('/:id', authorize('products:write'), productController.update);
  router.delete('/:id', authorize('products:write'), productController.remove);

  return router;
}
