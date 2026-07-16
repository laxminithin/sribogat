import { Router } from 'express';
import { exportAnalyticsData, getDashboardStats } from '../controllers/analyticsController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', requireAuth, requireAdmin, getDashboardStats);
router.get('/export', requireAuth, requireAdmin, exportAnalyticsData);

export default router;
