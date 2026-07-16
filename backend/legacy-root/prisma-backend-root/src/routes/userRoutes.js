const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, admin, validateBody } = require('../middleware/auth');
const { registerSchema, loginSchema, passwordResetSchema,forgotPasswordSchema } = require('../validations/userValidation');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 100, // 5 attempts in production, 100 in development
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Public routes
router.post('/register', validateBody(registerSchema), userController.register);
router.post('/login', authLimiter, validateBody(loginSchema), userController.login);
router.post('/admin/login', authLimiter, validateBody(loginSchema), userController.adminLogin);
router.get('/verify-email/:token', userController.verifyEmail);
router.post('/forgot-password', 
  authLimiter, // For security
  validateBody(forgotPasswordSchema), // Use Joi validation
  userController.forgotPassword
);
router.post('/reset-password/:token', validateBody(passwordResetSchema), userController.resetPassword);

// Protected routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.put('/password', auth, validateBody(passwordResetSchema), userController.changePassword);
router.post('/refresh-token', auth, userController.refreshToken);
router.get('/check-session', auth, userController.checkSession);

// Wishlist routes
router.get('/wishlist', auth, userController.getWishlist);
router.post('/wishlist/:productId', auth, userController.addToWishlist);
router.delete('/wishlist/:productId', auth, userController.removeFromWishlist);

// Admin routes
router.get('/', [auth, admin], userController.getAllUsers);
router.get('/:userId/orders', [auth, admin], userController.getCustomerOrders);
router.get('/:userId/analytics', [auth, admin], userController.getCustomerAnalytics);
router.put('/:userId/role', [auth, admin], userController.updateUserRole);

// Get customer by ID
router.get('/:userId', auth, userController.getCustomerById);

// Update customer profile
router.put('/:userId/profile', auth, userController.updateCustomerProfile);

// Admin creation routes
router.get('/check-first-admin', userController.checkFirstAdmin);
router.post('/create-first-admin', (req, res, next) => {
  // Check secret key for first admin creation
  const secretKey = req.headers['x-admin-secret'];
  console.log('Received admin secret:', secretKey);
  console.log('Expected admin secret:', process.env.ADMIN_SECRET_KEY);
  
  if (secretKey !== process.env.ADMIN_SECRET_KEY) {
    console.log('Admin secret key mismatch');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  console.log('Admin secret key verified');
  next();
}, userController.createAdmin);

router.post('/create-admin', [auth, admin], userController.createAdmin);

module.exports = router; 