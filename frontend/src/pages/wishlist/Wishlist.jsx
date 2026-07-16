import React, { useState, useEffect } from 'react';
import { useAuth } from '../checkout/AuthProvider';
import { useCart } from '../checkout/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Heart, ShoppingCart, Loader, Trash2, Sparkles, AlertCircle, Eye } from 'lucide-react';
import api from '../../services/api';
import { resolveImageUrl } from '../../config/config';
import { getPriceData } from '../../utils/pricing';

const Wishlist = () => {
  const { user } = useAuth();
  const { dispatch } = useCart();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    loadWishlist();
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/wishlist');
      setWishlist(response.data);
    } catch (err) {
      setTimeout(() => {
        toast.error('Failed to load wishlist');
      }, 0);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await api.delete(`/users/wishlist/${productId}`);
      setWishlist((currentWishlist) =>
        currentWishlist.filter((item) => (item._id || item.id) !== productId)
      );
      setTimeout(() => {
        toast.success('Removed from wishlist');
      }, 0);
    } catch (err) {
      setTimeout(() => {
        toast.error('Failed to remove from wishlist');
      }, 0);
    }
  };

  // Updated function to redirect to product page instead of adding to cart
  const handleViewProduct = (product) => {
    // Check if product is accessible before navigating
    const productStatus = getProductStatus(product);
    if (productStatus.type === 'unavailable') {
      toast.error(productStatus.message);
      return;
    }

    const productId = product._id || product.id;
    if (!productId) {
      toast.error('Product ID is missing');
      return;
    }

    console.log('🔄 Navigating to product detail from wishlist:', productId);
    navigate(`/products/${productId}`);
    console.log('✅ Navigation triggered to:', `/products/${productId}`);
  };

  // Updated helper function to get stock status - matches ProductCatalog logic
  const getProductStatus = (product) => {
    if (product?.status === 'inactive') {
      return { type: 'unavailable', message: 'Product is unavailable' };
    }
    if (product?.stock === 0) {
      return { type: 'out-of-stock', message: 'Out of stock' };
    }
    return { type: 'available', message: 'Available' };
  };

  const isProductUnavailable = (product) => {
    const status = getProductStatus(product);
    return status.type !== 'available';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent absolute top-0 left-0"></div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-700 w-6 h-6 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Animated Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-red-300 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-yellow-600 rounded-full opacity-30 animate-pulse delay-300"></div>
            <div className="flex items-center relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-yellow-700 rounded-full flex items-center justify-center mr-4 shadow-lg animate-bounce">
                <Heart className="w-8 h-8 text-white fill-current" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-amber-700 bg-clip-text text-transparent animate-fade-in">
                  My Wishlist
                </h1>
                <p className="text-gray-600 mt-3 text-lg animate-fade-in delay-200">
                  💖 Your favorite premium products
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center mt-6 md:mt-0 bg-white px-6 py-3 rounded-full shadow-lg border border-amber-200 animate-slide-in">
            <Heart className="w-5 h-5 text-red-500 mr-2 animate-pulse fill-current" />
            <span className="text-gray-700 font-medium">
              {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
            </span>
          </div>
        </div>

        {wishlist.length === 0 ? (
          /* Enhanced Empty State */
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto border border-amber-200 transform hover:scale-105 transition-transform duration-300">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Heart className="w-12 h-12 text-red-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-200 rounded-full opacity-60 animate-ping"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Your wishlist is empty</h3>
              <p className="text-gray-600 mb-6">
                Save items you love by clicking the heart icon on products. Start building your dream collection! 🌟
              </p>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <p className="text-amber-700 text-sm font-medium">
                  💡 Tip: Browse our premium products and add your favorites here
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Enhanced Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {wishlist.map((product, index) => {
              const productStatus = getProductStatus(product);
              const isUnavailable = productStatus.type !== 'available';
              
              return (
                <div 
                  key={product._id || product.id} 
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-500 group border border-amber-200 flex flex-col h-full animate-fade-in-up ${
                    !isUnavailable 
                      ? 'hover:shadow-2xl hover:border-amber-300 transform hover:-translate-y-2' 
                      : 'opacity-75'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent opacity-0 transition-opacity duration-300 ${
                      !isUnavailable ? 'group-hover:opacity-100' : ''
                    }`}></div>
                    
                    {/* Stock overlay for unavailable products */}
                    {isUnavailable && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className={`px-4 py-2 rounded-full text-white font-bold text-sm flex items-center ${
                          productStatus.type === 'unavailable' ? 'bg-gray-600' : 'bg-red-600'
                        }`}>
                          <AlertCircle className="w-4 h-4 mr-2" />
                          {productStatus.type === 'unavailable' ? 'Unavailable' : 'Out of Stock'}
                        </div>
                      </div>
                    )}
                    
                    <img
                      src={resolveImageUrl(product.image || product.imageUrl || product.images?.[0])}
                      alt={product.name}
                      className={`w-full h-48 object-contain transition-transform duration-500 p-4 ${
                        !isUnavailable 
                          ? 'transform group-hover:scale-110' 
                          : 'filter grayscale'
                      }`}
                    />
                    
                    {/* Remove from Wishlist Button - always accessible */}
                    <button 
                      onClick={() => handleRemoveFromWishlist(product._id || product.id)}
                      className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-red-50 hover:scale-110 transition-all duration-300 border border-red-100 group/remove z-20"
                    >
                      <Trash2 className="w-5 h-5 text-red-500 group-hover/remove:text-red-600 transition-colors duration-300" />
                    </button>
                    
                    {/* Wishlist Badge */}
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse z-20">
                      💖 Saved
                    </div>

                    {/* Stock Status Badge - show appropriate status */}
                    {productStatus.type === 'unavailable' ? (
                      <div className="absolute bottom-4 left-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-20">
                        🚫 Unavailable
                      </div>
                    ) : productStatus.type === 'out-of-stock' ? (
                      <div className="absolute bottom-4 left-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-20">
                        ❌ Out of Stock
                      </div>
                    ) : (
                      <div className="absolute bottom-4 left-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-20">
                        ✨ Available
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="text-sm text-amber-700 font-bold mb-3 capitalize bg-amber-50 px-3 py-1 rounded-full inline-block">
                      {product.category || 'Premium Product'}
                    </div>
                    <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 flex-grow ${
                      !isUnavailable 
                        ? 'text-gray-800 group-hover:text-amber-700' 
                        : 'text-gray-500'
                    }`}>
                      {product.name}
                    </h3>
                    
                    {product.description && (
                      <p className={`text-sm mb-4 line-clamp-2 ${
                        !isUnavailable ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {product.description}
                      </p>
                    )}

                    <div className="flex justify-between items-end mt-auto">
                      <div className="flex flex-col">
                        <div className={`text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent ${
                          isUnavailable ? 'opacity-50' : ''
                        }`}>
                          ₹{getPriceData(product).totalPrice.toFixed(2)}
                        </div>
                        {getPriceData(product).gstRate > 0 && (
                          <span className="text-xs text-gray-500">Inclusive of GST</span>
                        )}
                        <span className={`text-sm font-normal ${
                          isUnavailable ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          /{product.unit || 'piece'}
                        </span>
                        {productStatus.type === 'available' && product.stock && (
                          <span className="text-xs text-amber-700 font-medium mt-1">
                            {product.stock} in stock
                          </span>
                        )}
                      </div>
                      
                      {productStatus.type === 'unavailable' ? (
                        <div className="text-gray-500 font-semibold text-sm px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                          Unavailable
                        </div>
                      ) : productStatus.type === 'out-of-stock' ? (
                        <button 
                          onClick={() => handleViewProduct(product)}
                          className="text-orange-600 font-semibold text-sm px-4 py-2 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleViewProduct(product)}
                          className="px-4 py-2 rounded-xl transition-all duration-300 transform shadow-lg flex items-center group/btn font-medium text-sm whitespace-nowrap bg-gradient-to-r from-amber-600 to-orange-700 text-white hover:from-amber-700 hover:to-orange-800 hover:scale-105 hover:shadow-xl"
                        >
                          <ShoppingCart className="w-4 h-4 mr-1 group-hover/btn:animate-bounce" />
                          View & Buy
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Animated border effect - only for available products */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none ${
                    productStatus.type === 'unavailable' 
                      ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                      : productStatus.type === 'out-of-stock'
                      ? 'bg-gradient-to-r from-red-400 to-red-500'
                      : 'bg-gradient-to-r from-red-400 via-pink-400 to-amber-400'
                  }`}></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Action Hint */}
        {wishlist.length > 0 && (
          <div className="fixed bottom-8 right-8 bg-gradient-to-r from-amber-600 to-orange-700 text-white px-6 py-3 rounded-full shadow-xl animate-bounce z-50">
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                {wishlist.length} items in wishlist
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.6s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Wishlist;
