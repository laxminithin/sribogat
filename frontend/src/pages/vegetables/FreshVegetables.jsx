import React, { useState, useEffect } from 'react';
import {
  Heart, Star, ShoppingCart, Sparkles, Lock, Package, TrendingUp, Eye, ArrowRight
} from 'lucide-react';
import { useCart } from "../checkout/CartContext";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../checkout/AuthProvider';
import { toast } from 'react-hot-toast';
import { usersApi, productsApi } from '../../services/api';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../config/config';
import { getPriceData } from '../../utils/pricing';
import ProductReviewSection from './Feedback/ProductReviewSection';

const BogatProducts = () => {
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth context
  const auth = useAuth();
  const isAuthenticated = auth?.user && !auth?.loading;

  const navigate = useNavigate();
  const { dispatch } = useCart();

  // Helper function to get the first image from the images array
  const getProductImage = (product) => {
    if (!product) {
      return FALLBACK_IMAGE;
    }

    let imageUrl = null;

    // First try the images array
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      imageUrl = product.images[0];
    } 
    // Fallback to the single image field
    else if (product.image) {
      imageUrl = product.image;
    }

    // If no image found, return placeholder
    if (!imageUrl) {
      return FALLBACK_IMAGE;
    }

    return resolveImageUrl(imageUrl);
  };

  // Enhanced debugging with file system check
  const debugProducts = () => {
    console.log('=== PRODUCTS & PRICING DEBUG ===');
    products.slice(0, 3).forEach((product, index) => {
      const processedUrl = getProductImage(product);
      const priceData = getPriceData(product);
      console.log(`Product ${index + 1}:`, {
        name: product.name,
        'database price': product.price,
        'database gstRate': product.gstRate,
        'database gstAmount': product.gstAmount,
        'database totalPrice': product.totalPrice,
        'processed price data': priceData,
        'images array': product.images,
        'images length': product.images?.length,
        'first image from array': product.images?.[0],
        'single image field': product.image,
        'final processed URL': processedUrl
      });
    });
    console.log('=== END DEBUG ===');
  };

  // Memoized function to cache product images
  const memoizedGetProductImage = React.useMemo(() => {
    const cache = new Map();
    return (product) => {
      const productId = product?._id || product?.id;
      if (!productId) return getProductImage(product);
      
      if (cache.has(productId)) {
        return cache.get(productId);
      }
      
      const result = getProductImage(product);
      cache.set(productId, result);
      return result;
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    window.scrollTo({ top: 0 });
    
    loadProducts();
    
    // Only load wishlist if user is authenticated
    if (isAuthenticated) {
      loadWishlist();
    }

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, [isAuthenticated]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching products with pricing from /api/products...');
      
      // Fetch products from database via API (should include price, gstRate, gstAmount, totalPrice)
      const data = await productsApi.getAllProducts();
      console.log('Raw API response:', data);
      
      // Handle different response structures
      let allProducts = [];
      
      if (Array.isArray(data)) {
        // Direct array of products
        allProducts = data;
      } else if (data && data.products && Array.isArray(data.products)) {
        // Response with products property
        allProducts = data.products;
      } else if (data && data.data && Array.isArray(data.data)) {
        // Response with data property
        allProducts = data.data;
      } else if (data && data.success && data.data && Array.isArray(data.data)) {
        // Response with success flag and data
        allProducts = data.data;
      } else if (data && typeof data === 'object') {
        // If it's an object but not in expected format, try to extract products
        const possibleArrays = Object.values(data).filter(Array.isArray);
        if (possibleArrays.length > 0) {
          allProducts = possibleArrays[0];
        }
      }

      console.log('Extracted products array:', allProducts);
      console.log('Number of products found:', allProducts.length);

      // Filter for active products only and validate pricing data
      const activeProducts = allProducts.filter(product => {
        // Ensure product has required fields
        const hasRequiredFields = product && 
                                 (product._id || product.id) && 
                                 product.name;
        
        // Check if product is active (default to active if no status field)
        const isActive = !product.status || product.status === 'active';
        
        // Validate pricing data
        const hasValidPricing = product.price !== undefined && product.price !== null;
        
        if (hasRequiredFields && isActive && hasValidPricing) {
          console.log('Valid product found:', {
            id: product._id || product.id,
            name: product.name,
            basePrice: product.price,
            gstRate: product.gstRate,
            gstAmount: product.gstAmount,
            totalPrice: product.totalPrice,
            status: product.status,
            stock: product.stock,
            images: product.images?.length || 0,
            image: product.image ? 'present' : 'missing'
          });
        } else if (!hasValidPricing) {
          console.warn('Product missing pricing data:', {
            id: product._id || product.id,
            name: product.name,
            price: product.price
          });
        }
        
        return hasRequiredFields && isActive && hasValidPricing;
      });

      console.log('Filtered active products with valid pricing:', activeProducts.length);
      setProducts(activeProducts);
      
      if (activeProducts.length === 0) {
        console.warn('No active products with valid pricing found. Check your database and API endpoint.');
      }
      
      // Debug first few products
      if (activeProducts.length > 0) {
        debugProducts();
      }
      
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.message || 'Failed to load products');
      setProducts([]);
      setTimeout(() => toast.error('Failed to load products from database'), 0);
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

  // Check product availability
  const getProductStatus = (product) => {
    if (product?.status === 'inactive') {
      return { type: 'unavailable', message: 'Product is unavailable' };
    }
    if ((product?.stock || 0) < 1) {
      return { type: 'out-of-stock', message: 'Out of stock' };
    }
    return { type: 'available', message: 'Available' };
  };

  // Updated to navigate to product detail instead of adding to cart
  const handleViewProduct = (e, product) => {
    e.stopPropagation(); // Prevent card click navigation
    
    if (!product) return;
    
    const productId = product._id || product.id;
    console.log('🔄 Navigating to product detail:', productId);
    
    if (!productId) {
      console.error('❌ Product ID is missing!');
      toast.error('Product ID is missing');
      return;
    }
    
    // Navigate to product detail page
    navigate(`/products/${productId}`);
    console.log('✅ Navigation triggered to:', `/products/${productId}`);
  };

  const toggleWishlist = async (e, productId) => {
    e.stopPropagation(); // Prevent navigation to product detail
    
    if (!productId) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist');
      navigate('/login');
      return;
    }

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

  // Show login prompt for restricted actions
  const showLoginPrompt = (e) => {
    e.stopPropagation(); // Prevent navigation to product detail
    toast.error('Please login to continue');
    navigate('/login');
  };

  // Navigate to product detail page without forcing login.
  const navigateToProduct = (productId) => {
    console.log('🔄 Card clicked - Navigating to product:', productId);
    
    if (!productId) {
      console.error('❌ Product ID is missing!');
      toast.error('Product ID is missing');
      return;
    }
    
    console.log('🔄 URL will be:', `/products/${productId}`);
    navigate(`/products/${productId}`);
    console.log('✅ Card navigation triggered');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-200 via-orange-50 to-yellow-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent absolute top-0 left-0"></div>
              <Package className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-700 w-6 h-6 animate-pulse" />
            </div>
          </div>
          <p className="text-center text-amber-700 mt-4 font-medium">Loading products with pricing from database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-200 via-orange-50 to-yellow-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto transform hover:scale-105 transition-transform duration-300">
            <div className="text-red-500 mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-lg font-semibold">{error}</p>
              <p className="text-sm text-gray-600 mt-2">
                Failed to fetch products from /api/products
              </p>
            </div>
            <button 
              onClick={handleRetry}
              className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-200 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8">
        {/* Login Status Banner */}
        {!isAuthenticated && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-8 text-center">
            <div className="flex items-center justify-center space-x-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-medium">
                🔒 Please 
                <button 
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline mx-1"
                >
                  login
                </button>
                to access all features
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-amber-300 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-orange-300 rounded-full opacity-30 animate-pulse delay-300"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <Package className="w-12 h-12 text-amber-700" />
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                  Our Products
                </h1>
                <p className="text-gray-600 text-lg mt-2">
                  Premium Quality Products delivered to your doorstep
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center mt-6 md:mt-0 bg-white px-6 py-3 rounded-full shadow-lg border border-amber-200">
            <TrendingUp className="w-5 h-5 text-amber-600 mr-2 animate-pulse" />
            <span className="text-gray-700 font-medium">
              {products.length} Products Available
            </span>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => {
            const productStatus = getProductStatus(product);
            const isUnavailable = productStatus.type !== 'available';
            
            // Get price data from database (no calculation)
            const priceData = getPriceData(product);
            
            return (
              <div 
                key={product._id || product.id} 
                onClick={() => navigateToProduct(product._id || product.id)}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 group border border-gray-200 hover:border-gray-300 transform hover:-translate-y-2 flex flex-col h-full cursor-pointer ${
                  isUnavailable ? 'opacity-75' : ''
                }`}
              >
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <img
                    src={memoizedGetProductImage(product)}
                    alt={product.name}
                    className={`w-full h-48 object-cover transform group-hover:scale-110 transition-transform duration-500 ${
                      isUnavailable ? 'filter grayscale' : ''
                    }`}
                    onError={(e) => {
                      console.error('❌ Image failed to load:', e.target.src);
                      console.log('🔄 Falling back to placeholder for product:', product.name);
                      e.target.src = FALLBACK_IMAGE;
                    }}
                    onLoad={(e) => {
                      console.log('✅ Image loaded successfully:', e.target.src);
                    }}
                  />
                  
                  {/* View Product Button - appears on hover */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex items-center space-x-2 text-amber-700 font-medium">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">View Details</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => isAuthenticated ? toggleWishlist(e, product._id || product.id) : showLoginPrompt(e)}
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-white hover:scale-110 transition-all duration-300 border border-gray-200"
                  >
                    {!isAuthenticated ? (
                      <Lock className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Heart 
                        className={`w-5 h-5 transition-all duration-300 ${
                          wishlist.has(product._id || product.id) 
                            ? 'text-red-500 fill-current animate-pulse' 
                            : 'text-gray-600 hover:text-red-400'
                        }`} 
                      />
                    )}
                  </button>
                  
                  {/* Status Badge */}
                  {productStatus.type === 'unavailable' ? (
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      🚫 Unavailable
                    </div>
                  ) : productStatus.type === 'out-of-stock' && (
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      ❌ Out of Stock
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 transition-colors duration-300 line-clamp-2">
                    {product.name}
                  </h3>

                  {/* Category & Brand */}
                  <div className="flex items-center mb-3 flex-wrap gap-2">
                    {product.category && (
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {product.category}
                      </span>
                    )}
                    {product.brand && (
                      <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                        {product.brand}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
                      {product.description}
                    </p>
                  )}

                  <div className="flex justify-between items-end mt-auto">
                    <div className="flex flex-col">
                      {/* Total Price from Database */}
                      <div className={`text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent ${
                        isUnavailable ? 'opacity-50' : ''
                      }`}>
                        ₹{priceData.totalPrice.toFixed(2)}
                      </div>
                      {priceData.gstRate > 0 && (
                        <span className="text-xs text-gray-500">Inclusive of GST</span>
                      )}

                      {product.unit && (
                        <span className="text-sm text-gray-600 font-normal mt-1">
                          /{product.unit}
                        </span>
                      )}
                      {productStatus.type === 'available' && product.stock && (
                        <span className="text-xs text-amber-700 font-medium mt-1">
                          {product.stock} in stock
                        </span>
                      )}
                    </div>
                    
                    {/* Updated buttons - All now navigate to product detail */}
                    {productStatus.type === 'unavailable' ? (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-500 font-semibold text-sm px-4 py-2 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        Unavailable
                      </div>
                    ) : productStatus.type === 'out-of-stock' ? (
                      <button 
                        onClick={(e) => handleViewProduct(e, product)}
                        className="text-orange-600 font-semibold text-sm px-4 py-2 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => handleViewProduct(e, product)}
                        className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-4 py-2 rounded-xl hover:from-amber-700 hover:to-orange-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center group/btn font-medium text-sm whitespace-nowrap"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1 group-hover/btn:animate-bounce" />
                        View & Buy
                      </button>
                    )}
                  </div>
                </div>

                {/* Animated border effect */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none ${
                  productStatus.type === 'unavailable' 
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                    : productStatus.type === 'out-of-stock'
                    ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500'
                }`}></div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {products.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto border border-amber-200">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No Products Found
              </h3>
              <p className="text-gray-600 mb-4">
                No products with valid pricing are available in the database at the moment.
              </p>
              <button 
                onClick={handleRetry}
                className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Refresh Products
              </button>
            </div>
          </div>
        )}
      </div>

      <ProductReviewSection />
    </div>
  );
};

export default BogatProducts;
