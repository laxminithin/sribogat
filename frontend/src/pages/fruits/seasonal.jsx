import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter, Search, ChevronDown, Heart, ShoppingCart, Sparkles
} from 'lucide-react';
import { useCart } from '../checkout/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { categories } from '../../data/products';
import { usersApi, productsApi } from '../../services/api';

const SeasonalFruits = ({ showAll = false }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wishlist, setWishlist] = useState(new Set());

  const { dispatch } = useCart();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    window.scrollTo({ top: 0 });
    loadProducts();
    loadWishlist();
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productsApi.getAllProducts();
      let allProducts = Array.isArray(data) ? data : [];

      if (!showAll) {
        allProducts = allProducts.filter(
          p =>
            p?.subcategory?.toLowerCase() === 'seasonal fruits' &&
            p?.category?.toLowerCase() === 'fruits' &&
            p?.status === 'active'
        );
      }

      setProducts(allProducts);
    } catch (err) {
      setError(err.message);
      setProducts([]);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    try {
      const wishlistItems = await usersApi.getWishlist();
      const ids = wishlistItems.map(item => item._id || item.id);
      setWishlist(new Set(ids));
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    let filtered = [...products];

    if (showAll) {
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(product =>
          product?.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }

      if (searchQuery) {
        filtered = filtered.filter(product =>
          product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });
  }, [selectedCategory, searchQuery, sortBy, products, showAll]);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(cat => ({
      value: cat.name.toLowerCase(),
      label: cat.name
    }))
  ];

  const handleAddToCart = (product) => {
    if (!product) return;
    dispatch({ type: 'ADD_TO_CART', payload: product });
    toast.success(`Added ${product.name} to cart!`);
  };

  const toggleWishlist = async (productId) => {
    if (!productId) return;

    try {
      const newWishlist = new Set(wishlist);
      if (newWishlist.has(productId)) {
        await usersApi.removeFromWishlist(productId);
        newWishlist.delete(productId);
        toast.success('Removed from wishlist');
      } else {
        await usersApi.addToWishlist(productId);
        newWishlist.add(productId);
        toast.success('Added to wishlist');
      }
      setWishlist(newWishlist);
    } catch (error) {
      console.error('Wishlist error:', error);
      toast.error('Failed to update wishlist');
    }
  };

  const handleRetry = () => {
    loadProducts();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-center p-8">
        <div>
          <p className="text-red-600 font-semibold text-lg mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {showAll ? 'Our Products' : 'Seasonal Fruits'}
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              🍓 Fresh from the farm to your table
            </p>
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <Sparkles className="text-green-500 mr-2" />
            <span className="text-gray-700">
              Showing {filteredProducts.length} fresh products
            </span>
          </div>
        </div>

        {/* Filters */}
        {showAll && (
          <div className="bg-white rounded-xl p-4 shadow-md mb-8 flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search products..."
              className="flex-1 px-4 py-2 border border-green-200 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="px-4 py-2 border border-green-200 rounded-lg"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categoryOptions.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-green-200 rounded-lg"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">✨ Featured</option>
              <option value="price-low">💰 Price: Low to High</option>
              <option value="price-high">💎 Price: High to Low</option>
              <option value="rating">⭐ Top Rated</option>
            </select>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map(product => (
              <div
                key={product._id}
                className="bg-white rounded-xl shadow-lg p-4 relative group flex flex-col"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />

                <button
                  onClick={() => toggleWishlist(product._id)}
                  className="absolute top-3 right-3 bg-white p-2 rounded-full shadow"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      wishlist.has(product._id) ? 'text-red-500 fill-current' : 'text-gray-400'
                    }`}
                  />
                </button>

                <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
                <p className="text-gray-600 text-sm capitalize">{product.category}</p>

                <div className="mt-auto pt-4 flex justify-between items-center">
                  <div className="text-xl font-bold text-green-700">
                    ₹{product.price}
                    <span className="text-sm text-gray-500">/{product.unit}</span>
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                  >
                    <ShoppingCart className="inline w-4 h-4 mr-1" />
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto border border-green-100">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
              <p className="text-gray-600">
                Try adjusting your search or filter criteria to find fresh products.
              </p>
            </div>
          </div>
        )}

        {/* See All Button */}
        {!showAll && (
          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/products')}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg"
            >
              See All Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeasonalFruits;
