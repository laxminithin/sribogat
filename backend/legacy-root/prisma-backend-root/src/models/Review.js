const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [{
    type: String // URLs to review images
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderationNotes: {
    type: String,
    trim: true
  },
  helpful: {
    type: Number,
    default: 0
  },
  helpfulBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isHelpful: {
      type: Boolean,
      default: true
    }
  }],
  reply: {
    text: String,
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  verified: {
    type: Boolean,
    default: true // True if user purchased the product
  }
}, {
  timestamps: true
});

// Add pagination plugin
reviewSchema.plugin(mongoosePaginate);

// Indexes for better performance
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ rating: 1 });

// Static method to check if user can review a product
reviewSchema.statics.canUserReviewProduct = async function(userId, productId) {
  try {
    console.log('Checking review eligibility for user:', userId, 'product:', productId);
    
    // Check if user has already reviewed this product
    const existingReview = await this.findOne({
      user: userId,
      product: productId
    });

    if (existingReview) {
      console.log('User has already reviewed this product');
      return {
        canReview: false,
        reason: 'You have already reviewed this product'
      };
    }

    // For now, allow all users to review any product
    // Comment this out if you want to enforce purchase verification
    console.log('User can review this product');
    return {
      canReview: true,
      reason: ''
    };

    // Optional: Check if user has purchased this product
    // Uncomment this section if you want to enforce purchase verification
    /*
    const Order = require('./Order');
    const hasPurchased = await Order.findOne({
      user: userId,
      'items.product': productId,
      status: 'delivered'
    });

    if (!hasPurchased) {
      return {
        canReview: false,
        reason: 'You can only review products you have purchased'
      };
    }

    return {
      canReview: true,
      reason: ''
    };
    */
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return {
      canReview: false,
      reason: 'Error checking review eligibility'
    };
  }
};

// Static method to calculate product rating statistics
reviewSchema.statics.calculateProductRating = async function(productId) {
  try {
    const stats = await this.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReviews = stats.reduce((sum, stat) => sum + stat.count, 0);
    const weightedSum = stats.reduce((sum, stat) => sum + (stat._id * stat.count), 0);
    const averageRating = totalReviews > 0 ? (weightedSum / totalReviews).toFixed(1) : 0;

    // Create rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    stats.forEach(stat => {
      ratingDistribution[stat._id] = stat.count;
    });

    return {
      averageRating: parseFloat(averageRating),
      totalReviews,
      ratingDistribution
    };
  } catch (error) {
    console.error('Error calculating product rating:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
};

// Post-save middleware to update product ratings
reviewSchema.post('save', async function(doc) {
  if (doc.status === 'approved') {
    try {
      const Product = require('./Product');
      const ratingData = await this.constructor.calculateProductRating(doc.product);
      
      await Product.findByIdAndUpdate(doc.product, {
        averageRating: ratingData.averageRating,
        totalReviews: ratingData.totalReviews,
        ratingDistribution: ratingData.ratingDistribution
      });
    } catch (error) {
      console.error('Error updating product rating:', error);
    }
  }
});

// Pre-remove middleware to update product ratings
reviewSchema.pre('remove', async function() {
  if (this.status === 'approved') {
    try {
      const Product = require('./Product');
      const ratingData = await this.constructor.calculateProductRating(this.product);
      
      await Product.findByIdAndUpdate(this.product, {
        averageRating: ratingData.averageRating,
        totalReviews: ratingData.totalReviews,
        ratingDistribution: ratingData.ratingDistribution
      });
    } catch (error) {
      console.error('Error updating product rating after deletion:', error);
    }
  }
});

module.exports = mongoose.model('Review', reviewSchema);