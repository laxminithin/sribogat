const Category = require('../models/Category');

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single category by ID
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    
    if (!deletedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add subcategory to category
exports.addSubcategory = async (req, res) => {
  try {
    const { subcategory } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (category.subcategories.includes(subcategory)) {
      return res.status(400).json({ error: 'Subcategory already exists' });
    }
    
    category.subcategories.push(subcategory);
    await category.save();
    
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Remove subcategory from category
exports.removeSubcategory = async (req, res) => {
  try {
    const { subcategory } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const index = category.subcategories.indexOf(subcategory);
    if (index === -1) {
      return res.status(400).json({ error: 'Subcategory not found' });
    }
    
    category.subcategories.splice(index, 1);
    await category.save();
    
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};