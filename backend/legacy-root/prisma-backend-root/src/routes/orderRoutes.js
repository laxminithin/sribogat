const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth, admin } = require('../middleware/auth');

// ========================================
// NON-PARAMETERIZED ROUTES (MUST COME FIRST)
// ========================================

// User routes (no params)
router.post('/', auth, orderController.createOrder);
router.get('/my-orders', auth, orderController.getUserOrders);

// Admin routes (no params)
router.get('/admin/all', [auth, admin], orderController.getAllOrders);
router.get('/admin/stats', [auth, admin], orderController.getOrderStats);
router.get('/admin/export', [auth, admin], orderController.exportOrders);
router.get('/admin/date-range', [auth, admin], orderController.getOrdersByDateRange);

// Get next available order number (admin only)

// Get order number statistics (admin only) 
router.get('/admin/number-stats', [auth, admin], orderController.getOrderNumberStats);

// Razorpay routes (no params)
router.post('/razorpay/create', auth, orderController.createRazorpayOrder);
router.post('/razorpay/verify', auth, orderController.verifyPayment);

// Transaction routes (no params)
router.get('/transactions', [auth, admin], orderController.getAllTransactions);
router.get('/transactions/stats', [auth, admin], orderController.getTransactionStats);

// ========================================
// SPECIFIC PARAMETERIZED ROUTES (BEFORE GENERIC :id)
// ========================================

// Transaction specific routes
router.get('/transactions/:transactionId', auth, orderController.getTransactionDetails);
router.post('/transactions/:orderId/refund', [auth, admin], orderController.processRefund);

// Invoice route (specific pattern)
router.get('/:orderId/download-invoice', auth, orderController.downloadInvoice);

// Find order by any number format (user/admin)
router.get('/number/:orderNumber', auth, orderController.findOrderByNumber);

//get next order number
router.get('/next-order-number', auth, orderController.getNextOrderNumber);


// ========================================
// ADMIN NOTE ROUTES (FOR ALL ORDERS)
// ========================================

// Admin note routes - Updated to work with all orders
router.patch('/:id/admin-note', [auth, admin], orderController.updateAdminNote);
router.get('/:id/admin-note', [auth, admin], orderController.getAdminNoteHistory);

// ========================================
// OTHER PARAMETERIZED ROUTES (MUST COME LAST)
// ========================================

// Edit shipping address route
router.patch('/:id/address', auth, orderController.editOrderAddress);

// Get orders by id (for invoice generation and order details)
router.get('/:orderId', auth, orderController.getOrderById);

// Generic order operations
router.get('/:id', auth, orderController.getOrder);
router.post('/:id/cancel', auth, orderController.cancelOrder);
router.patch('/:id/status', [auth, admin], orderController.updateOrderStatus);
router.patch('/:id/payment', [auth, admin], orderController.updatePaymentStatus);

module.exports = router;