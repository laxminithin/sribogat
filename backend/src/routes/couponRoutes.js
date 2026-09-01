import { Router } from 'express';
import {
  createCoupon,
  deleteCoupon,
  getAvailableCoupons,
  getCouponAnalytics,
  getCouponById,
  getCouponSuggestions,
  listCoupons,
  toggleCouponStatus,
  updateCoupon,
  updateCouponUsage,
  validateCoupon,
} from '../controllers/couponController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Customer endpoints (static paths before '/:id')
router.get('/available', getAvailableCoupons);
router.post('/suggestions', getCouponSuggestions);
router.post('/validate', validateCoupon);
router.post('/:couponId/usage', updateCouponUsage);

// Admin endpoints
router.get('/', requireAdmin, listCoupons);
router.post('/', requireAdmin, createCoupon);
router.get('/:id/analytics', requireAdmin, getCouponAnalytics);
router.get('/:id', requireAdmin, getCouponById);
router.put('/:id', requireAdmin, updateCoupon);
router.patch('/:id/toggle', requireAdmin, toggleCouponStatus);
router.delete('/:id', requireAdmin, deleteCoupon);

export default router;
