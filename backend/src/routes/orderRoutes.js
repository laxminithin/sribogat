import { Router } from 'express';
import {
  bulkUpdateAdminNotes,
  createOrder,
  exportOrders,
  getAdminNote,
  getAdminOrderStats,
  getOrderById,
  getOrdersByDateRange,
  listMyOrders,
  listAdminOrders,
  nextOrderNumber,
  updateAdminNote,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { capturePaypalOrder, createPaypalOrder } from '../controllers/paypalController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

// PayPal prepaid flow (scaffold — see paypalController.js).
router.post('/paypal/create', requireAuth, createPaypalOrder);
router.post('/paypal/capture', requireAuth, capturePaypalOrder);

router.get('/admin/all', requireAuth, requireAdmin, listAdminOrders);
router.get('/admin/stats', requireAuth, requireAdmin, getAdminOrderStats);
router.get('/admin/export', requireAuth, requireAdmin, exportOrders);
router.get('/date-range', requireAuth, requireAdmin, getOrdersByDateRange);
router.get('/my-orders', requireAuth, listMyOrders);
router.get('/next-order-number', requireAuth, nextOrderNumber);
router.get('/:id/admin-note', requireAuth, requireAdmin, getAdminNote);
router.get('/:id', requireAuth, getOrderById);
router.post('/', requireAuth, createOrder);
router.patch('/bulk-admin-notes', requireAuth, requireAdmin, bulkUpdateAdminNotes);
router.patch('/:id/status', requireAuth, requireAdmin, updateOrderStatus);
router.patch('/:id/admin-note', requireAuth, requireAdmin, updateAdminNote);

export default router;
