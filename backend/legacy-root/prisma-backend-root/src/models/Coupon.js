const mongoose = require('mongoose');

// Coupon Usage Subschema
const couponUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderValue: {
    type: Number,
    required: true
  },
  discountGiven: {
    type: Number,
    required: true
  },
  usedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Coupon Schema
const couponSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 3,
    maxlength: 20,
    match: /^[A-Z0-9]+$/,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function (value) {
        return this.discountType === 'percentage' ? value <= 100 : true;
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },
  minOrderValue: {
    type: Number,
    min: 0,
    default: 0
  },
  maxUsageCount: {
    type: Number,
    min: 1,
    default: null
  },
  usagePerUser: {
    type: Number,
    min: 1,
    default: 1
  },
  currentUsage: {
    type: Number,
    min: 0,
    default: 0
  },
  totalSales: {
    type: Number,
    min: 0,
    default: 0
  },
  budget: {
    type: Number,
    min: 0,
    default: null
  },
  budgetUtilized: {
    type: Number,
    min: 0,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
    // FIXED: Removed the problematic validator
    // The date validation will be handled in the controller instead
    /* validate: {
      validator: function (value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    } */
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  excludedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: String,
    trim: true
  }],
  userGroups: {
    type: String,
    enum: ['all', 'new', 'premium'],
    default: 'all'
  },
  usageHistory: [couponUsageSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
couponSchema.virtual('isCurrentlyValid').get(function () {
  const now = new Date();
  return this.isActive &&
    this.startDate <= now &&
    this.endDate >= now &&
    (!this.maxUsageCount || this.currentUsage < this.maxUsageCount) &&
    (!this.budget || this.budgetUtilized < this.budget);
});

couponSchema.virtual('usagePercentage').get(function () {
  return this.maxUsageCount ? Math.min(100, (this.currentUsage / this.maxUsageCount) * 100) : 0;
});

couponSchema.virtual('budgetUtilizationPercentage').get(function () {
  return this.budget ? Math.min(100, (this.budgetUtilized / this.budget) * 100) : 0;
});

couponSchema.virtual('statusText').get(function () {
  const now = new Date();
  if (!this.isActive) return 'Inactive';
  if (now < this.startDate) return 'Scheduled';
  if (now > this.endDate) return 'Expired';
  if (this.budget && this.budgetUtilized >= this.budget) return 'Budget Exhausted';
  if (this.maxUsageCount && this.currentUsage >= this.maxUsageCount) return 'Usage Limit Reached';
  return 'Active';
});

// FIXED: Updated Pre-save validation to handle updates properly
couponSchema.pre('save', function (next) {
  // Ensure code is always uppercase
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  
  // Only validate dates if both are present and it's not an update operation
  if (this.startDate && this.endDate && !this.isModified('updatedAt')) {
    if (this.endDate <= this.startDate) {
      return next(new Error('End date must be after start date'));
    }
  }
  next();
});

// ALTERNATIVE: You can also remove the pre-save validation entirely
/* 
couponSchema.pre('save', function (next) {
  // Ensure code is always uppercase
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});
*/

// Static method: Find valid coupons
couponSchema.statics.findValidCoupons = function (userGroup = 'all') {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { userGroups: 'all' },
      { userGroups: userGroup }
    ],
    $expr: {
      $and: [
        {
          $or: [
            { $eq: ['$maxUsageCount', null] },
            { $lt: ['$currentUsage', '$maxUsageCount'] }
          ]
        },
        {
          $or: [
            { $eq: ['$budget', null] },
            { $lt: ['$budgetUtilized', '$budget'] }
          ]
        }
      ]
    }
  });
};

// Instance method: Can user use coupon
couponSchema.methods.canUserUseCoupon = function (userId) {
  // Handle both ObjectId and string userId
  const userIdString = userId.toString();
  const count = this.usageHistory.filter(u => u.user.toString() === userIdString).length;
  return count < this.usagePerUser;
};

// Instance method: Calculate discount - Fixed for better error handling
couponSchema.methods.calculateDiscount = function (orderValue, cartItems = []) {
  console.log('🎫 Calculating discount for coupon:', this.code, 'Order value:', orderValue);
  
  if (orderValue < this.minOrderValue) {
    return { 
      valid: false, 
      reason: `Minimum order value of ₹${this.minOrderValue} required`, 
      discount: 0 
    };
  }

  if (!this.isCurrentlyValid) {
    return { 
      valid: false, 
      reason: 'Coupon is not currently valid', 
      discount: 0 
    };
  }

  let applicableAmount = orderValue;

  // Handle product-specific coupons
  if (this.applicableProducts && this.applicableProducts.length > 0) {
    applicableAmount = cartItems
      .filter(item => this.applicableProducts.some(productId => 
        productId.toString() === (item.productId || item._id || item.id).toString()
      ))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
    if (applicableAmount === 0) {
      return { 
        valid: false, 
        reason: 'No applicable products in cart', 
        discount: 0 
      };
    }
  }

  // Handle excluded products
  if (this.excludedProducts && this.excludedProducts.length > 0) {
    const excluded = cartItems
      .filter(item => this.excludedProducts.some(productId => 
        productId.toString() === (item.productId || item._id || item.id).toString()
      ))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    applicableAmount = Math.max(0, applicableAmount - excluded);
  }

  if (applicableAmount <= 0) {
    return { 
      valid: false, 
      reason: 'No applicable amount after exclusions', 
      discount: 0 
    };
  }

  // Calculate discount
  let discount = this.discountType === 'percentage'
    ? (applicableAmount * this.discountValue) / 100
    : Math.min(this.discountValue, applicableAmount);

  // Check budget constraint
  if (this.budget && (this.budgetUtilized + discount > this.budget)) {
    discount = Math.max(0, this.budget - this.budgetUtilized);
    
    if (discount <= 0) {
      return { 
        valid: false, 
        reason: 'Coupon budget has been exhausted', 
        discount: 0 
      };
    }
  }

  discount = Math.round(discount * 100) / 100;
  
  console.log('✅ Discount calculated:', discount);
  
  return {
    valid: true,
    discount,
    applicableAmount
  };
};

// Instance method: Apply coupon - Enhanced with better error handling
couponSchema.methods.applyCoupon = async function (userId, orderId, orderValue, discountGiven) {
  try {
    console.log('🎫 Applying coupon:', this.code, 'User:', userId, 'Discount:', discountGiven);
    
    this.usageHistory.push({ 
      user: userId, 
      orderId, 
      orderValue, 
      discountGiven,
      usedAt: new Date()
    });
    
    this.currentUsage = (this.currentUsage || 0) + 1;
    this.totalSales = (this.totalSales || 0) + orderValue;
    this.budgetUtilized = (this.budgetUtilized || 0) + discountGiven;
    
    const savedCoupon = await this.save();
    console.log('✅ Coupon applied successfully');
    return savedCoupon;
  } catch (error) {
    console.error('❌ Error applying coupon:', error);
    throw error;
  }
};

// Instance method: Analytics
couponSchema.methods.getAnalytics = function (days = 30) {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const recent = this.usageHistory.filter(u => u.usedAt >= start);
  const totalRevenue = recent.reduce((sum, u) => sum + u.orderValue, 0);
  const totalDiscount = recent.reduce((sum, u) => sum + u.discountGiven, 0);
  const users = new Set(recent.map(u => u.user.toString()));

  return {
    period: `${days} days`,
    usageCount: recent.length,
    totalRevenue,
    totalDiscountGiven: totalDiscount,
    averageOrderValue: recent.length > 0 ? Math.round(totalRevenue / recent.length) : 0,
    uniqueUsers: users.size,
    usagePercentage: this.usagePercentage,
    budgetUtilizationPercentage: this.budgetUtilizationPercentage
  };
};

// Indexes
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
couponSchema.index({ createdAt: -1 });
couponSchema.index({ userGroups: 1 });
couponSchema.index({ 'usageHistory.user': 1 });

module.exports = mongoose.model('Coupon', couponSchema);