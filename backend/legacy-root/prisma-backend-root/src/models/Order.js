const mongoose = require('mongoose');
const Counter = require('./Counter'); // Import Counter model!

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  basePrice: { type: Number, default: 0, min: 0 },
  gst: { type: Number, default: 0, min: 0 },
  gstRate: { type: Number, default: 18, min: 0, max: 100 },
  gstAmount: { type: Number, default: 0, min: 0 },
  totalGstAmount: { type: Number, default: 0, min: 0 },
  hsn: { type: String, default: '1234', trim: true },
  name: { type: String, required: true, trim: true },
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number, unique: true, index: true, min: 1 },
  formattedOrderNumber: {
    type: String,
    unique: true,
    index: true,
    validate: {
      validator: v => !v || /^\d{6}$/.test(v),
      message: 'Formatted order number must be 6 digits with leading zeros (e.g., 000001)',
    },
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    validate: {
      validator: v => !v || /^\d{4}\d{5}$/.test(v),
      message: 'Invoice number must be in format YYYY00000 (10 digits)',
    },
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  discountedSubtotal: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  couponCode: { type: String, trim: true, uppercase: true },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  totalAmount: { type: Number, required: true, min: 0 },
  gstAmount: { type: Number, default: 0, min: 0 },
  originalGstAmount: { type: Number, default: 0, min: 0 },
  shippingCharge: { type: Number, default: 0, min: 0 },
  shippingAddress: {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
  },
  paymentMethod: { type: String, required: true, enum: ['cod', 'razorpay', 'online'], default: 'cod' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'initiated', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true,
  },
  razorpayDetails: {
    orderId: String,
    paymentId: String,
    signature: String,
  },
  adminNote: { type: String, trim: true, maxlength: 1000 },
  adminNoteUpdatedAt: { type: Date },
  adminNoteUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invoiceGenerated: { type: Boolean, default: false },
  invoiceGeneratedAt: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ invoiceNumber: 1 }, { sparse: true });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ formattedOrderNumber: 1 }, { unique: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ couponCode: 1 });
orderSchema.index({ couponId: 1 });

// Virtuals
orderSchema.virtual('displayOrderNumber').get(function() {
  if (!this.formattedOrderNumber) return null;
  return `ORD-${this.formattedOrderNumber}`;
});

orderSchema.virtual('invoiceOrderNumber').get(function () {
  if (!this.orderNumber || !this.createdAt) return null;
  const year = this.createdAt.getFullYear(); // e.g., 2025
  const paddedOrderNum = String(this.orderNumber).padStart(6, '0'); // e.g., 000123
  return `${year}${paddedOrderNum}`; // e.g., "2025000123"
});


orderSchema.virtual('adminNoteUpdatedAtFormatted').get(function() {
  if (!this.adminNoteUpdatedAt) return null;
  return this.adminNoteUpdatedAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});
orderSchema.virtual('discountInfo').get(function() {
  if (!this.discount || this.discount === 0) return null;
  return {
    amount: this.discount,
    percentage: this.subtotal > 0 ? ((this.discount / this.subtotal) * 100).toFixed(1) : 0,
    couponCode: this.couponCode,
    savings: this.discount,
  };
});
orderSchema.virtual('orderSummary').get(function() {
  return {
    orderNumber: this.orderNumber,
    formattedOrderNumber: this.formattedOrderNumber,
    displayOrderNumber: this.displayOrderNumber,
    subtotal: this.subtotal || 0,
    discount: this.discount || 0,
    discountedSubtotal: this.discountedSubtotal || this.subtotal || 0,
    gst: this.gstAmount || 0,
    shipping: this.shippingCharge || 0,
    total: this.totalAmount || 0,
    itemsCount: this.items ? this.items.length : 0,
    totalQuantity: this.items ? this.items.reduce((sum, item) => sum + item.quantity, 0) : 0,
    invoiceNumber: this.invoiceNumber,
    hasInvoice: !!this.invoiceNumber
  };
});

// Pre-save: generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'orderNumber' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      this.orderNumber = counter.sequence;
      this.formattedOrderNumber = String(counter.sequence).padStart(6, '0');
    } catch (error) {
      console.error('Error generating order number:', error);
      return next(error);
    }
  }
  if (this.isModified('adminNote')) this.adminNoteUpdatedAt = new Date();
  if (this.isModified('subtotal') || this.isModified('discount')) {
    this.discountedSubtotal = Math.max(0, this.subtotal - (this.discount || 0));
  }
  next();
});

// Methods and statics

orderSchema.methods.generateInvoiceNumber = async function() {
  if (this.invoiceNumber) {
    console.log(`✅ Order ${this.formattedOrderNumber} already has invoice number: ${this.invoiceNumber}`);
    return this.invoiceNumber;
  }
  try {
    const InvoiceCounter = require('./InvoiceCounter');
    const invoiceNumber = await InvoiceCounter.generateInvoiceNumber();
    this.invoiceNumber = invoiceNumber;
    this.invoiceGenerated = true;
    this.invoiceGeneratedAt = new Date();
    await this.save();
    console.log(`✅ Generated invoice number ${invoiceNumber} for order ${this.formattedOrderNumber}`);
    return invoiceNumber;
  } catch (error) {
    console.error(`❌ Failed to generate invoice number for order ${this.formattedOrderNumber}:`, error);
    throw new Error('Failed to generate invoice number');
  }
};

orderSchema.methods.getFormattedInvoiceNumber = function() {
  if (!this.invoiceNumber) return null;
  const year = this.invoiceNumber.substring(0, 4);
  const number = this.invoiceNumber.substring(4);
  return `${year}-${number}`;
};

orderSchema.statics.findByOrderNumber = function(orderNumber) {
  if (typeof orderNumber === 'string') {
    const cleanNumber = orderNumber.replace(/[^\d]/g, '');
    if (cleanNumber.length === 6) return this.findOne({ formattedOrderNumber: cleanNumber });
    const numericOrderNumber = parseInt(cleanNumber, 10);
    if (!isNaN(numericOrderNumber)) return this.findOne({ orderNumber: numericOrderNumber });
  } else if (typeof orderNumber === 'number') {
    return this.findOne({ orderNumber: orderNumber });
  }
  return null;
};

orderSchema.statics.findByFormattedOrderNumber = function(formattedOrderNumber) {
  const cleanNumber = formattedOrderNumber.replace(/[^\d]/g, '');
  return this.findOne({ formattedOrderNumber: cleanNumber });
};

orderSchema.statics.findByInvoiceNumber = function(invoiceNumber) {
  const cleanNumber = invoiceNumber.replace(/[-\s]/g, '');
  return this.findOne({ invoiceNumber: cleanNumber });
};

orderSchema.statics.getNextOrderNumber = async function() {
  try {
    const counter = await Counter.findOne({ _id: 'orderNumber' });
    const nextNumber = counter ? counter.sequence + 1 : 1;
    return {
      orderNumber: nextNumber,
      formattedOrderNumber: String(nextNumber).padStart(6, '0'),
    };
  } catch (error) {
    console.error('Error getting next order number:', error);
    return {
      orderNumber: 1,
      formattedOrderNumber: '000001',
    };
  }
};

orderSchema.statics.getOrderNumberStats = async function() {
  const pipeline = [
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        highestOrderNumber: { $max: '$orderNumber' },
        lowestOrderNumber: { $min: '$orderNumber' },
        averageOrderNumber: { $avg: '$orderNumber' }
      }
    }
  ];
  const result = await this.aggregate(pipeline);
  const stats = result[0] || {
    totalOrders: 0,
    highestOrderNumber: 0,
    lowestOrderNumber: 0,
    averageOrderNumber: 0
  };
  const nextNumber = stats.highestOrderNumber + 1;
  stats.nextOrderNumber = nextNumber;
  stats.nextFormattedOrderNumber = String(nextNumber).padStart(6, '0');
  return stats;
};

orderSchema.post('save', function(doc) {
  if (doc.orderNumber && doc.isNew) {
    console.log(`🔢 Order number ${doc.orderNumber} (formatted: ${doc.formattedOrderNumber}) assigned to new order ${doc._id}`);
  }
  if (doc.invoiceNumber && doc.isModified('invoiceNumber')) {
    console.log(`📄 Invoice number ${doc.invoiceNumber} assigned to order ${doc.formattedOrderNumber}`);
  }
});

orderSchema.methods.canHaveAdminNote = function() {
  return this.status === 'cancelled';
};
orderSchema.methods.clearAdminNote = function() {
  this.adminNote = '';
  this.adminNoteUpdatedAt = new Date();
  return this.save();
};
orderSchema.methods.hasCoupon = function() {
  return !!(this.couponCode && this.discount > 0);
};
orderSchema.methods.getCouponSavings = function() {
  if (!this.hasCoupon()) return null;
  return {
    code: this.couponCode,
    savings: this.discount,
    originalTotal: (this.subtotal || 0) + (this.gstAmount || 0) + (this.shippingCharge || 0),
    finalTotal: this.totalAmount,
    discountPercentage: this.subtotal > 0 ? ((this.discount / this.subtotal) * 100).toFixed(1) : 0
  };
};
orderSchema.methods.getHSNCodes = function() {
  if (!this.items || !Array.isArray(this.items)) return [];
  const hsnCodes = this.items.map(item => item.hsn || '1234');
  return [...new Set(hsnCodes)];
};
orderSchema.methods.getGSTBreakdown = function() {
  if (!this.items || !Array.isArray(this.items)) {
    return { cgst: 0, sgst: 0, totalGST: this.gstAmount || 0, items: [] };
  }
  let totalCGST = 0, totalSGST = 0, totalGST = 0;
  const itemsBreakdown = this.items.map(item => {
    const gstAmount = item.totalGstAmount || item.gst * item.quantity || 0;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    totalCGST += cgst;
    totalSGST += sgst;
    totalGST += gstAmount;
    return {
      name: item.name,
      hsn: item.hsn || '1234',
      gstRate: item.gstRate || 18,
      gstAmount,
      cgst,
      sgst
    };
  });
  return {
    cgst: Math.round(totalCGST * 100) / 100,
    sgst: Math.round(totalSGST * 100) / 100,
    totalGST: Math.round(totalGST * 100) / 100,
    items: itemsBreakdown
  };
};
orderSchema.statics.findOrdersWithAdminNotes = function() {
  return this.find({ adminNote: { $exists: true, $ne: '' }}).populate('user', 'name email').populate('adminNoteUpdatedBy', 'name email');
};
orderSchema.statics.findOrdersWithCoupons = function(couponCode = null) {
  const query = { couponCode: { $exists: true, $ne: '' }, discount: { $gt: 0 } };
  if (couponCode) query.couponCode = couponCode.toUpperCase();
  return this.find(query).populate('user', 'name email').populate('couponId', 'title discountType discountValue').populate('items.product', 'name price hsn hsnCode');
};
orderSchema.statics.getCouponStats = async function(startDate = null, endDate = null) {
  const matchStage = { couponCode: { $exists: true, $ne: '' }, discount: { $gt: 0 } };
  if (startDate && endDate) matchStage.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$couponCode',
        totalUsage: { $sum: 1 },
        totalDiscount: { $sum: '$discount' },
        totalOrderValue: { $sum: '$totalAmount' },
        totalSavings: { $sum: '$discount' },
        averageDiscount: { $avg: '$discount' },
        averageOrderValue: { $avg: '$totalAmount' },
        users: { $addToSet: '$user' }
      }
    },
    { $addFields: { uniqueUsers: { $size: '$users' } }},
    { $project: { users: 0 }},
    { $sort: { totalUsage: -1 }}
  ]);
  return stats;
};
orderSchema.statics.getTotalCouponSavings = async function(startDate = null, endDate = null) {
  const matchStage = { couponCode: { $exists: true, $ne: '' }, discount: { $gt: 0 } };
  if (startDate && endDate) matchStage.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSavings: { $sum: '$discount' },
        totalOrderValue: { $sum: '$totalAmount' },
        averageDiscount: { $avg: '$discount' },
        uniqueCoupons: { $addToSet: '$couponCode' },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $addFields: {
        uniqueCouponsCount: { $size: '$uniqueCoupons' },
        uniqueUsersCount: { $size: '$uniqueUsers' }
      }
    }
  ]);
  return result[0] || {
    totalOrders: 0,
    totalSavings: 0,
    totalOrderValue: 0,
    averageDiscount: 0,
    uniqueCouponsCount: 0,
    uniqueUsersCount: 0
  };
};
orderSchema.statics.getInvoiceStats = async function() {
  const withInvoices = await this.countDocuments({ invoiceNumber: { $exists: true, $ne: null, $ne: '' } });
  const withoutInvoices = await this.countDocuments({ $or: [
    { invoiceNumber: { $exists: false } },
    { invoiceNumber: null },
    { invoiceNumber: '' }
  ] });
  const totalOrders = await this.countDocuments({});
  return {
    withInvoices,
    withoutInvoices,
    totalOrders,
    coverage: totalOrders > 0 ? ((withInvoices / totalOrders) * 100).toFixed(1) : 0
  };
};
orderSchema.statics.findByHSNCode = function(hsnCode) {
  return this.find({ 'items.hsn': hsnCode }).populate('user', 'name email').populate('items.product', 'name price hsn hsnCode');
};
orderSchema.statics.getHSNStats = async function() {
  const stats = await this.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.hsn',
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: '$items.quantity' },
        totalValue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        totalGST: { $sum: '$items.totalGstAmount' },
        averageGSTRate: { $avg: '$items.gstRate'}
      }
    },
    { $sort: { totalOrders: -1 } }
  ]);
  return stats;
};

// Final export with overwrite protection:
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
