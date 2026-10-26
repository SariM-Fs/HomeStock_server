import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas/authSchemas';
import * as authService from '../services/authService';
import * as familyService from '../services/familyService';

const router = Router();

router.post('/login', validateBody(loginSchema), async (req, res) => {
  res.json(await authService.login(req.body));
});

router.post('/register', validateBody(registerSchema), async (req, res) => {
  res.status(201).json(await authService.register(req.body));
});

// The current user plus their family (including the invite code to share).
router.get('/me', auth, async (req, res) => {
  res.json({ ...req.user, family: await familyService.getById(req.user!.familyId) });
});

export default router;
