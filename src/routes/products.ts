import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin';
import { requirePermission } from '../middleware/requirePermission';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { idParamSchema } from '../schemas/common';
import { productQuerySchema, productSchema, quantitySchema } from '../schemas/productSchemas';
import * as productService from '../services/productService';

// All routes here are mounted behind the auth middleware.
const router = Router();

router.get('/', validateQuery(productQuerySchema), async (req, res) => {
  res.json(await productService.list(req.user!.familyId, res.locals.query));
});

router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  res.json(await productService.getById(req.user!.familyId, res.locals.params.id));
});

router.post('/', requireAdmin, validateBody(productSchema), async (req, res) => {
  res.status(201).json(await productService.create(req.user!.familyId, req.body));
});

router.put('/:id', requireAdmin, validateParams(idParamSchema), validateBody(productSchema), async (req, res) => {
  res.json(await productService.update(req.user!.familyId, res.locals.params.id, req.body));
});

router.patch(
  '/:id/quantity',
  requirePermission('canUpdateQuantity'),
  validateParams(idParamSchema),
  validateBody(quantitySchema),
  async (req, res) => {
    res.json(await productService.updateQuantity(req.user!, res.locals.params.id, req.body.quantity));
  },
);

router.delete('/:id', requireAdmin, validateParams(idParamSchema), async (req, res) => {
  await productService.remove(req.user!.familyId, res.locals.params.id);
  res.status(204).end();
});

export default router;
