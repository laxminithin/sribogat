import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ChevronDown, Heart, ShoppingCart, Sparkles, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCart } from '../checkout/CartContext';
import { useAuth } from '../checkout/AuthProvider';
import { usersApi, productsApi } from '../../services/api';
import { categories } from '../../data/products';

const OrganicVegetables = ({ showAll = false }) => {
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');

  const auth = useAuth();
  const isAuthenticated = auth?.user && !auth?.loading;
  const navigate = useNavigate();
  const { dispatch } = useCart();

  useEffect(() => {
    loadProducts();
    if (isAuthenticated) loadWishlist();
  }, [isAuthenticated]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const all = await productsApi.getAllProducts();
      let filtered = Array.isArray(all) ? all : [];

      filtered = filtered.filter(product =>
        product?.category?.toLowerCase() === 'organic vegetables' &&
        product?.status === 'active'
      );

      setProducts(filtered);
    } catch (err) {
      setError(err.message);
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

  const getProductStatus = (product) => {
    if (product.status === 'inactive') return { type: 'unavailable' };
    if (product.stock === 0) return { type: 'out-of-stock' };
    return { type: 'available' };
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (showAll) {
      if (selectedCategory !== 'all') {
        result = result.filter(p => p.category?.toLowerCase() === selectedCategory);
      }
      if (searchQuery) {
        result = result.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      }
    }

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'rating': return b.rating - a.rating;
        default: return 0;
      }
    });
  }, [products, searchQuery, selectedCategory, sortBy, showAll]);

  const toggleWishlist = async (productId) => {
    if (!isAuthenticated) return navigate('/login');

    const updated = new Set(wishlist);
    try {
      if (updated.has(productId)) {
        await usersApi.removeFromWishlist(productId);
        updated.delete(productId);
        toast.success('Removed from wishlist');
      } else {
        await usersApi.addToWishlist(productId);
        updated.add(productId);
        toast.success('Added to wishlist');
      }
      setWishlist(updated);
    } catch {
      toast.error('Wishlist update failed');
    }
  };

  const handleAddToCart = (product) => {
    const status = getProductStatus(product);
    if (!isAuthenticated) return navigate('/login');
    if (status.type !== 'available') return toast.error('Item unavailable');

    dispatch({ type: 'ADD_TO_CART', payload: product });
    toast.success(`Added ${product.name} to cart`);
  };

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(cat => ({ value: cat.name.toLowerCase(), label: cat.name }))
  ];

  if (loading) {
    return (
      <div className="text-center p-20">
        <Sparkles className="animate-spin text-green-600 w-10 h-10 mx-auto" />
        <p className="text-green-600 mt-4">Loading organic vegetables...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-20 text-red-500">
        <p>⚠️ {error}</p>
        <button onClick={loadProducts} className="mt-4 text-green-600 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-green-600 mb-6">
        Organic Vegetables
      </h1>

      {showAll && (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <input
            className="border border-green-200 rounded-xl px-4 py-2"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            className="border border-green-200 rounded-xl px-4 py-2"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            {categoryOptions.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select
            className="border border-green-200 rounded-xl px-4 py-2"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="featured">✨ Featured</option>
            <option value="price-low">💰 Price Low to High</option>
            <option value="price-high">💸 Price High to Low</option>
            <option value="rating">⭐ Rating</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map(product => {
          const status = getProductStatus(product);
          const unavailable = status.type !== 'available';
          return (
            <div
              key={product._id}
              className={`relative border border-green-100 rounded-xl shadow-md p-4 bg-white flex flex-col justify-between hover:shadow-lg transition ${
                unavailable ? 'opacity-70' : ''
              }`}
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-contain mb-4"
              />

              <div>
                <h2 className="text-lg font-semibold text-gray-800">{product.name}</h2>
                <p className="text-sm text-gray-500">{product.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-green-700 font-bold text-lg">
                  ₹{product.price}
                  <span className="text-sm font-normal text-gray-500"> / {product.unit}</span>
                </div>

                {unavailable ? (
                  <span className="text-sm text-red-500">Unavailable</span>
                ) : (
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="bg-green-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-600"
                  >
                    <ShoppingCart className="inline w-4 h-4 mr-1" />
                    Add
                  </button>
                )}
              </div>

              <button
                onClick={() => toggleWishlist(product._id)}
                className="absolute top-4 right-4"
              >
                <Heart
                  className={`w-5 h-5 ${
                    wishlist.has(product._id)
                      ? 'text-red-500 fill-current'
                      : 'text-gray-400 hover:text-red-500'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <p className="text-center text-gray-500 mt-10">
          No organic vegetables found.
        </p>
      )}
    </div>
  );
};

export default OrganicVegetables;
