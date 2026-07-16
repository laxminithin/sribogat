import { Router } from 'express';
import {
  canReviewProduct,
  createReview,
  getAvailableCoupons,
  getBlogById,
  getCouponSuggestions,
  listBlogs,
  listReviewsForProduct,
  updateCouponUsage,
  validateCoupon,
} from '../controllers/contentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/blogs', listBlogs);
router.get('/blogs/:id', getBlogById);

router.get('/reviews/verified/product/:id', listReviewsForProduct);
router.get('/reviews/can-review/:id', requireAuth, canReviewProduct);
router.post('/reviews', requireAuth, createReview);

router.get('/coupons/available', requireAuth, getAvailableCoupons);
router.post('/coupons/suggestions', requireAuth, getCouponSuggestions);
router.post('/coupons/validate', requireAuth, validateCoupon);
router.post('/coupons/:couponId/usage', requireAuth, updateCouponUsage);

export default router;
