import type { Request, Response } from 'express';
import { getAuth } from '../../shared/auth/authContext.js';
import { validateRequest } from '../../shared/validation/validateRequest.js';
import { listProductsQuerySchema, productIdParamsSchema, productInputSchema } from './product.schemas.js';
import { productService } from './product.service.js';

export const productController = {
  async list(req: Request, res: Response): Promise<void> {
    const { query } = validateRequest(req, { query: listProductsQuerySchema });
    res.json(await productService.list(getAuth(req), query));
  },

  async listCategories(req: Request, res: Response): Promise<void> {
    res.json({ items: await productService.listCategories(getAuth(req)) });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { params } = validateRequest(req, { params: productIdParamsSchema });
    res.json(await productService.getById(getAuth(req), params.id));
  },

  async create(req: Request, res: Response): Promise<void> {
    const { body } = validateRequest(req, { body: productInputSchema });
    res.status(201).json(await productService.create(getAuth(req), body));
  },

  async update(req: Request, res: Response): Promise<void> {
    const { params, body } = validateRequest(req, { params: productIdParamsSchema, body: productInputSchema });
    res.json(await productService.update(getAuth(req), params.id, body));
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { params } = validateRequest(req, { params: productIdParamsSchema });
    await productService.remove(getAuth(req), params.id);
    res.status(204).end();
  },
};
