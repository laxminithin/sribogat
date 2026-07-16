const mongoose = require('mongoose');

const razorpayTransactionSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true
    },
    razorpayPaymentId: {
        type: String,
        sparse: true
    },
    razorpaySignature: {
        type: String,
        sparse: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
        default: 'created'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    refundId: String,
    refundStatus: String,
    refundAmount: Number,
    errorCode: String,
    errorDescription: String,
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

// Indexes for better query performance
razorpayTransactionSchema.index({ orderId: 1 });
razorpayTransactionSchema.index({ userId: 1 });
razorpayTransactionSchema.index({ razorpayOrderId: 1 });
razorpayTransactionSchema.index({ razorpayPaymentId: 1 });
razorpayTransactionSchema.index({ status: 1 });
razorpayTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RazorpayTransaction', razorpayTransactionSchema); 