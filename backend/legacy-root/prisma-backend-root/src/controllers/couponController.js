// controllers/couponController.js
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons/
// @access  Private/Admin
exports.getAllCoupons = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    const now = new Date();
    switch (status) {
      case 'active':
        filter.isActive = true;
        filter.startDate = { $lte: now };
        filter.endDate = { $gte: now };
        break;
      case 'inactive':
        filter.isActive = false;
        break;
      case 'expired':
        filter.endDate = { $lt: now };
        break;
      case 'scheduled':
        filter.startDate = { $gt: now };
        break;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const coupons = await Coupon.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCoupons = await Coupon.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCoupons,
        pages: Math.ceil(totalCoupons / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coupons'
    });
  }
};

// @desc    Get single coupon (Admin)
// @route   GET /api/coupons/:id
// @access  Private/Admin
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coupon'
    });
  }
};

// @desc    Create new coupon (Admin)
// @route   POST /api/coupons/
// @access  Private/Admin
exports.createCoupon = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation errors',
        details: errors.array()
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ 
      code: req.body.code.toUpperCase() 
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code already exists'
      });
    }

    // Create coupon data
    const couponData = {
      ...req.body,
      code: req.body.code.toUpperCase(),
      createdBy: req.user.userId
    };

    const coupon = new Coupon(couponData);
    await coupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create coupon'
    });
  }
};

// @desc    Update coupon (Admin)
// @route   PUT /api/coupons/:id
// @access  Private/Admin
exports.updateCoupon = async (req, res) => {
  try {
    console.log('🔧 === UPDATE COUPON START ===');
    console.log('🔧 Coupon ID:', req.params.id);
    console.log('🔧 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔧 User info:', req.user ? { 
      userId: req.user.userId, 
      _id: req.user._id, 
      role: req.user.role 
    } : 'No user');

    // FIXED: Check for validation errors (make sure validationResult is imported)
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔧 Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation errors',
        details: errors.array()
      });
    }

    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      console.log('🔧 Coupon not found');
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    console.log('🔧 Found existing coupon:', {
      id: coupon._id,
      title: coupon.title,
      code: coupon.code
    });

    // Check if trying to update code and if it conflicts with existing coupon
    if (req.body.code && req.body.code.toUpperCase() !== coupon.code) {
      console.log('🔧 Checking for code conflicts...');
      const existingCoupon = await Coupon.findOne({ 
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id }
      });

      if (existingCoupon) {
        console.log('🔧 Code conflict found');
        return res.status(400).json({
          success: false,
          error: 'Coupon code already exists'
        });
      }
    }

    // FIXED: Prepare update data with safe user ID access
    const updateData = {
      ...req.body,
      // FIXED: Safe access to user ID with multiple fallbacks
      updatedBy: req.user?.userId || req.user?._id || req.user?.id,
      updatedAt: new Date()
    };

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    // FIXED: Remove undefined values to prevent Mongoose errors
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('🔧 Final update data:', JSON.stringify(updateData, null, 2));

    // Update coupon
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).populate('updatedBy', 'name email');

    if (!updatedCoupon) {
      console.log('🔧 Failed to update coupon');
      return res.status(404).json({
        success: false,
        error: 'Failed to update coupon'
      });
    }

    console.log('🔧 Coupon updated successfully:', {
      id: updatedCoupon._id,
      title: updatedCoupon.title,
      code: updatedCoupon.code
    });

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: updatedCoupon
    });

  } catch (error) {
    console.error('❌ Error updating coupon:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // FIXED: Better error handling for different error types
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        details: {
          field: error.path,
          value: error.value,
          message: error.message
        }
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate value error',
        details: error.keyValue
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update coupon'
    });
  }
};

// @desc    Delete coupon (Admin)
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    // Check if coupon has been used
    if (coupon.currentUsage > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete coupon that has been used. Consider deactivating it instead.'
      });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete coupon'
    });
  }
};

// @desc    Toggle coupon status (Admin)
// @route   PATCH /api/coupons/:id/toggle
// @access  Private/Admin
exports.toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    coupon.updatedBy = req.user._id;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: coupon.isActive }
    });
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle coupon status'
    });
  }
};

// @desc    Get public coupon information
// @route   GET /api/coupons/public/:code
// @access  Public
exports.getPublicCouponInfo = async (req, res) => {
  try {
    const { code } = req.params;
    
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).select('title description discountType discountValue minOrderValue endDate');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found or expired'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        validUntil: coupon.endDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coupon information'
    });
  }
};

// @desc    Get active coupons for public display
// @route   GET /api/coupons/active/public
// @access  Public
exports.getActiveCouponsPublic = async (req, res) => {
  try {
    const now = new Date();
    
    const activeCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      userGroups: 'all'
    })
    .select('title description discountType discountValue minOrderValue endDate')
    .sort({ discountValue: -1 })
    .limit(5);

    res.status(200).json({
      success: true,
      data: activeCoupons
    });
  } catch (error) {
    console.error('Error fetching public coupons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active coupons'
    });
  }
};

// @desc    Get available coupons for user
// @route   GET /api/coupons/available
// @access  Private
exports.getAvailableCoupons = async (req, res) => {
  try {
    console.log("vaibhav says", req.user);
    console.log('🎫 getAvailableCoupons called');
    console.log('🔑 req.user:', req.user ? 'Present' : 'Missing');
    console.log('🔑 userId:', req.user?.userId);
    console.log('💰 cartTotal:', req.query.cartTotal);

    const userId = req.user?.userId;
    const { cartTotal = 0 } = req.query;

    if (!userId) {
      console.error('❌ No userId found in request');
      return res.status(401).json({
        success: false,
        error: 'User ID not found in request'
      });
    }

    // Get user details to determine user group
    console.log('🔍 Fetching user details...');
    const user = await User.findById(userId);
    console.log('👤 User found:', !!user);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let userGroup = 'all';
    
    // Safely check user properties
    if (user.membershipType === 'premium') {
      userGroup = 'premium';
    } else if (!user.orders || user.orders.length === 0) {
      userGroup = 'new';
    }

    console.log('👥 User group determined:', userGroup);

    // Find valid coupons for this user group
    const now = new Date();
    const validCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { userGroups: 'all' },
        { userGroups: userGroup }
      ]
    })
    .select('title code description discountType discountValue minOrderValue maxUsageCount currentUsage endDate')
    .sort({ discountValue: -1 });

    console.log('🎟️ Found coupons:', validCoupons.length);

    // Filter coupons user can actually use
    const availableCoupons = [];
    
    for (const coupon of validCoupons) {
      // Check if cart meets minimum order value
      const meetsMinOrder = parseFloat(cartTotal) >= coupon.minOrderValue;
      
      availableCoupons.push({
        _id: coupon._id,
        title: coupon.title,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        endDate: coupon.endDate,
        canUse: meetsMinOrder,
        reason: meetsMinOrder ? null : `Minimum order value: ₹${coupon.minOrderValue}`
      });
    }

    console.log('✅ Returning available coupons:', availableCoupons.length);

    res.status(200).json({
      success: true,
      data: availableCoupons,
      userGroup
    });
  } catch (error) {
    console.error('❌ Error fetching available coupons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available coupons'
    });
  }
};

// @desc    Validate coupon for user
// @route   POST /api/coupons/validate
// @access  Private
exports.validateCoupon = async (req, res) => {
  try {
    console.log('🎫 validateCoupon called');
    console.log('🔍 Request body:', req.body);

    const { code, cartTotal, cartItems = [] } = req.body;
    const userId = req.user._id;

    if (!code || !cartTotal) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code and cart total are required'
      });
    }

    // Find coupon by code
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase() 
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Invalid coupon code'
      });
    }

    // Check if coupon is currently valid
    const now = new Date();
    const isCurrentlyValid = (
      coupon.isActive && 
      now >= coupon.startDate && 
      now <= coupon.endDate &&
      (!coupon.maxUsageCount || coupon.currentUsage < coupon.maxUsageCount)
    );

    if (!isCurrentlyValid) {
      let reason = 'Coupon is not valid';
      
      if (!coupon.isActive) reason = 'Coupon is inactive';
      else if (now < coupon.startDate) reason = 'Coupon is not yet active';
      else if (now > coupon.endDate) reason = 'Coupon has expired';
      else if (coupon.maxUsageCount && coupon.currentUsage >= coupon.maxUsageCount) {
        reason = 'Coupon usage limit reached';
      }

      return res.status(400).json({
        success: false,
        error: reason
      });
    }

    // Calculate discount
    if (cartTotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        error: `Minimum order value of ₹${coupon.minOrderValue} required`
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (cartTotal * coupon.discountValue) / 100;
    } else {
      discount = Math.min(coupon.discountValue, cartTotal);
    }

    discount = Math.round(discount * 100) / 100;

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      data: {
        coupon: {
          _id: coupon._id,
          title: coupon.title,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue
        },
        discount: discount,
        applicableAmount: cartTotal,
        finalAmount: cartTotal - discount
      }
    });
  } catch (error) {
    console.error('❌ Error validating coupon:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate coupon'
    });
  }
};

// @desc    Get coupon suggestions for cart
// @route   POST /api/coupons/suggestions
// @access  Private
exports.getCouponSuggestions = async (req, res) => {
  try {
    console.log('🎫 getCouponSuggestions called');
    console.log('🔍 Request body:', req.body);

    const { cartTotal, cartItems = [] } = req.body;
    const userId = req.user._id;

    if (!cartTotal) {
      return res.status(400).json({
        success: false,
        error: 'Cart total is required'
      });
    }

    // Get user profile for coupon eligibility
    const user = await User.findById(userId).select('orders membershipType createdAt');
    let userGroup = 'all';
    
    if (user && user.membershipType === 'premium') {
      userGroup = 'premium';
    } else if (!user || !user.orders || user.orders.length === 0) {
      userGroup = 'new';
    }

    // Find applicable coupons
    const now = new Date();
    const applicableCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { userGroups: 'all' },
        { userGroups: userGroup }
      ]
    });
    
    const suggestions = [];

    for (const coupon of applicableCoupons) {
      if (cartTotal >= coupon.minOrderValue) {
        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = (cartTotal * coupon.discountValue) / 100;
        } else {
          discount = Math.min(coupon.discountValue, cartTotal);
        }
        discount = Math.round(discount * 100) / 100;
        
        suggestions.push({
          _id: coupon._id,
          title: coupon.title,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discount: discount,
          newTotal: cartTotal - discount,
          savings: discount,
          canApply: true
        });
      }
    }

    // Sort by discount amount (highest first)
    suggestions.sort((a, b) => b.discount - a.discount);

    res.status(200).json({
      success: true,
      data: {
        suggestions: suggestions.slice(0, 3), // Top 3 suggestions
        bestCoupon: suggestions[0] || null,
        totalSuggestions: suggestions.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting coupon suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get coupon suggestions'
    });
  }
};

// @desc    Apply coupon to order
// @route   POST /api/coupons/apply
// @access  Private
exports.applyCoupon = async (req, res) => {
  try {
    const { couponId, orderId, orderValue, discountGiven } = req.body;
    const userId = req.user._id;

    if (!couponId || !orderId || !orderValue || discountGiven === undefined) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: couponId, orderId, orderValue, discountGiven'
      });
    }

    // Find and validate coupon
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    // Update coupon usage
    coupon.usageHistory = coupon.usageHistory || [];
    coupon.usageHistory.push({
      user: userId,
      orderId: orderId,
      orderValue: orderValue,
      discountGiven: discountGiven,
      usedAt: new Date()
    });
    
    coupon.currentUsage = (coupon.currentUsage || 0) + 1;
    coupon.totalSales = (coupon.totalSales || 0) + orderValue;
    coupon.budgetUtilized = (coupon.budgetUtilized || 0) + discountGiven;
    
    await coupon.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        currentUsage: coupon.currentUsage,
        budgetUtilized: coupon.budgetUtilized,
        totalSales: coupon.totalSales
      }
    });
  } catch (error) {
    console.error('❌ Error applying coupon:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply coupon'
    });
  }
};

// ✅ NEW: Update coupon usage after successful payment
// @route   POST /api/coupons/:couponId/usage
// @access  Private
const updateCouponUsage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { couponId } = req.params;
    const { orderId, userId, discountAmount, orderTotal, usedAt } = req.body;

    // Find the coupon
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Validate coupon is still active
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is no longer active'
      });
    }

    // Check if coupon has expired
    const now = new Date();
    if (now > coupon.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired'
      });
    }

    // Check if this order has already been recorded (prevent double counting)
    const existingUsage = coupon.usageHistory.find(
  usage => usage.orderId.toString() === orderId.toString()
);

    if (existingUsage) {
      return res.status(409).json({
        success: false,
        message: 'Coupon usage for this order has already been recorded',
        data: {
          existingUsage: {
            orderId: existingUsage.orderId,
            usedAt: existingUsage.usedAt,
            discountAmount: existingUsage.discountAmount
          }
        }
      });
    }

    // Check if max usage limit would be exceeded
    if (coupon.currentUsage >= coupon.maxUsageCount) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit exceeded'
      });
    }

    // Check budget if applicable
    if (coupon.budget && (coupon.budgetUtilized + parseFloat(discountAmount)) > coupon.budget) {
      return res.status(400).json({
        success: false,
        message: 'Coupon budget exceeded',
        data: {
          budgetRemaining: coupon.budget - coupon.budgetUtilized,
          requestedDiscount: parseFloat(discountAmount)
        }
      });
    }

    // Check user usage limit
    const userUsageCount = coupon.usageHistory.filter(
  usage => usage.user.toString() === userId.toString()
).length;

    if (userUsageCount >= coupon.usagePerUser) {
      return res.status(400).json({
        success: false,
        message: 'User usage limit exceeded for this coupon',
        data: {
          userUsageLimit: coupon.usagePerUser,
          currentUserUsage: userUsageCount
        }
      });
    }

    // Create usage record
  const usageRecord = {
  user: userId,
  orderId,
  orderValue: parseFloat(orderTotal),
  discountGiven: parseFloat(discountAmount),
  usedAt: usedAt ? new Date(usedAt) : new Date()
};

    // Update coupon with atomic operations
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        $inc: {
          currentUsage: 1,
          totalSales: parseFloat(orderTotal),
          budgetUtilized: parseFloat(discountAmount)
        },
        $push: {
          usageHistory: usageRecord
        },
        $set: {
          updatedAt: new Date()
        }
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!updatedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update coupon'
      });
    }

    // Log the successful usage update
    console.log(`✅ Coupon ${coupon.code} usage updated:`, {
      couponId,
      userId,
      orderId,
      discountAmount: parseFloat(discountAmount),
      orderTotal: parseFloat(orderTotal),
      newCurrentUsage: updatedCoupon.currentUsage,
      newTotalSales: updatedCoupon.totalSales,
      newBudgetUtilized: updatedCoupon.budgetUtilized
    });

    res.json({
      success: true,
      message: 'Coupon usage updated successfully',
      data: {
        couponId: updatedCoupon._id,
        code: updatedCoupon.code,
        currentUsage: updatedCoupon.currentUsage,
        totalSales: updatedCoupon.totalSales,
        budgetUtilized: updatedCoupon.budgetUtilized,
        remainingUsage: updatedCoupon.maxUsageCount - updatedCoupon.currentUsage,
        remainingBudget: updatedCoupon.budget ? updatedCoupon.budget - updatedCoupon.budgetUtilized : null,
        usageRecord
      }
    });

  } catch (error) {
    console.error('❌ Coupon usage update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update coupon usage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ NEW: Get detailed coupon usage statistics
// @route   GET /api/coupons/:id/stats
// @access  Private/Admin
const getCouponStats = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const coupon = await Coupon.findById(id).select(
      'code title currentUsage maxUsageCount totalSales budget budgetUtilized usageHistory isActive startDate endDate discountType discountValue'
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Calculate additional statistics
    const uniqueUsers = new Set(coupon.usageHistory.map(h => h.userId ? h.userId.toString() : h.user ? h.user.toString() : 'unknown')).size;
    const totalDiscount = coupon.usageHistory.reduce((sum, h) => sum + (h.discountAmount || h.discountGiven || 0), 0);
    
    // Calculate usage by day for trend analysis
    const usageByDay = {};
    coupon.usageHistory.forEach(usage => {
      const day = usage.usedAt.toISOString().split('T')[0];
      usageByDay[day] = (usageByDay[day] || 0) + 1;
    });

    const stats = {
      basic: {
        code: coupon.code,
        title: coupon.title,
        isActive: coupon.isActive,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      },
      usage: {
        current: coupon.currentUsage,
        maximum: coupon.maxUsageCount,
        remaining: coupon.maxUsageCount - coupon.currentUsage,
        percentage: Math.round((coupon.currentUsage / coupon.maxUsageCount) * 100),
        isExhausted: coupon.currentUsage >= coupon.maxUsageCount
      },
      financial: {
        totalSales: coupon.totalSales,
        budgetAllocated: coupon.budget || 0,
        budgetUtilized: coupon.budgetUtilized,
        budgetRemaining: coupon.budget ? coupon.budget - coupon.budgetUtilized : null,
        budgetUtilizationPercentage: coupon.budget ? 
          Math.round((coupon.budgetUtilized / coupon.budget) * 100) : 0,
        totalDiscountGiven: totalDiscount,
        isBudgetExhausted: coupon.budget ? coupon.budgetUtilized >= coupon.budget : false
      },
      analytics: {
        uniqueUsers: uniqueUsers,
        averageOrderValue: coupon.currentUsage > 0 ? 
          Math.round(coupon.totalSales / coupon.currentUsage * 100) / 100 : 0,
        averageDiscount: coupon.currentUsage > 0 ? 
          Math.round(coupon.budgetUtilized / coupon.currentUsage * 100) / 100 : 0,
        conversionRate: coupon.currentUsage > 0 ? 
          Math.round((coupon.currentUsage / coupon.maxUsageCount) * 100 * 100) / 100 : 0,
        repeatUsageRate: uniqueUsers > 0 ? 
          Math.round(((coupon.currentUsage - uniqueUsers) / coupon.currentUsage) * 100) : 0
      },
      trends: {
        usageByDay: Object.entries(usageByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-30) // Last 30 days
          .map(([date, count]) => ({ date, count })),
        peakUsageDay: Object.entries(usageByDay)
          .reduce((max, [date, count]) => count > max.count ? { date, count } : max, { date: null, count: 0 })
      },
      recentUsage: coupon.usageHistory
        .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt))
        .slice(0, 10)
        .map(usage => ({
          orderId: usage.orderId,
          discountAmount: usage.discountAmount || usage.discountGiven,
          orderTotal: usage.orderTotal || usage.orderValue,
          usedAt: usage.usedAt
        }))
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Coupon stats fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ NEW: Reserve coupon for order (prevents race conditions)
// @route   POST /api/coupons/:couponId/reserve
// @access  Private
// const reserveCoupon = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }

//     const { couponId } = req.params;
//     const { userId, discountAmount, orderTotal, reservationTimeout = 600000 } = req.body;

//     const coupon = await Coupon.findById(couponId);
//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: 'Coupon not found'
//       });
//     }

//     // Check if coupon is active
//     if (!coupon.isActive) {
//       return res.status(400).json({
//         success: false,
//         message: 'Coupon is not active'
//       });
//     }

//     // Check if coupon has expired
//     const now = new Date();
//     if (now > coupon.endDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'Coupon has expired'
//       });
//     }

//     // Check availability
//     if (coupon.currentUsage >= coupon.maxUsageCount) {
//       return res.status(400).json({
//         success: false,
//         message: 'Coupon usage limit reached'
//       });
//     }

//     // Check budget
//     if (coupon.budget && (coupon.budgetUtilized + parseFloat(discountAmount)) > coupon.budget) {
//       return res.status(400).json({
//         success: false,
//         message: 'Insufficient coupon budget',
//         data: {
//           budgetRemaining: coupon.budget - coupon.budgetUtilized,
//           requestedDiscount: parseFloat(discountAmount)
//         }
//       });
//     }

//     // Check user usage limit
//     const userUsageCount = coupon.usageHistory.filter(
//       usage => (usage.userId && usage.userId.toString() === userId.toString()) || 
//                (usage.user && usage.user.toString() === userId.toString())
//     ).length;

//     if (userUsageCount >= coupon.usagePerUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'User usage limit exceeded for this coupon',
//         data: {
//           userUsageLimit: coupon.usagePerUser,
//           currentUserUsage: userUsageCount
//         }
//       });
//     }

//     const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//     const expiresAt = new Date(Date.now() + reservationTimeout);

//     // In a production environment, you'd store this in Redis or a separate reservations collection
//     // For now, we'll just return success with reservation details
//     console.log(`✅ Coupon ${coupon.code} reserved for user ${userId}:`, {
//       reservationId,
//       discountAmount: parseFloat(discountAmount),
//       orderTotal: parseFloat(orderTotal),
//       expiresAt
//     });

//     res.json({
//       success: true,
//       message: 'Coupon reserved successfully',
//       data: {
//         reservationId,
//         couponId,
//         userId,
//         discountAmount: parseFloat(discountAmount),
//         orderTotal: parseFloat(orderTotal),
//         expiresAt,
//         timeoutMs: reservationTimeout,
//         couponDetails: {
//           code: coupon.code,
//           title: coupon.title,
//           remainingUsage: coupon.maxUsageCount - coupon.currentUsage,
//           remainingBudget: coupon.budget ? coupon.budget - coupon.budgetUtilized : null
//         }
//       }
//     });

//   } catch (error) {
//     console.error('❌ Coupon reservation error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to reserve coupon',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// ✅ NEW: Release coupon reservation
// @route   POST /api/coupons/:couponId/release
// @access  Private
const releaseCouponReservation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { couponId } = req.params;
    const { reservationId } = req.body;

    // In production, you'd remove the reservation from Redis/database
    // For now, just acknowledge the release
    console.log(`✅ Coupon reservation released:`, {
      couponId,
      reservationId,
      releasedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Coupon reservation released successfully',
      data: {
        couponId,
        reservationId,
        releasedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Coupon release error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release coupon reservation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's coupon usage history
// @route   GET /api/coupons/user/history
// @access  Private
exports.getUserCouponHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find all coupons used by this user
    const couponsWithHistory = await Coupon.aggregate([
      { $unwind: '$usageHistory' },
      { 
        $match: { 
          $or: [
            { 'usageHistory.user': userId },
            { 'usageHistory.userId': userId }
          ]
        }
      },
      {
        $project: {
          title: 1,
          code: 1,
          discountType: 1,
          discountValue: 1,
          usage: '$usageHistory'
        }
      },
      { $sort: { 'usage.usedAt': -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: couponsWithHistory
    });
  } catch (error) {
    console.error('❌ Error fetching user coupon history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coupon history'
    });
  }
};

// @desc    Check if user can use specific coupon
// @route   GET /api/coupons/can-use/:code
// @access  Private
exports.canUseCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase() 
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    const now = new Date();
    const isValid = (
      coupon.isActive && 
      now >= coupon.startDate && 
      now <= coupon.endDate
    );

    res.status(200).json({
      success: true,
      data: {
        canUse: isValid,
        isValid,
        reason: !isValid ? 'Coupon not valid' : null
      }
    });
  } catch (error) {
    console.error('❌ Error checking coupon eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check coupon eligibility'
    });
  }
};

// @desc    Get overall analytics (Admin)
// @route   GET /api/coupons/analytics/overview
// @access  Private/Admin
exports.getOverallAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get basic statistics
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        period: `Last ${days} days`,
        totalCoupons,
        activeCoupons
      }
    });
  } catch (error) {
    console.error('❌ Error fetching overall analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overall analytics'
    });
  }
};

// @desc    Bulk update coupon status (Admin)
// @route   PATCH /api/coupons/bulk/status
// @access  Private/Admin
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { couponIds, isActive } = req.body;

    if (!Array.isArray(couponIds) || couponIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Coupon IDs array is required'
      });
    }

    const result = await Coupon.updateMany(
      { _id: { $in: couponIds } },
      { 
        isActive: isActive,
        updatedBy: req.user._id 
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} coupons ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('❌ Error bulk updating coupon status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update coupon status'
    });
  }
};

// @desc    Export coupons data (Admin)
// @route   GET /api/coupons/export
// @access  Private/Admin
exports.exportCoupons = async (req, res) => {
  try {
    const { format = 'json', status = 'all' } = req.query;

    // Build filter
    const filter = {};
    const now = new Date();

    switch (status) {
      case 'active':
        filter.isActive = true;
        filter.startDate = { $lte: now };
        filter.endDate = { $gte: now };
        break;
      case 'inactive':
        filter.isActive = false;
        break;
      case 'expired':
        filter.endDate = { $lt: now };
        break;
    }

    const coupons = await Coupon.find(filter)
      .populate('createdBy', 'name email')
      .select('-usageHistory')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: coupons,
      exportedAt: new Date(),
      totalCount: coupons.length
    });
  } catch (error) {
    console.error('❌ Error exporting coupons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export coupons'
    });
  }
};

// @desc    Get coupon analytics (Admin)
// @route   GET /api/coupons/:id/analytics
// @access  Private/Admin
exports.getCouponAnalytics = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalUsage: coupon.currentUsage || 0,
        totalSales: coupon.totalSales || 0,
        budgetUtilized: coupon.budgetUtilized || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching coupon analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coupon analytics'
    });
  }
};

// @desc    Get coupon usage history (Admin)
// @route   GET /api/coupons/:id/usage-history
// @access  Private/Admin
exports.getCouponUsageHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const coupon = await Coupon.findById(req.params.id)
      .populate({
        path: 'usageHistory.user',
        select: 'name email'
      })
      .populate({
        path: 'usageHistory.userId',
        select: 'name email'
      });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    // Paginate usage history
    const usageHistory = coupon.usageHistory
      .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt))
      .slice(skip, skip + parseInt(limit));

    const totalUsage = coupon.usageHistory.length;

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          _id: coupon._id,
          title: coupon.title,
          code: coupon.code
        },
        usageHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsage,
          pages: Math.ceil(totalUsage / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching coupon usage history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage history'
    });
  }
};

// @desc    Generate coupon performance report (Admin)
// @route   GET /api/coupons/:id/report
// @access  Private/Admin
exports.generateCouponReport = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    // Generate comprehensive report
    const report = {
      coupon: {
        title: coupon.title,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      },
      performance: {
        totalUsage: coupon.currentUsage || 0,
        totalRevenue: coupon.totalSales || 0,
        totalDiscount: coupon.budgetUtilized || 0,
        averageOrderValue: coupon.currentUsage > 0 ? 
          Math.round((coupon.totalSales || 0) / coupon.currentUsage) : 0
      },
      timeline: {
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        isActive: coupon.isActive,
        daysRemaining: Math.max(0, Math.ceil((coupon.endDate - new Date()) / (1000 * 60 * 60 * 24)))
      }
    };

    res.status(200).json({
      success: true,
      data: report,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('❌ Error generating coupon report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
};

// ✅ Export the new methods
exports.updateCouponUsage = updateCouponUsage;
exports.getCouponStats = getCouponStats;
exports.releaseCouponReservation = releaseCouponReservation;