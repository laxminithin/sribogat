import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, X, Filter, Grid, List, Eye, Package, TrendingUp, AlertCircle, CheckCircle, Slash, Circle, FolderPlus, Image, ImageIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import ProductForm from '../../components/ProductForm';
import CategoryManagementModal from './CategoryManagement';
import { toast } from 'react-hot-toast';
import { productsApi } from '../../services/api';
import config, { resolveImageUrl } from '../../config/config';
import { getPriceData } from '../../utils/pricing';

const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedProductImages, setSelectedProductImages] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Inline SVG data URI: always loads, can never 404 or trigger an onError loop.
  const FALLBACK_IMG =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">' +
        '<rect width="100%" height="100%" fill="#f3f4f6"/>' +
        '<text x="50%" y="50%" fill="#9ca3af" font-family="sans-serif" font-size="16" ' +
        'text-anchor="middle" dominant-baseline="middle">No Image</text></svg>'
    );

  // Clear onerror before swapping so a failing fallback can't re-fire → flicker.
  const setFallback = (e) => {
    e.target.onerror = null;
    e.target.src = FALLBACK_IMG;
  };

  const getProductImage = (imagePath) => {
    return resolveImageUrl(imagePath, FALLBACK_IMG);
  };

  const getProductImages = (product) => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images.map(img => getProductImage(img));
    }
    if (product.image) {
      return [getProductImage(product.image)];
    }
    return [FALLBACK_IMG];
  };

  const debugProductImages = () => {
    console.log('=== PRODUCTS MANAGEMENT IMAGES DEBUG ===');
    products.slice(0, 3).forEach((product, index) => {
      const processedImages = getProductImages(product);
      console.log(`Product ${index + 1}: ${product.name}`);
      console.log('- Raw images array:', product.images);
      console.log('- Raw single image:', product.image);
      console.log('- Processed images:', processedImages);
      console.log('- First processed image:', processedImages[0]);
    });
    console.log('=== END DEBUG ===');
  };

  const handleShowImages = (product) => {
    const images = getProductImages(product);
    setSelectedProductImages({
      product: product,
      images: images
    });
    setCurrentImageIndex(0);
    setShowImageModal(true);
  };

  const nextImage = () => {
    if (selectedProductImages && selectedProductImages.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === selectedProductImages.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedProductImages && selectedProductImages.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedProductImages.images.length - 1 : prev - 1
      );
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productsApi.getAllProducts();
      
      if (!Array.isArray(productsData)) {
        console.warn('Products data is not an array:', productsData);
        setProducts([]);
        setError('Invalid products data received');
        return;
      }
      
      setProducts(productsData);
      setError(null);
      
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.message);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch(`${config.API_URL}/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const categoriesData = await response.json();
      
      if (!Array.isArray(categoriesData)) {
        console.warn('Categories data is not an array:', categoriesData);
        setCategories([]);
        return;
      }
      
      setCategories(categoriesData);
      
    } catch (err) {
      console.error('Error loading categories:', err);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) {
      return [];
    }
    
    let filtered = products;
    
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product?.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(product => 
        product?.category?.toLowerCase() === filterCategory.toLowerCase()
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(product =>
        (product.status || 'active').toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'price':
          return (a.price || 0) - (b.price || 0);
        case 'stock':
          return (a.stock || 0) - (b.stock || 0);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [searchQuery, products, filterCategory, statusFilter, sortBy]);

const handleAddProduct = async (productData) => {
  try {
    console.log('🔍 ProductsManagement: Product creation completed by ProductForm');
    
    // ✅ ProductForm already handled the API call successfully
    // We just need to reload the products and close the modal
    await loadProducts();
    toast.success('Product added successfully!');
    setShowAddModal(false);
    
  } catch (err) {
    console.error('❌ ProductsManagement: Error after product creation:', err);
    // Don't show error toast here since ProductForm handles that
  }
};

const handleEditProduct = async (productData) => {
  try {
    console.log('🔍 ProductsManagement: Product update completed by ProductForm');
    
    // ✅ ProductForm already handled the API call successfully
    // We just need to reload the products and close the modal
    await loadProducts();
    toast.success('Product updated successfully!');
    setEditingProduct(null);
    
  } catch (err) {
    console.error('❌ ProductsManagement: Error after product update:', err);
    // Don't show error toast here since ProductForm handles that
  }
};

  const handleToggleProductStatus = async (productId, newStatus) => {
    if (!productId) return toast.error('Invalid product ID');

    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    if (window.confirm(`Are you sure you want to ${action} this product?`)) {
      try {
        await productsApi.updateStatus(productId, newStatus);
        toast.success(`Product marked as ${newStatus}`);
        await loadProducts();
      } catch (err) {
        console.error(`Error changing product status:`, err);
        toast.error(err.response?.data?.error || `Failed to ${action} product`);
      }
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!productId) return toast.error('Invalid product ID');

    const confirm = window.confirm('Are you sure you want to delete this product?');
    if (!confirm) return;

    try {
      await productsApi.deleteProduct(productId);
      toast.success('Product deleted successfully');
      await loadProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { status: 'out', color: 'text-red-600 bg-red-100', icon: AlertCircle };
    if (stock < 10) return { status: 'low', color: 'text-yellow-600 bg-yellow-100', icon: AlertCircle };
    return { status: 'good', color: 'text-amber-600 bg-amber-100', icon: CheckCircle };
  };

  const uniqueCategories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats;
  }, [products]);

  const handleCategoriesUpdated = () => {
    loadCategories();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600"></div>
            <Package className="absolute inset-0 m-auto w-6 h-6 text-amber-600 animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-red-600 mb-4">{error}</p>
            <button 
              onClick={loadProducts}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="p-6 space-y-8">
     
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Products Management
            </h1>
            <p className="text-gray-600 mt-2">Manage your product inventory with ease</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <FolderPlus className="w-5 h-5" />
              Manage Categories
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { 
              title: 'Total Products', 
              value: products.length, 
              icon: Package, 
              color: 'from-amber-400 to-amber-600',
              change: '+12%'
            },
            { 
              title: 'Low Stock', 
              value: products.filter(p => p.stock < 10).length, 
              icon: AlertCircle, 
              color: 'from-yellow-400 to-orange-500',
              change: '-5%'
            },
            { 
              title: 'Categories', 
              value: uniqueCategories.length, 
              icon: Grid, 
              color: 'from-orange-400 to-orange-600',
              change: '+2%'
            },
            { 
              title: 'Out of Stock', 
              value: products.filter(p => p.stock === 0).length, 
              icon: TrendingUp, 
              color: 'from-red-400 to-red-600',
              change: '-8%'
            }
          ].map((stat, index) => (
            <div 
              key={index}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl p-6 transform hover:scale-105 transition-all duration-300 border border-amber-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2 text-gray-800">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-amber-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-gray-400 text-sm ml-1">vs last month</span>
                  </div>
                </div>
                <div className={`bg-gradient-to-r ${stat.color} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-100">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>
                    {category === 'vegetables' ? 'Bogat Products' : category}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
                <option value="stock">Sort by Stock</option>
                <option value="category">Sort by Category</option>
              </select>

              <div className="flex items-center bg-amber-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'table' 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-amber-200'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-amber-200'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Display */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-amber-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Images
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Stock Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-12 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product, index) => {
                    const stockStatus = getStockStatus(product.stock);
                    const productImages = getProductImages(product);
                    return (
                      <tr 
                        key={product._id || product.id} 
                        className="hover:bg-amber-50 transition-all duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="relative group">
                             <img
  src={productImages[0]}
  alt={product.name}
  className="w-12 h-12 rounded-xl object-cover shadow-md group-hover:scale-110 transition-transform duration-200"
  onError={setFallback}
/>


                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900">
                                {product.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="flex -space-x-2">
                              {productImages.slice(0, 3).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`${product.name} ${idx + 1}`}
                                  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                                  onError={setFallback}
                                />
                              ))}
                            </div>
                            {productImages.length > 3 && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                +{productImages.length - 3}
                              </span>
                            )}
                            <button
                              onClick={() => handleShowImages(product)}
                              className="p-1 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-all duration-200"
                              title="View all images"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">₹{getPriceData(product).totalPrice.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">incl. GST · base ₹{Number(product.price).toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                              <stockStatus.icon className="w-3 h-3 mr-1" />
                              {product.stock}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${product.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' : 'bg-amber-100 text-amber-700'}`}>
                            {product.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-all duration-200"
                              title="Edit Product"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product._id || product.id)}
                              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-lg transition-all duration-200"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {(product.status || 'active') === 'active' ? (
                              <button
                                onClick={() => handleToggleProductStatus(product._id, 'inactive')}
                                className="p-2 text-yellow-600 hover:text-yellow-900 hover:bg-yellow-100 rounded-lg transition-all duration-200"
                                title="Mark as Inactive"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleProductStatus(product._id, 'active')}
                                className="p-2 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-all duration-200"
                                title="Mark as Active"
                              >
                                <Circle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => {
              const stockStatus = getStockStatus(product.stock);
              const productImages = getProductImages(product);
              return (
                <div 
                  key={product._id || product.id}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-xl p-6 transform hover:scale-105 transition-all duration-300 border border-amber-100"
                >
                  <div className="relative mb-4">
                    <img
                      src={productImages[0]}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-xl"
                      onError={setFallback}
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        <stockStatus.icon className="w-3 h-3 mr-1" />
                        {product.stock}
                      </span>
                    </div>
                    {productImages.length > 1 && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-black bg-opacity-60 text-white">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          {productImages.length}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 rounded-xl transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleShowImages(product)}
                        className="bg-white bg-opacity-90 text-gray-800 px-3 py-2 rounded-lg font-medium flex items-center space-x-2 transform scale-95 hover:scale-100 transition-transform"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Images</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.category}</p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-amber-600">₹{getPriceData(product).totalPrice.toFixed(2)}</span>
                      <span className="text-sm text-gray-500">incl. GST · per {product.unit}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-all duration-200"
                          title="Edit Product"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id || product.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-lg transition-all duration-200"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {(product.status || 'active') === 'active' ? (
                        <button
                          onClick={() => handleToggleProductStatus(product._id, 'inactive')}
                          className="p-2 text-yellow-600 hover:text-yellow-900 hover:bg-yellow-100 rounded-lg transition-all duration-200"
                          title="Mark as Inactive"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleProductStatus(product._id, 'active')}
                          className="p-2 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-all duration-200"
                          title="Mark as Active"
                        >
                          <Circle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Image Viewer Modal */}
        {showImageModal && selectedProductImages && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="relative bg-white rounded-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedProductImages.product.name}
                  </h2>
                  <p className="text-gray-600">
                    {currentImageIndex + 1} of {selectedProductImages.images.length} images
                  </p>
                </div>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative bg-gray-100">
                <img
                  src={selectedProductImages.images[currentImageIndex]}
                  alt={`${selectedProductImages.product.name} ${currentImageIndex + 1}`}
                  className="w-full h-96 object-contain"
                  onError={setFallback}
                />
                
                {selectedProductImages.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 p-3 rounded-full shadow-lg transition-all duration-200"
                    >
                      <ArrowLeft className="w-6 h-6 text-gray-800" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 p-3 rounded-full shadow-lg transition-all duration-200"
                    >
                      <ArrowRight className="w-6 h-6 text-gray-800" />
                    </button>
                  </>
                )}
              </div>

              {selectedProductImages.images.length > 1 && (
                <div className="p-6">
                  <div className="flex space-x-2 overflow-x-auto">
                    {selectedProductImages.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          currentImageIndex === index ? 'border-amber-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={setFallback}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Product Modal */}
        {(showAddModal || editingProduct) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <ProductForm
                initialData={editingProduct}
                onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
                categories={categories}
                categoriesLoading={categoriesLoading}
              />
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {showCategoryModal && (
          <CategoryManagementModal
            isOpen={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
            onCategoriesUpdated={handleCategoriesUpdated}
          />
        )}
      </div>
    </div>
  );
};

export default ProductsManagement;
