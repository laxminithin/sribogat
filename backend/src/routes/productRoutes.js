import { Router } from 'express';
import {
  createProductWithImages,
  createProduct,
  getProductById,
  getFeaturedProducts,
  listBrands,
  getStorageInfo,
  getUploadHealth,
  listCategories,
  listProducts,
  searchProducts,
  updateProductStatus,
  updateProductStock,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js';
import { productUpload } from '../middleware/upload.js';

const router = Router();

router.get('/', optionalAuth, listProducts);
router.get('/search', optionalAuth, searchProducts);
router.get('/featured', optionalAuth, getFeaturedProducts);
router.get('/categories', listCategories);
router.get('/brands', listBrands);
router.get('/storage-info', getStorageInfo);
router.get('/upload-health', getUploadHealth);
router.get('/:id', optionalAuth, getProductById);
router.post('/', requireAuth, requireAdmin, createProduct);
router.post('/create-with-images', requireAuth, requireAdmin, productUpload.array('images', 10), createProductWithImages);
router.patch('/:id/status', requireAuth, requireAdmin, updateProductStatus);
router.patch('/:id/stock', requireAuth, requireAdmin, updateProductStock);
router.put('/:id', requireAuth, requireAdmin, productUpload.array('images', 10), updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);

export default router;
