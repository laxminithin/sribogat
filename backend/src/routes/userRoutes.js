import { Router } from 'express';
import {
  addToWishlist,
  adminLogin,
  getUserAnalytics,
  getUserById,
  getUserOrders,
  getWishlist,
  listUsers,
  login,
  me,
  register,
  removeFromWishlist,
  updateCustomerByAdmin,
  updateProfile,
} from '../controllers/userController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.get('/profile', requireAuth, me);
router.put('/profile', requireAuth, updateProfile);
router.put('/:userId/profile', requireAuth, requireAdmin, updateCustomerByAdmin);
router.get('/wishlist', requireAuth, getWishlist);
router.post('/wishlist/:productId', requireAuth, addToWishlist);
router.delete('/wishlist/:productId', requireAuth, removeFromWishlist);
router.get('/check-session', requireAuth, (req, res) => {
  res.json({ valid: true });
});
router.get('/', requireAuth, requireAdmin, listUsers);
router.get('/:id/orders', requireAuth, requireAdmin, getUserOrders);
router.get('/:id/analytics', requireAuth, requireAdmin, getUserAnalytics);
router.get('/:id', requireAuth, requireAdmin, getUserById);

export default router;
