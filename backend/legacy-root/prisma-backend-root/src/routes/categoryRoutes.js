const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Get all categories
router.get('/', categoryController.getCategories);

// Get single category by ID
router.get('/:id', categoryController.getCategory);

// Create new category
router.post('/', categoryController.createCategory);

// Update category
router.put('/:id', categoryController.updateCategory);

// Delete category
router.delete('/:id', categoryController.deleteCategory);

// Add subcategory to category
router.post('/:id/subcategory', categoryController.addSubcategory);

// Remove subcategory from category
router.delete('/:id/subcategory', categoryController.removeSubcategory);

module.exports = router;