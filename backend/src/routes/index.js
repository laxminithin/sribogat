import { Router } from 'express';
import analyticsRoutes from './analyticsRoutes.js';
import contentRoutes from './contentRoutes.js';
import authRoutes from './authRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import healthRoutes from './healthRoutes.js';
import orderRoutes from './orderRoutes.js';
import productRoutes from './productRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/users', userRoutes);
router.use('/api/categories', categoryRoutes);
router.use('/api/products', productRoutes);
router.use('/api/orders', orderRoutes);
router.use('/api', contentRoutes);

export default router;
