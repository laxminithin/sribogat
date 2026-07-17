import { Router } from 'express';
import {
  canReviewProduct,
  createReview,
  getBlogById,
  listBlogs,
  listReviewsForProduct,
} from '../controllers/contentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/blogs', listBlogs);
router.get('/blogs/:id', getBlogById);

router.get('/reviews/verified/product/:id', listReviewsForProduct);
router.get('/reviews/can-review/:id', requireAuth, canReviewProduct);
router.post('/reviews', requireAuth, createReview);

export default router;
