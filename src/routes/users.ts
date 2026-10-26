import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody, validateParams } from '../middleware/validate';
import { idParamSchema } from '../schemas/common';
import { permissionsSchema } from '../schemas/userSchemas';
import * as userService from '../services/userService';

// All routes here are mounted behind the auth middleware and are admin-only.
// An admin manages only the members of their own family.
const router = Router();

router.use(requireAdmin);

router.get('/', async (req, res) => {
  res.json(await userService.list(req.user!.familyId));
});

router.put('/:id/permissions', validateParams(idParamSchema), validateBody(permissionsSchema), async (req, res) => {
  res.json(await userService.updatePermissions(req.user!, res.locals.params.id, req.body));
});

export default router;
