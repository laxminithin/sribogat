const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
originalPrice: {
  type: Number,
  min: 0,
  validate: {
    validator: function (value) {
      // Skip validation if `this.price` is not available (partial update)
      if (typeof this.price !== 'number') return true;
      return value >= this.price;
    },
    message: 'Original price should be greater than or equal to current price'
  }
},
  gst: {
  type: Number,
  min: 0,
  max: 100,
  default: 0
},
  hsn: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(value) {
        // HSN is optional, but if provided should be valid
        if (!value) return true;
        return /^[0-9A-Z]{4,8}$/.test(value);
      },
      message: 'HSN code should be 4-8 characters containing only numbers and letters'
    }
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'piece', 'dozen', 'bunch', 'liter', 'ml', 'pack']
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  // ✅ Updated: Support multiple images
  images: [{
    type: String,
    required: true
  }],
  // ✅ Keep single image field for backward compatibility (will be the first image)
  image: {
    type: String,
    required: true
  },
  // ✅ Additional product fields
  brand: {
    type: String,
    trim: true
  },
  features: [{
    type: String,
    trim: true
  }],
  specifications: {
    type: Map,
    of: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  // ✅ Additional metadata
  featured: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  }
}, {
  timestamps: true
});

// ✅ Pre-save middleware to ensure image field is set
productSchema.pre('save', function(next) {
  // Set the main image field to the first image in the images array
  if (this.images && this.images.length > 0) {
    this.image = this.images[0];
  }
  next();
});

// ✅ Pre-update middleware for findOneAndUpdate operations
productSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Handle $set operations
  if (update.$set && update.$set.images && update.$set.images.length > 0) {
    update.$set.image = update.$set.images[0];
  }
  // Handle direct updates
  else if (update.images && update.images.length > 0) {
    update.image = update.images[0];
  }
  
  next();
});

// ✅ Virtual for calculating discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round((1 - this.price / this.originalPrice) * 100);
  }
  return 0;
});

// ✅ Virtual for checking if product is on sale
productSchema.virtual('isOnSale').get(function() {
  return this.originalPrice && this.originalPrice > this.price;
});

// ✅ Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= 5) return 'low_stock';
  return 'in_stock';
});

// ✅ Virtual for GST amount calculation
productSchema.virtual('gstAmount').get(function() {
  if (this.gst && this.price) {
    return Math.round((this.price * this.gst / 100) * 100) / 100;
  }
  return 0;
});

// ✅ Virtual for total price including GST
productSchema.virtual('priceWithGST').get(function() {
  return this.price + this.gstAmount;
});

// ✅ Add indexes for better query performance
productSchema.index({ name: 'text', category: 'text', subcategory: 'text', brand: 'text' });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ status: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'tags': 1 });
productSchema.index({ 'hsn': 1 }); // ✅ Add HSN index for tax reporting queries

// ✅ Ensure virtuals are included when converting to JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);