import { Router } from 'express';
import {
  addSubcategory,
  createCategory,
  deleteCategory,
  listCategories,
  removeSubcategory,
  updateCategory,
} from '../controllers/categoryController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', listCategories);
router.post('/', requireAuth, requireAdmin, createCategory);
router.put('/:id', requireAuth, requireAdmin, updateCategory);
router.delete('/:id', requireAuth, requireAdmin, deleteCategory);
router.post('/:id/subcategory', requireAuth, requireAdmin, addSubcategory);
router.delete('/:id/subcategory', requireAuth, requireAdmin, removeSubcategory);

export default router;
