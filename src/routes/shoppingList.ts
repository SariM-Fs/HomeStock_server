import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin';
import { requirePermission } from '../middleware/requirePermission';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { idParamSchema } from '../schemas/common';
import { addItemSchema, shoppingQuerySchema, updateItemSchema } from '../schemas/shoppingSchemas';
import * as shoppingService from '../services/shoppingService';

// All routes here are mounted behind the auth middleware.
const router = Router();

router.get('/', validateQuery(shoppingQuerySchema), async (req, res) => {
  res.json(await shoppingService.list(req.user!.familyId, res.locals.query.purchased));
});

router.post('/', requirePermission('canAddToShoppingList'), validateBody(addItemSchema), async (req, res) => {
  res.status(201).json(await shoppingService.add(req.user!.familyId, req.body.productId, req.body.quantity));
});

router.put(
  '/:id',
  requirePermission('canMarkPurchased'),
  validateParams(idParamSchema),
  validateBody(updateItemSchema),
  async (req, res) => {
    res.json(await shoppingService.update(req.user!.familyId, res.locals.params.id, req.body));
  },
);

router.delete('/:id', requireAdmin, validateParams(idParamSchema), async (req, res) => {
  await shoppingService.remove(req.user!.familyId, res.locals.params.id);
  res.status(204).end();
});

export default router;
