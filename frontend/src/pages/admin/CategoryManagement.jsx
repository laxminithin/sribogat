import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, FolderPlus, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import config from '../../config/config';

const CategoryManagementModal = ({ isOpen, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState(null);

  // Get API base URL from Vite environment variables
  const API_BASE_URL = config.API_URL;
  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Real API calls with environment variable
  const categoryAPI = {
    getAll: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    },

    create: async (data) => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error creating category:', error);
        throw error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error updating category:', error);
        throw error;
      }
    },

    delete: async (id) => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
      }
    },

    addSubcategory: async (id, subcategory) => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories/${id}/subcategory`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ subcategory })
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error adding subcategory:', error);
        throw error;
      }
    },

    removeSubcategory: async (id, subcategory) => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories/${id}/subcategory`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          body: JSON.stringify({ subcategory })
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error removing subcategory:', error);
        throw error;
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const newCategory = await categoryAPI.create({
        name: newCategoryName,
        subcategories: []
      });
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setShowAddCategory(false);
      toast.success('Category created successfully');
    } catch (error) {
      toast.error('Failed to create category');
      console.error(error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const updated = await categoryAPI.update(editingCategory._id, editingCategory);
      setCategories(categories.map(cat => 
        cat._id === editingCategory._id ? updated : cat
      ));
      setEditingCategory(null);
      toast.success('Category updated successfully');
    } catch (error) {
      toast.error('Failed to update category');
      console.error(error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await categoryAPI.delete(categoryId);
      setCategories(categories.filter(cat => cat._id !== categoryId));
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('Failed to delete category');
      console.error(error);
    }
  };

  const handleAddSubcategory = async (categoryId) => {
    if (!newSubcategory.trim()) {
      toast.error('Subcategory name is required');
      return;
    }

    try {
      await categoryAPI.addSubcategory(categoryId, newSubcategory);
      setCategories(categories.map(cat => 
        cat._id === categoryId 
          ? { ...cat, subcategories: [...cat.subcategories, newSubcategory] }
          : cat
      ));
      setNewSubcategory('');
      setAddingSubcategoryTo(null);
      toast.success('Subcategory added successfully');
    } catch (error) {
      toast.error('Failed to add subcategory');
      console.error(error);
    }
  };

  const handleRemoveSubcategory = async (categoryId, subcategory) => {
    if (!window.confirm('Are you sure you want to remove this subcategory?')) return;

    try {
      await categoryAPI.removeSubcategory(categoryId, subcategory);
      setCategories(categories.map(cat => 
        cat._id === categoryId 
          ? { ...cat, subcategories: cat.subcategories.filter(sub => sub !== subcategory) }
          : cat
      ));
      toast.success('Subcategory removed successfully');
    } catch (error) {
      toast.error('Failed to remove subcategory');
      console.error(error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Category Management
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Add Category Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-xl hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <FolderPlus className="w-4 h-4" />
            Add New Category
          </button>
        </div>

        {/* Add Category Form */}
        {showAddCategory && (
          <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <button
                onClick={handleCreateCategory}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Categories List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-200 border-t-amber-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3">
                  {editingCategory && editingCategory._id === category._id ? (
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory()}
                      />
                      <button
                        onClick={handleUpdateCategory}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <FolderPlus className="w-5 h-5 text-amber-600" />
                        {category.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category._id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAddingSubcategoryTo(category._id)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Add Subcategory"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Add Subcategory Form */}
                {addingSubcategoryTo === category._id && (
                  <div className="bg-white rounded-lg p-3 mb-3 border border-gray-300">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Subcategory name"
                        value={newSubcategory}
                        onChange={(e) => setNewSubcategory(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory(category._id)}
                      />
                      <button
                        onClick={() => handleAddSubcategory(category._id)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingSubcategoryTo(null);
                          setNewSubcategory('');
                        }}
                        className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Subcategories */}
                <div className="space-y-2">
                  {category.subcategories && category.subcategories.length > 0 ? (
                    category.subcategories.map((subcategory, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">{subcategory}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveSubcategory(category._id, subcategory)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm italic pl-6">No subcategories yet</p>
                  )}
                </div>
              </div>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-8">
                <FolderPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No categories found</h3>
                <p className="text-gray-500">Start by adding your first category</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagementModal;
