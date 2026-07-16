// Updated ProductDetailPage.js - Fetch price and GST from database
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart, Star, ShoppingCart, ArrowLeft, Share2, Package, 
  Truck, Shield, RotateCcw, Check, Plus, Minus,
  ChevronLeft, ChevronRight, MessageSquare, ThumbsUp, 
  Calendar, User, CheckCircle, Send
} from 'lucide-react';
import { useCart } from "../checkout/CartContext";
import { useAuth } from '../checkout/AuthProvider';
import { toast } from 'react-hot-toast';
import { usersApi, productsApi } from '../../services/api';
import { resolveImageUrl } from '../../config/config';
import { Link } from 'react-router-dom';

// ✅ FIXED: Separate ReviewForm component to prevent re-rendering issues
const ReviewForm = ({ 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  // Local state within the form component prevents parent re-renders from affecting input focus
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: '',
    images: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Stable input change handlers
  const handleTitleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
  }, []);

  const handleCommentChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, comment: e.target.value }));
  }, []);

  const handleImagesChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, images: Array.from(e.target.files) }));
  }, []);

  const handleRatingChange = useCallback((rating) => {
    setFormData(prev => ({ ...prev, rating }));
  }, []);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Write Your Verified Review</h3>
        <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
          <CheckCircle className="w-4 h-4 mr-1" />
          Verified Purchase
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Package className="w-4 h-4 mr-2 text-green-600" />
          <span>You are reviewing a product you purchased and received</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRatingChange(rating)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-6 h-6 ${
                    rating <= formData.rating
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={handleTitleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Summarize your review"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Review *
          </label>
          <textarea
            value={formData.comment}
            onChange={handleCommentChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            rows="4"
            placeholder="Share your experience with this product"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos (Optional)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImagesChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">You can upload up to 5 images</p>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Verified Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Enhanced cart integration with real-time sync
  const { 
    state: cartState,
    getItemQuantity, 
    addSingleItem, 
    removeSingleItem, 
    updateQuantity,
    isInCart,
    getTotalItems,
    getCartTotal,
    cartStats
  } = useCart();
  
  const auth = useAuth();
  const isAuthenticated = auth?.user && !auth?.loading;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current quantity from cart - this will sync automatically
  const cartQuantity = getItemQuantity(id);
  // For display when item is not in cart yet
  const [displayQuantity, setDisplayQuantity] = useState(0);

  const [selectedImage, setSelectedImage] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Enhanced Reviews state with purchase verification
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [activeTab, setActiveTab] = useState('description');
  const [canReview, setCanReview] = useState(false);
  const [canReviewReason, setCanReviewReason] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Function to get price data from database (no calculation needed)
  const getPriceData = useCallback((product) => {
    // Check if the product has pre-calculated total price from database
    if (product.totalPrice !== undefined && product.totalPrice !== null) {
      return {
        basePrice: product.price || 0,
        gstRate: product.gst || 18,
        gstAmount: product.gstAmount || 0,
        totalPrice: product.totalPrice
      };
    }
    
    // Fallback: If database doesn't have totalPrice, calculate it
    const basePrice = parseFloat(product.price) || 0;
    const gstRate = product.gst || 18;
    const gstAmount = (basePrice * gstRate) / 100;
    const totalPrice = basePrice + gstAmount;
    
    return {
      basePrice,
      gstRate,
      gstAmount,
      totalPrice
    };
  }, []);

  // Image handling functions
  const getProductImage = useCallback((imagePath) => {
    if (!imagePath) {
      return '/api/placeholder/500/500';
    }

    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it starts with /uploads, use it directly with your backend
    if (imagePath.startsWith('/uploads')) {
      return resolveImageUrl(imagePath);
    }
    
    // If it's just a filename, put it in product folder
    const filename = imagePath.split('/').pop();
    return resolveImageUrl(`/uploads/product/${filename}`);
  }, []);

  // Enhanced getProductImages function
  const getProductImages = useCallback(() => {
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      // Process each image URL
      return product.images.map(img => getProductImage(img));
    }
    
    // Fallback to single image field
    if (product?.image) {
      return [getProductImage(product.image)];
    }
    
    // Default placeholder
    return ['/api/placeholder/500/500'];
  }, [product, getProductImage]);

  // Enhanced getRelatedProductImage function
  const getRelatedProductImage = useCallback((relatedProduct) => {
    if (relatedProduct.images && Array.isArray(relatedProduct.images) && relatedProduct.images.length > 0) {
      return getProductImage(relatedProduct.images[0]);
    }
    
    if (relatedProduct.image) {
      return getProductImage(relatedProduct.image);
    }
    
    return '/api/placeholder/300/200';
  }, [getProductImage]);

  // Real-time cart sync effect
  useEffect(() => {
    // Update display quantity when cart changes
    if (cartQuantity > 0) {
      setDisplayQuantity(cartQuantity);
    } else {
      setDisplayQuantity(0);
    }
  }, [cartQuantity, cartState.lastUpdated]);

  // Load product data
  useEffect(() => {
    if (id) {
      loadProduct();
      loadRelatedProducts();
      loadProductReviews();
      if (isAuthenticated) {
        checkCanReview();
      }
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && product) {
      checkWishlistStatus();
    }
  }, [isAuthenticated, product]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching product with pricing data from database for ID:', id);
      const data = await productsApi.getProductById(id);
      
      if (data && (data._id || data.id)) {
        console.log('Product loaded from database:', {
          id: data._id || data.id,
          name: data.name,
          basePrice: data.price,
          gstRate: data.gstRate,
          gstAmount: data.gstAmount,
          totalPrice: data.totalPrice,
          stock: data.stock
        });
        setProduct(data);
      } else {
        throw new Error('Product not found');
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedProducts = async () => {
    try {
      const data = await productsApi.getAllProducts();
      let allProducts = Array.isArray(data) ? data : (data.products || data.data || []);
      
      const filtered = allProducts
        .filter(p => (p._id || p.id) !== id && p.status !== 'inactive')
        .slice(0, 4);
      
      setRelatedProducts(filtered);
    } catch (err) {
      console.error('Error loading related products:', err);
    }
  };

  const loadProductReviews = async () => {
    try {
      setReviewsLoading(true);
      
      const reviewsResponse = await fetch(`${import.meta.env.VITE_API_URL}/reviews/verified/product/${id}`);
      const reviewsData = await reviewsResponse.json();
      
      if (reviewsResponse.ok && reviewsData.success) {
        const reviewsList = reviewsData.reviews || [];
        setReviews(reviewsList);
        
        const totalReviews = reviewsList.length;
        if (totalReviews > 0) {
          const ratings = reviewsList.map(r => r.rating);
          const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / totalReviews;
          
          const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          ratings.forEach(rating => {
            breakdown[rating] = (breakdown[rating] || 0) + 1;
          });
          
          setReviewStats({
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
            ratingBreakdown: breakdown
          });
        } else {
          setReviewStats({
            averageRating: 0,
            totalReviews: 0,
            ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          });
        }
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
      setReviewStats({
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    } finally {
      setReviewsLoading(false);
    }
  };

  // Enhanced checkCanReview with purchase verification
  const checkCanReview = async () => {
    if (!isAuthenticated) {
      setCanReview(false);
      setCanReviewReason('Please login to review products');
      return;
    }
    
    try {
      console.log('Checking if user can review product:', id);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reviews/can-review/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('kissanbandi_token') || sessionStorage.getItem('kissanbandi_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Can review response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Can review response data:', data);
      
      if (data.success) {
        setCanReview(data.canReview);
        setCanReviewReason(data.reason || '');
        
        console.log('✅ Review eligibility check:', {
          canReview: data.canReview,
          reason: data.reason
        });
      } else {
        setCanReview(false);
        setCanReviewReason(data.error || 'Unable to verify review eligibility');
        console.error('❌ Review eligibility check failed:', data.error);
      }
    } catch (err) {
      console.error('❌ Error checking review eligibility:', err);
      setCanReview(false);
      setCanReviewReason('Error checking review eligibility');
    }
  };

  const checkWishlistStatus = async () => {
    try {
      const wishlistItems = await usersApi.getWishlist();
      const isInList = wishlistItems.some(item => (item._id || item.id) === (product._id || product.id));
      setIsInWishlist(isInList);
    } catch (err) {
      console.error('Failed to check wishlist status:', err);
    }
  };

  // ✅ FIXED: Enhanced handleSubmitReview with proper form data handling
  const handleSubmitReview = async (formData) => {
    if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      return;
    }

    if (!canReview) {
      toast.error(canReviewReason || 'You cannot review this product');
      return;
    }

    try {
      setIsSubmittingReview(true);
      console.log('Submitting review for product:', id);
      
      const submitData = new FormData();
      submitData.append('productId', id);
      submitData.append('rating', formData.rating);
      submitData.append('title', formData.title);
      submitData.append('comment', formData.comment);
      
      // Add images if any
      formData.images.forEach((image, index) => {
        submitData.append('images', image);
      });

      console.log('Review form data:', {
        productId: id,
        rating: formData.rating,
        title: formData.title,
        comment: formData.comment,
        images: formData.images.length
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('kissanbandi_token') || sessionStorage.getItem('kissanbandi_token')}`
          // Don't set Content-Type for FormData, let browser set it
        },
        body: submitData
      });

      console.log('Submit review response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Submit review response data:', data);

      if (data.success) {
        toast.success('Review submitted successfully! It will be visible after approval.');
        setShowReviewForm(false);
        setCanReview(false); // User can no longer review since they just submitted one
        setCanReviewReason('You have already reviewed this product');
        
        // Reload reviews to show the new one (if it gets auto-approved)
        loadProductReviews();
      } else {
        throw new Error(data.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error('❌ Error submitting review:', err);
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddSingleItem = async () => {
    if (!product) {
      console.error('❌ No product available');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (product.stock < 1) {
      toast.error('Sorry, this product is out of stock!');
      return;
    }

    const maxStock = product?.stock || 10;
    
    if (cartQuantity >= maxStock) {
      toast.error(`Only ${maxStock} items available in stock`);
      return;
    }

    // Get price data from database (no calculation needed)
    const priceData = getPriceData(product);
    
    // Validate pricing data
    if (!priceData.totalPrice || priceData.totalPrice <= 0) {
      console.error('❌ Invalid product pricing:', priceData);
      toast.error('Product pricing not available');
      return;
    }

    try {
      // Create complete product object with database pricing
      const completeProduct = {
        ...product,
        id: product._id || product.id,
        _id: product._id || product.id,
        name: product.name || 'Unknown Product',
        price: priceData.totalPrice, // Use total price from database
        basePrice: priceData.basePrice, // Store base price for reference
        gstAmount: priceData.gstAmount, // Store GST amount from database
        gstRate: priceData.gstRate, // Store GST rate from database
        image: getProductImages()[0], // Use processed image
        stock: product.stock || 999,
        category: product.category,
        brand: product.brand,
        description: product.description,
        originalPrice: product.originalPrice,
        unit: product.unit,
        images: getProductImages(), // Use processed images
        status: product.status
      };

      console.log('Adding product to cart with database pricing:', {
        id: completeProduct.id,
        name: completeProduct.name,
        totalPrice: priceData.totalPrice,
        basePrice: priceData.basePrice,
        gstAmount: priceData.gstAmount,
        gstRate: priceData.gstRate
      });

      const success = addSingleItem(completeProduct);
      
      if (success) {
        toast.success(`Added ${product.name} to cart!`);
      } else {
        console.error('❌ addSingleItem returned false');
        toast.error('Failed to add item to cart');
      }
      
    } catch (err) {
      console.error('❌ Exception in handleAddSingleItem:', err);
      toast.error('Failed to add to cart');
    }
  };

  const handleRemoveSingleItem = async () => {
    if (!product) return;
    
    if (!isAuthenticated) {
      toast.error('Please login to manage cart items');
      navigate('/login');
      return;
    }

    const productId = product._id || product.id;
    const currentCartQuantity = getItemQuantity(productId);

    if (currentCartQuantity <= 0) {
      toast.error('Item not in cart');
      return;
    }

    try {
      const success = removeSingleItem(productId);
      if (success) {
        toast.success(`Removed one ${product.name} from cart!`);
      }
    } catch (err) {
      console.error('Cart error:', err);
      toast.error('Failed to remove from cart');
    }
  };

  const handleQuantityChange = useCallback((change) => {
    const productId = product._id || product.id;
    const maxStock = product?.stock || 0;

    if (cartQuantity > 0) {
      // Item is in cart
      const newQuantity = cartQuantity + change;

      if (newQuantity >= 1 && newQuantity <= maxStock) {
        updateQuantity(productId, newQuantity);
      } else if (newQuantity > maxStock) {
        toast.error(`Only ${maxStock} items available in stock`);
      } else if (newQuantity <= 0) {
        updateQuantity(productId, 0);
      }
    } else {
      // Item not in cart, update local display
      const newQuantity = displayQuantity + change;

      if (newQuantity >= 0 && newQuantity <= maxStock) {
        setDisplayQuantity(newQuantity);
      } else if (newQuantity > maxStock) {
        toast.error(`Only ${maxStock} items available in stock`);
      } else if (newQuantity < 0) {
        setDisplayQuantity(0);
      }
    }
  }, [cartQuantity, displayQuantity, product, updateQuantity]);

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist');
      navigate('/login');
      return;
    }

    try {
      if (isInWishlist) {
        await usersApi.removeFromWishlist(product._id || product.id);
        setIsInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await usersApi.addToWishlist(product._id || product.id);
        setIsInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      toast.error('Failed to update wishlist');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Product link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const renderStars = (rating, size = 'w-4 h-4') => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size} ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const isOutOfStock = (product?.stock || 0) < 1;
  const isUnavailable = product?.status === 'inactive';
  const canPurchase = !isOutOfStock && !isUnavailable;

  // Get the current quantity to display (from cart if in cart, otherwise display quantity)
  const currentQuantity = cartQuantity > 0 ? cartQuantity : displayQuantity;

  // Get price data from database (no calculation)
  const priceData = product ? getPriceData(product) : null;

  // ReviewsTabContent component with purchase verification
  const ReviewsTabContent = () => (
    <div className="space-y-6">
      {/* Reviews Header with Purchase Verification */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
        
        {/* Review Button with Enhanced Logic */}
        {isAuthenticated ? (
          canReview ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center"
            >
              <Star className="w-4 h-4 mr-2" />
              Write a Review
            </button>
          ) : (
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg max-w-sm">
                <div className="flex items-center justify-center mb-2">
                  <Shield className="w-5 h-5 mr-2" />
                  <span className="font-medium">Verified Purchase Required</span>
                </div>
                <p className="text-sm">{canReviewReason}</p>
              </div>
            </div>
          )
        ) : (
          <Link 
            to="/login" 
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Login to Review
          </Link>
        )}
      </div>

      {/* Purchase Verification Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Shield className="w-6 h-6 text-blue-600 mt-0.5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              📦 Verified Purchase Reviews Only
            </h3>
            <p className="text-sm text-blue-700">
              Only customers who have purchased and received this product can write reviews. 
              This helps ensure authentic and helpful feedback from real buyers.
            </p>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              <span>All reviews are verified purchases</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Summary */}
      {reviewStats.totalReviews > 0 && (
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">
                {reviewStats.averageRating.toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(reviewStats.averageRating), 'w-5 h-5')}
              </div>
              <div className="text-gray-600">
                Based on {reviewStats.totalReviews} verified reviews
              </div>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => (
                <div key={rating} className="flex items-center space-x-2">
                  <span className="text-sm font-medium w-8">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${reviewStats.totalReviews > 0 
                          ? (reviewStats.ratingBreakdown[rating] / reviewStats.totalReviews) * 100 
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8">
                    {reviewStats.ratingBreakdown[rating]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Review Form using the separate component */}
      {showReviewForm && canReview && (
        <ReviewForm
          onSubmit={handleSubmitReview}
          onCancel={() => setShowReviewForm(false)}
          isSubmitting={isSubmittingReview}
        />
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviewsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading verified reviews...</p>
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review._id} className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {review.user?.name || 'Anonymous User'}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        {/* Enhanced verification badge */}
                        {review.verified && (
                          <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span className="text-xs font-medium">Verified Purchase</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {review.title && (
                    <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
                  )}
                  <p className="text-gray-600 mb-3">{review.comment}</p>
                  
                  {/* Review images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex space-x-2 mb-3">
                      {review.images.slice(0, 3).map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review image ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ))}
                      {review.images.length > 3 && (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                          +{review.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Admin Reply */}
                  {review.reply && review.reply.text && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-3">
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                          <Shield className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-blue-800">Store Response</span>
                      </div>
                      <p className="text-blue-700 text-sm">{review.reply.text}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Verified Reviews Yet</h3>
            <p className="text-gray-600 mb-4">
              Only customers who have purchased this product can leave reviews
            </p>
            {!isAuthenticated ? (
              <Link 
                to="/login"
                className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Login to Review
              </Link>
            ) : !canReview ? (
              <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg inline-block">
                {canReviewReason}
              </div>
            ) : (
              <button
                onClick={() => setShowReviewForm(true)}
                className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Write First Verified Review
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-gray-200 h-96 rounded-2xl"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
          <p className="text-center text-amber-700 mt-4 font-medium">Loading product with pricing from database...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <div className="text-red-500 mb-4">
                <Package className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Product Not Found</h2>
                <p className="text-gray-600 mt-2">{error}</p>
              </div>
              <button 
                onClick={() => navigate('/products')}
                className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-800 transition-all duration-300"
              >
                Back to Products
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const images = getProductImages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => navigate('/products')}
              className="flex items-center text-gray-600 hover:text-amber-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Products
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-800 font-medium">{product.name}</span>
          </div>
          
          {/* Real-time cart status in header */}
          {getTotalItems() > 0 && (
            <div className="flex items-center space-x-4">
              <Link 
                to="/checkout" 
                className="flex items-center bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cart ({getTotalItems()}) • ₹{getCartTotal().toFixed(2)}
              </Link>
            </div>
          )}
        </div>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden group">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-96 object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  console.error('❌ Product image failed to load:', e.target.src);
                  e.target.src = '/api/placeholder/500/500';
                }}
                onLoad={() => {
                  console.log('✅ Product image loaded successfully:', images[selectedImage]);
                }}
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Status Badges */}
              {isUnavailable && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Unavailable
                </div>
              )}
              {isOutOfStock && !isUnavailable && (
                <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Out of Stock
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index ? 'border-amber-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('❌ Thumbnail failed to load:', e.target.src);
                        e.target.src = '/api/placeholder/100/100';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                  {product.brand && (
                    <p className="text-amber-600 font-medium">by {product.brand}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleShare}
                    className="p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all"
                  >
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={toggleWishlist}
                    className="p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all"
                  >
                    <Heart className={`w-5 h-5 ${isInWishlist ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
                  </button>
                </div>
              </div>

              {/* Rating & Reviews */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  {renderStars(Math.round(reviewStats.averageRating))}
                  <span className="text-sm text-gray-600 ml-2">
                    {reviewStats.averageRating.toFixed(1)} ({reviewStats.totalReviews} reviews)
                  </span>
                </div>
                {product.category && (
                  <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
              </div>
            </div>

            {/* Enhanced Price Section with Database GST Display */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {/* Total Price from Database (Prominent Display) */}
                  <div className="text-3xl font-bold text-amber-700">
                    ₹{priceData ? priceData.totalPrice.toFixed(2) : '0.00'}
                    {product.unit && <span className="text-lg text-gray-600">/{product.unit}</span>}
                  </div>
                  
                  {/* Price Breakdown from Database (Smaller Text) */}
                  {priceData && (priceData.gstAmount > 0 || priceData.gstRate > 0) && (
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <div className="border-t pt-1 font-medium">
                        Total (incl. GST): ₹{priceData.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  )}
                  
                  {/* Original Price Discount */}
                  {product.originalPrice && product.originalPrice > product.price && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                      <span className="text-green-600 font-medium">
                        {Math.round((1 - product.price / product.originalPrice) * 100)}% off
                      </span>
                    </div>
                  )}
                </div>
                {canPurchase && (
                  <div className="text-green-600 font-medium flex items-center">
                    <Check className="w-4 h-4 mr-1" />
                    In Stock ({product.stock || 0})
                  </div>
                )}
              </div>

              {/* Enhanced Quantity Selector with Stock Control */}
              {canPurchase && (
                <div className="flex items-center space-x-4 mb-6">
                  <span className="text-gray-700 font-medium">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={currentQuantity <= 0}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 font-medium min-w-[3rem] text-center">
                      {currentQuantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={currentQuantity >= (product.stock || 0) || currentQuantity < 1}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Enhanced cart status with real-time updates */}
                  <div className="flex flex-col space-y-1">
                    {cartQuantity > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-green-600 font-medium">
                          ✓ {cartQuantity} in cart
                        </span>
                      </div>
                    )}
                    {getTotalItems() > 0 && (
                      <div className="text-xs text-gray-500">
                        Cart total: {getTotalItems()} items • ₹{getCartTotal().toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {canPurchase ? (
                  <>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAddSingleItem}
                        disabled={addingToCart || cartQuantity >= (product.stock || 0) || (product.stock || 0) < 1}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{(product.stock || 0) < 1 ? 'Out of Stock' : 'Add One'}</span>
                      </button>
                    </div>
                    <Link to="/checkout" className="w-full block">
                      <button 
                        disabled={getTotalItems() === 0}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {getTotalItems() > 0 ? 'Buy Now' : 'Add items to buy'}
                      </button>
                    </Link>
                  </>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-500 py-3 px-6 rounded-xl font-medium text-center">
                    {isUnavailable ? 'Product Unavailable' : 'Out of Stock'}
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4">Delivery & Services</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Truck className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Free delivery on orders above ₹500</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm">Delivery in 7-8 business days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => {
                const relatedPriceData = getPriceData(relatedProduct);
                return (
                  <div
                    key={relatedProduct._id || relatedProduct.id}
                    onClick={() => navigate(`/products/${relatedProduct._id || relatedProduct.id}`)}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  >
                    <img
                      src={getRelatedProductImage(relatedProduct)}
                      alt={relatedProduct.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.error('❌ Related product image failed:', e.target.src);
                        e.target.src = '/api/placeholder/300/200';
                      }}
                    />
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{relatedProduct.name}</h3>
                      <div className="text-xl font-bold text-amber-700">
                        ₹{relatedPriceData.totalPrice.toFixed(2)}
                      </div>
                      {relatedProduct.description && (
                        <div className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {relatedProduct.description.length > 80 
                            ? `${relatedProduct.description.substring(0, 80)}...` 
                            : relatedProduct.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Details Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-16">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-8">
              <button
                onClick={() => setActiveTab('description')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'description'
                    ? 'border-amber-500 text-amber-600'  
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Reviews ({reviewStats.totalReviews})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Description</h2>

                {product.description ? (
                  <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
                    {product.description.split('.').map((point, idx) => {
                      const trimmed = point.trim();
                      return trimmed ? <li key={idx}>{trimmed}.</li> : null;
                    })}
                  </ul>
                ) : (
                  <p className="text-gray-600">No description available for this product.</p>
                )}
              </div>
            )}

            {/* Use the ReviewsTabContent component */}
            {activeTab === 'reviews' && <ReviewsTabContent />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
