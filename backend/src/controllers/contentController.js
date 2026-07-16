import { asyncHandler } from '../utils/asyncHandler.js';

export const listBlogs = asyncHandler(async (req, res) => {
  res.json([]);
});

export const getBlogById = asyncHandler(async (req, res) => {
  res.status(404).json({ error: 'Blog not found' });
});

export const listReviewsForProduct = asyncHandler(async (req, res) => {
  res.json([]);
});

export const canReviewProduct = asyncHandler(async (req, res) => {
  res.json({ canReview: false });
});

export const createReview = asyncHandler(async (req, res) => {
  res.status(501).json({ error: 'Reviews are not enabled yet on the SQL backend' });
});

export const getAvailableCoupons = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

export const getCouponSuggestions = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { suggestions: [] } });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  res.status(400).json({ success: false, message: 'Coupon support is not enabled yet' });
});

export const updateCouponUsage = asyncHandler(async (req, res) => {
  res.json({ success: true });
});
