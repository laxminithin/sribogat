// middleware/couponMiddleware.js - Simplified version that works with your current setup
const Coupon = require('../models/Coupon');
const User = require('../models/User');

/**
 * Middleware to validate coupon in order creation
 * Use this in order creation to validate applied coupon
 */
const validateOrderCoupon = async (req, res, next) => {
  try {
    const { couponCode, cartTotal, cartItems = [] } = req.body;
    
    if (!couponCode) {
      return next(); // No coupon applied, continue
    }

    const userId = req.user._id;

    // Find and validate coupon
    const coupon = await Coupon.findOne({ 
      code: couponCode.toUpperCase() 
    });

    if (!coupon) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coupon code'
      });
    }

    // Check if coupon is valid
    const now = new Date();
    const isCurrentlyValid = (
      coupon.isActive && 
      now >= coupon.startDate && 
      now <= coupon.endDate &&
      (!coupon.maxUsageCount || coupon.currentUsage < coupon.maxUsageCount) &&
      (!coupon.budget || coupon.budgetUtilized < coupon.budget)
    );

    if (!isCurrentlyValid) {
      let reason = 'Coupon is not valid';
      
      if (!coupon.isActive) reason = 'Coupon is inactive';
      else if (now < coupon.startDate) reason = 'Coupon is not yet active';
      else if (now > coupon.endDate) reason = 'Coupon has expired';
      else if (coupon.maxUsageCount && coupon.currentUsage >= coupon.maxUsageCount) {
        reason = 'Coupon usage limit reached';
      }
      else if (coupon.budget && coupon.budgetUtilized >= coupon.budget) {
        reason = 'Coupon budget exhausted';
      }

      return res.status(400).json({
        success: false,
        error: reason
      });
    }

    // Check minimum order value
    if (cartTotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        error: `Minimum order value of ₹${coupon.minOrderValue} required`
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (cartTotal * coupon.discountValue) / 100;
    } else {
      discount = Math.min(coupon.discountValue, cartTotal);
    }
    discount = Math.round(discount * 100) / 100;

    // Add validated coupon data to request
    req.validatedCoupon = {
      coupon: coupon,
      discount: discount,
      applicableAmount: cartTotal
    };

    console.log('✅ Coupon validated:', coupon.code, 'Discount:', discount);
    next();
  } catch (error) {
    console.error('❌ Error in validateOrderCoupon middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate coupon'
    });
  }
};

/**
 * Middleware to track coupon performance
 * Use this to log coupon usage for analytics
 */
const trackCouponUsage = async (req, res, next) => {
  try {
    const { couponCode } = req.body;
    
    if (!couponCode) {
      return next();
    }

    // Log coupon attempt (even if it fails)
    console.log(`🎫 Coupon usage attempt: ${couponCode} by user ${req.user._id}`);
    
    next();
  } catch (error) {
    console.error('❌ Error in trackCouponUsage middleware:', error);
    next(); // Continue on error
  }
};

/**
 * Middleware to apply coupon after successful order
 * Use this in order completion
 */
const applyCouponAfterOrder = async (req, res, next) => {
  try {
    if (!req.validatedCoupon || !req.createdOrder) {
      return next();
    }

    const { coupon, discount } = req.validatedCoupon;
    const order = req.createdOrder;

    // Update coupon usage
    coupon.usageHistory = coupon.usageHistory || [];
    coupon.usageHistory.push({
      user: req.user._id,
      orderId: order._id,
      orderValue: order.totalAmount,
      discountGiven: discount,
      usedAt: new Date()
    });
    
    coupon.currentUsage = (coupon.currentUsage || 0) + 1;
    coupon.totalSales = (coupon.totalSales || 0) + order.totalAmount;
    coupon.budgetUtilized = (coupon.budgetUtilized || 0) + discount;
    
    await coupon.save();

    console.log(`✅ Coupon ${coupon.code} applied successfully for order ${order._id}`);
    next();
  } catch (error) {
    console.error('❌ Error applying coupon after order:', error);
    // Don't fail the order if coupon application fails
    next();
  }
};

/**
 * Middleware to rate limit coupon validation attempts
 * Prevents abuse of coupon validation endpoint
 */
const rateLimitCouponValidation = (() => {
  const attempts = new Map();
  const WINDOW_MS = 60000; // 1 minute
  const MAX_ATTEMPTS = 10; // 10 attempts per minute per user

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    
    // Clean old entries
    for (const [key, data] of attempts.entries()) {
      if (now - data.lastAttempt > WINDOW_MS) {
        attempts.delete(key);
      }
    }

    // Check current user attempts
    const userAttempts = attempts.get(userId);
    
    if (!userAttempts) {
      attempts.set(userId, { count: 1, lastAttempt: now });
      return next();
    }

    if (now - userAttempts.lastAttempt > WINDOW_MS) {
      // Reset counter if window has passed
      attempts.set(userId, { count: 1, lastAttempt: now });
      return next();
    }

    if (userAttempts.count >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: 'Too many coupon validation attempts. Please try again later.'
      });
    }

    // Increment counter
    userAttempts.count++;
    userAttempts.lastAttempt = now;

    next();
  };
})();

/**
 * Middleware to log coupon events for audit trail
 */
const logCouponEvent = (eventType) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the event after response is sent
      setImmediate(() => {
        try {
          const logData = {
            eventType,
            userId: req.user?._id,
            userEmail: req.user?.email,
            couponCode: req.body.couponCode || req.body.code || req.params.code,
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            success: res.statusCode < 400
          };

          if (req.validatedCoupon) {
            logData.couponId = req.validatedCoupon.coupon._id;
            logData.discount = req.validatedCoupon.discount;
          }

          // Log to console (you can enhance this later)
          console.log('🎫 Coupon Event:', JSON.stringify(logData));
        } catch (error) {
          console.error('❌ Error logging coupon event:', error);
        }
      });

      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to check if user is eligible for new user coupons
 */
const checkNewUserEligibility = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const user = await User.findById(req.user._id).select('orders createdAt');
    
    // Check if user has made any orders
    const hasOrders = user.orders && user.orders.length > 0;
    
    // Check if user account is new (less than 30 days old)
    const accountAge = Date.now() - user.createdAt.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const isNewAccount = accountAge < thirtyDays;

    req.userProfile = {
      isNewUser: !hasOrders,
      isNewAccount,
      hasOrders,
      orderCount: user.orders?.length || 0
    };

    next();
  } catch (error) {
    console.error('❌ Error checking new user eligibility:', error);
    next();
  }
};

/**
 * Simple middleware to suggest best coupon for cart
 */
const suggestBestCoupon = async (req, res, next) => {
  try {
    if (!req.user || !req.body.cartTotal) {
      return next();
    }

    const userId = req.user._id;
    const { cartTotal, cartItems = [] } = req.body;

    // Get user details
    const user = await User.findById(userId);
    let userGroup = 'all';
    
    if (user && user.membershipType === 'premium') {
      userGroup = 'premium';
    } else if (!user || !user.orders || user.orders.length === 0) {
      userGroup = 'new';
    }

    // Find valid coupons for this user group
    const now = new Date();
    const validCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { userGroups: 'all' },
        { userGroups: userGroup }
      ],
      minOrderValue: { $lte: cartTotal }
    }).sort({ discountValue: -1 });

    let bestCoupon = null;
    let maxDiscount = 0;

    // Find the coupon that gives maximum discount
    for (const coupon of validCoupons) {
      let discount = 0;
      if (coupon.discountType === 'percentage') {
        discount = (cartTotal * coupon.discountValue) / 100;
      } else {
        discount = Math.min(coupon.discountValue, cartTotal);
      }
      
      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestCoupon = {
          _id: coupon._id,
          code: coupon.code,
          title: coupon.title,
          discount: Math.round(discount * 100) / 100
        };
      }
    }

    // Add suggestion to request for use in response
    req.suggestedCoupon = bestCoupon;
    
    next();
  } catch (error) {
    console.error('❌ Error in suggestBestCoupon middleware:', error);
    next(); // Continue without suggestion on error
  }
};

module.exports = {
  suggestBestCoupon,
  validateOrderCoupon,
  trackCouponUsage,
  applyCouponAfterOrder,
  rateLimitCouponValidation,
  logCouponEvent,
  checkNewUserEligibility
};