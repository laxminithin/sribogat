import { Router } from 'express';
import { login, me, refreshToken, register } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', requireAuth, refreshToken);
router.get('/me', requireAuth, me);

export default router;
