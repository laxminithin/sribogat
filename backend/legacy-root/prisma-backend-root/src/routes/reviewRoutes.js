const express = require('express');
const router = express.Router();

console.log('🚀 Loading review routes...');

// Import middlewares
const { auth, admin } = require('../middleware/auth');
const { uploadReviewImages, handleUploadError } = require('../middleware/upload');

// Import controller
const reviewController = require('../controllers/reviewController');

// 🔓 PUBLIC ROUTES (No Auth)
router.get('/product/:productId/public', reviewController.getPublicProductReviews);
router.get('/verified', reviewController.getVerifiedReviews);
router.get('/verified/product/:productId', reviewController.getVerifiedProductReviews);
router.get('/verified/count', reviewController.getVerifiedReviewsCount);
router.get('/can-review/:productId', auth, reviewController.canReviewProduct);

//replies from admin
router.get('/product/:productId/replies', reviewController.getProductReviewReplies);


// 🔐 AUTHENTICATED USER ROUTES
router.use(auth); // all routes below this line require authentication

router.post('/', uploadReviewImages, handleUploadError, reviewController.createReview);
router.get('/user', reviewController.getUserReviews);
router.get('/can-review/:productId', reviewController.canReviewProduct);
router.get('/product/:productId', reviewController.getProductReviews);
router.post('/:reviewId/helpful', reviewController.markHelpful);

// 🔐👑 ADMIN ROUTES
router.use(admin); // all routes below this line require admin privileges

router.get('/', reviewController.getAllReviews);
router.patch('/:reviewId/approve', reviewController.approveReview);
router.patch('/:reviewId/reject', reviewController.rejectReview);
router.post('/:reviewId/reply', reviewController.addReply);
router.delete('/:reviewId', reviewController.deleteReview);

console.log('✅ All review routes loaded successfully');

module.exports = router;
