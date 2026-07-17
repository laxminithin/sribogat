import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import config from '../../../config/config';
import { Star, ShoppingBag, MessageCircle, User, X, Loader2, AlertCircle, Camera, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../../checkout/AuthProvider';
import { useNavigate } from 'react-router-dom';

const ProductReviewPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Image upload states
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadError, setUploadError] = useState('');

  // API URL helper - same as VerifiedReviewsSection
  const getApiUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const nodeEnv = import.meta.env.VITE_NODE_ENV;
    
    if (nodeEnv === 'production') {
      return config.API_URL;
    }
    
    return apiUrl || config.API_URL;
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Helper function to get auth token
  const getAuthToken = () => {
    return sessionStorage.getItem('kissanbandi_token') || 
           sessionStorage.getItem('token') || 
           sessionStorage.getItem('authToken');
  };

  // Fetch products - FIXED API CALL
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const API_BASE_URL = getApiUrl();
        const token = getAuthToken();
        
        const headers = {
          'Content-Type': 'application/json'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // FIXED: Use full API URL instead of relative path
        const endpoint = `${API_BASE_URL}/products`;
        console.log('🔍 Fetching products from:', endpoint);

        const response = await fetch(endpoint, { headers });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProducts(data.products || data);
        console.log('✅ Products loaded successfully:', data.products?.length || data.length);
      } catch (err) {
        console.error('💥 Error fetching products:', err);
        setError(err.message);
        // Fallback to dummy data for testing
        setProducts([
          { _id: '1', name: "Wireless Bluetooth Headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300", price: 99.99, category: "Electronics" },
          { _id: '2', name: "Smart Fitness Watch", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300", price: 199.99, category: "Electronics" },
          { _id: '3', name: "Organic Coffee Beans", image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300", price: 24.99, category: "Food & Beverages" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated]);

  // Handle image selection
  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);
    setUploadError('');

    // Validate file count
    if (files.length + selectedImages.length > 5) {
      setUploadError('Maximum 5 images allowed per review');
      return;
    }

    // Validate file types and sizes
    const validFiles = [];
    const newPreviews = [];

    files.forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed');
        return;
      }

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Each image must be less than 5MB');
        return;
      }

      validFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push({
          id: Date.now() + Math.random(),
          file: file,
          preview: e.target.result,
          name: file.name
        });

        if (newPreviews.length === validFiles.length) {
          setSelectedImages(prev => [...prev, ...validFiles]);
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove selected image
  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setUploadError('');
  };

  const handleProductSelect = async (product) => {
    setSelectedProduct(product);
    setRating(0);
    setReviewText('');
    setReviewTitle('');
    setSelectedImages([]);
    setImagePreviews([]);
    setUploadError('');
    setShowSuccess(false);
    setIsModalOpen(true);
    // Removed eligibility check - users can always review
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setRating(0);
    setReviewText('');
    setReviewTitle('');
    setSelectedImages([]);
    setImagePreviews([]);
    setUploadError('');
    setShowSuccess(false);
  };

  const handleRatingClick = (starValue) => {
    setRating(starValue);
  };

  // FIXED: Submit review with proper API URL
  const handleSubmitReview = async () => {
    if (!selectedProduct || rating === 0 || !reviewText.trim()) {
      toast.error('Please provide a rating and review text');
      return;
    }

    setIsSubmitting(true);
    try {
      const API_BASE_URL = getApiUrl();
      const token = getAuthToken();

      if (!token) {
        toast.error('Please log in to submit a review');
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('productId', selectedProduct._id || selectedProduct.id);
      formData.append('rating', rating);
      formData.append('comment', reviewText.trim());
      
      if (reviewTitle.trim()) {
        formData.append('title', reviewTitle.trim());
      }

      // Append image files
      selectedImages.forEach((file, index) => {
        formData.append('images', file);
      });

      // FIXED: Use full API URL instead of relative path
      const endpoint = `${API_BASE_URL}/reviews`;
      console.log('🔍 Submitting review to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Review submitted successfully:', result);
      
      setShowSuccess(true);
      setTimeout(() => {
        closeModal();
      }, 3000);
    } catch (err) {
      console.error('💥 Submit review error:', err);
      toast.error(`Error submitting review: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (interactive = false) =>
    [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      const isActive = interactive
        ? (hoverRating >= starValue || (!hoverRating && rating >= starValue))
        : rating >= starValue;

      return (
        <Star
          key={index}
          className={`w-8 h-8 cursor-pointer transition-all duration-200 ${
            isActive ? 'text-amber-500 fill-amber-500' : 'text-amber-200 hover:text-amber-400'
          }`}
          onClick={() => interactive && handleRatingClick(starValue)}
          onMouseEnter={() => interactive && setHoverRating(starValue)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        />
      );
    });

  const formatPrice = (price) =>
    typeof price === 'number' ? `$${price.toFixed(2)}` : price;

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-amber-900 mb-4">Authentication Required</h2>
          <p className="text-amber-700 mb-4">Please log in to write product reviews.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Product Review Center</h1>
          <p className="text-amber-700 text-lg">Share your experience and help others make informed decisions</p>
          <p className="text-amber-600 text-sm mt-2">Feel free to share multiple reviews for the same product based on different experiences!</p>
          {user && (
            <p className="text-amber-600 mt-2">Welcome, {user.name || user.email}!</p>
          )} 
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-amber-100">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-8 h-8 text-amber-700" />
            <h2 className="text-2xl font-semibold text-amber-900">Select a Product to Review</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <span className="ml-2 text-amber-700">Loading products...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-2">Failed to load products: {error}</p>
                <p className="text-amber-600 text-sm">Showing sample products for testing</p>
                <p className="text-xs text-gray-500 mt-2">API: {getApiUrl()}/products</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <p className="text-amber-600">No products available for review</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product._id || product.id}
                  onClick={() => handleProductSelect(product)}
                  className="bg-amber-50 rounded-xl p-6 hover:shadow-lg border-2 border-transparent hover:border-amber-300 group cursor-pointer transition-all duration-200"
                >
                  <div className="aspect-square w-full mb-4 rounded-lg overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300";
                      }}
                    />
                  </div>
                  <h3 className="font-semibold text-amber-900 mb-2">{product.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-600">{product.category}</span>
                    <span className="text-lg font-bold text-amber-800">{formatPrice(product.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-amber-100">
                <h2 className="text-2xl font-semibold text-amber-900">Write a Review</h2>
                <button onClick={closeModal} className="p-2 hover:bg-amber-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-amber-600" />
                </button>
              </div>

              <div className="p-6">
                {selectedProduct && (
                  <div className="flex items-center gap-4 mb-6 p-4 bg-amber-50 rounded-lg">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-semibold text-amber-900">{selectedProduct.name}</h3>
                      <p className="text-amber-700">{formatPrice(selectedProduct.price)}</p>
                    </div>
                  </div>
                )}

                {showSuccess ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-amber-900 mb-2">Review Submitted!</h3>
                    <p className="text-amber-700">Thank you for your feedback. Your review will be published after approval.</p>
                    <p className="text-amber-600 text-sm mt-2">You can submit another review for this or other products anytime!</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-amber-800 mb-2">
                        Review Title (optional)
                      </label>
                      <input
                        type="text"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Give your review a title..."
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-amber-800 mb-2">
                        Rating *
                      </label>
                      <div className="flex items-center gap-2">
                        {renderStars(true)}
                        <span className="text-amber-700 ml-2">
                          {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Click to rate'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-amber-800 mb-2">
                        Your Review *
                      </label>
                      <textarea
                        rows={5}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="w-full border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                        placeholder="Share your thoughts about this product... You can write multiple reviews based on different experiences!"
                      />
                      <p className="text-sm text-amber-600 mt-1">
                        {reviewText.length}/1000 characters
                      </p>
                    </div>

                    {/* Image Upload Section */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-amber-800 mb-2">
                        Add Photos (optional)
                      </label>
                      <div className="border-2 border-dashed border-amber-300 rounded-xl p-6 text-center hover:border-amber-400 transition-colors">
                        <input
                          type="file"
                          id="review-images"
                          multiple
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <label
                          htmlFor="review-images"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                            <Camera className="w-6 h-6 text-amber-600" />
                          </div>
                          <p className="text-amber-700 font-medium mb-1">Click to upload photos</p>
                          <p className="text-amber-600 text-sm">Maximum 5 images, 5MB each</p>
                          <p className="text-amber-500 text-xs mt-1">JPG, PNG, GIF, WEBP supported</p>
                        </label>
                      </div>

                      {uploadError && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-600 text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {uploadError}
                          </p>
                        </div>
                      )}

                      {/* Image Previews */}
                      {imagePreviews.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-amber-800 mb-2">
                            Selected Images ({imagePreviews.length}/5)
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {imagePreviews.map((preview, index) => (
                              <div key={preview.id} className="relative group">
                                <img
                                  src={preview.preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border border-amber-200"
                                />
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                  title="Remove image"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded truncate">
                                  {preview.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleSubmitReview}
                        disabled={isSubmitting || rating === 0 || !reviewText.trim()}
                        className="flex-1 bg-amber-700 text-white py-3 px-6 rounded-xl hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Submitting...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Upload className="w-5 h-5 mr-2" />
                            Submit Review
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={closeModal} 
                        className="border border-amber-300 text-amber-700 py-3 px-6 rounded-xl hover:bg-amber-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviewPage;
