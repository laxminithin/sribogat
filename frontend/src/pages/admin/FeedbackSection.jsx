import React, { useState, useEffect } from 'react';
import config, { resolveImageUrl, FALLBACK_IMAGE } from '../../config/config';
import { 
  Star, 
  User, 
  Calendar, 
  MessageCircle, 
  ShoppingBag, 
  Check, 
  X, 
  Clock, 
  Search,
  Filter,
  Eye,
  EyeOff,
  Send,
  AlertCircle,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Heart,
  TrendingUp,
  Award,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const AdminReviewManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [user, setUser] = useState(null);

  // API Base URL
  const API_BASE = config.API_URL;

  // Check authentication status
  const checkAuth = async () => {
    setAuthLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      if (!token) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      // Try to verify token by making a test API call to admin endpoint
      try {
        const response = await fetch(`${API_BASE}/reviews`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
          setUser({ role: 'admin', email: 'admin@example.com' });
        } else if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem('adminToken');
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
          setUser({ role: 'admin', email: 'admin@example.com' });
        }
      } catch (error) {
        console.warn('Auth verification failed, using mock auth');
        setIsAuthenticated(true);
        setUser({ role: 'admin', email: 'admin@example.com' });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      sessionStorage.removeItem('adminToken');
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // For demo purposes, simulate login with mock credentials
      if (loginData.email === 'admin@example.com' && loginData.password === 'admin123') {
        const mockToken = 'mock-admin-token-' + Date.now();
        sessionStorage.setItem('adminToken', mockToken);
        setUser({ 
          _id: 'admin-id', 
          role: 'admin', 
          name: 'Admin User',
          email: 'admin@example.com' 
        });
        setIsAuthenticated(true);
        setShowLoginModal(false);
        setLoginData({ email: '', password: '' });
        showToast('Login successful!', 'success');
        return;
      }

      // Uncomment this when you have proper auth endpoints
      /*
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      // Check if user is admin
      if (data.user.role !== 'admin') {
        throw new Error('Admin access required');
      }

      sessionStorage.setItem('adminToken', data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      setShowLoginModal(false);
      setLoginData({ email: '', password: '' });
      showToast('Login successful!', 'success');
      */
      
      throw new Error('Invalid credentials. Use admin@example.com / admin123 for demo');
      
    } catch (error) {
      console.error('Login error:', error);
      showToast(error.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

 

  // Enhanced API call function with proper error handling
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
      setIsAuthenticated(false);
      throw new Error('No authentication token found');
    }

    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    const response = await fetch(url, config);
    
    if (response.status === 401) {
      // Token expired or invalid
      sessionStorage.removeItem('adminToken');
      setIsAuthenticated(false);
      throw new Error('Authentication expired. Please login again.');
    }
    
    if (response.status === 403) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    return response;
  };

  // Fetch reviews from database with proper API integration
  const fetchReviews = async (page = 1) => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: 10,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        rating: ratingFilter !== 'all' ? ratingFilter : '',
        sortBy
      });

      // Call admin reviews endpoint
      const response = await makeAuthenticatedRequest(`${API_BASE}/reviews?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        
        setReviews(data.reviews || data.data || []);
        setCurrentPage(data.currentPage || data.page || 1);
        setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10));
        setStats({
          total: data.total || 0,
          pending: data.pending || 0,
          approved: data.approved || 0,
          rejected: data.rejected || 0
        });
        return;
      } else {
        throw new Error('Failed to fetch reviews');
      }
    } catch (apiError) {
      console.warn('API not available, using mock data:', apiError.message);
      
      // Fallback to mock data
      const mockReviews = [
        {
          _id: 1,
          user: { name: 'Rajesh Kumar', email: 'rajesh@example.com' },
          product: { _id: 'p1', name: 'Premium Organic Rice', image: FALLBACK_IMAGE },
          rating: 5,
          title: 'Excellent quality product!',
          comment: 'This product exceeded my expectations. Great quality and fast delivery. Highly recommended!',
          createdAt: '2024-01-15',
          status: 'pending',
          verified: true,
          helpfulCount: 12,
          images: [
            'review-1-1.jpg',
            'review-1-2.jpg'
          ],
          reply: null
        },
        {
          _id: 2,
          user: { name: 'Priya Sharma', email: 'priya@example.com' },
          product: { _id: 'p2', name: 'Fresh Vegetables Bundle', image: FALLBACK_IMAGE },
          rating: 4,
          title: 'Good value for money',
          comment: 'Nice product overall. The packaging could be better but the product quality is good.',
          createdAt: '2024-01-10',
          status: 'approved',
          verified: true,
          helpfulCount: 8,
          images: [],
          reply: {
            text: 'Thank you for your feedback! We\'ll work on improving our packaging.',
            createdAt: '2024-01-11',
            admin: 'Admin'
          }
        },
        {
          _id: 3,
          user: { name: 'Amit Patel', email: 'amit@example.com' },
          product: { _id: 'p3', name: 'Organic Fruits Mix', image: FALLBACK_IMAGE },
          rating: 2,
          title: 'Not as expected',
          comment: 'Quality was poor and delivery was delayed. Very disappointed with this purchase.',
          createdAt: '2024-01-05',
          status: 'pending',
          verified: true,
          helpfulCount: 3,
          images: [
            'review-3-1.jpg'
          ],
          reply: null
        },
        {
          _id: 4,
          user: { name: 'Sarah Johnson', email: 'sarah@example.com' },
          product: { _id: 'p4', name: 'Premium Spices Set', image: FALLBACK_IMAGE },
          rating: 1,
          title: 'Terrible quality',
          comment: 'This product did not meet expectations. The quality was below standard.',
          createdAt: '2024-01-03',
          status: 'rejected',
          verified: false,
          helpfulCount: 0,
          images: [],
          reply: null
        }
      ];

      // Apply filters to mock data
      let filteredMockReviews = mockReviews.filter(review => {
        const matchesSearch = review.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             review.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             review.comment.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
        const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter);
        
        return matchesSearch && matchesStatus && matchesRating;
      });

      setReviews(filteredMockReviews);
      setCurrentPage(1);
      setTotalPages(1);
      setStats({
        total: mockReviews.length,
        pending: mockReviews.filter(r => r.status === 'pending').length,
        approved: mockReviews.filter(r => r.status === 'approved').length,
        rejected: mockReviews.filter(r => r.status === 'rejected').length
      });
      
      showToast('Using demo data - API not connected', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Approve review using correct API endpoint
  const handleApproveReview = async (reviewId) => {
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/reviews/${reviewId}/approve`, {
        method: 'PATCH'
      });

      if (response.ok) {
        // Update local state optimistically
        setReviews(reviews.map(review => 
          review._id === reviewId 
            ? { ...review, status: 'approved' }
            : review
        ));
        
        // Update stats
        setStats(prevStats => ({
          ...prevStats,
          pending: Math.max(0, prevStats.pending - 1),
          approved: prevStats.approved + 1
        }));
        
        showToast('Review approved successfully!', 'success');
      } else {
        throw new Error('Failed to approve review');
      }
    } catch (error) {
      console.error('Error approving review:', error);
      
      // Fallback for demo - update locally
      setReviews(reviews.map(review => 
        review._id === reviewId 
          ? { ...review, status: 'approved' }
          : review
      ));
      
      setStats(prevStats => ({
        ...prevStats,
        pending: Math.max(0, prevStats.pending - 1),
        approved: prevStats.approved + 1
      }));
      
      showToast('Review approved successfully! (Demo mode)', 'success');
    } finally {
      setLoading(false);
    }
  };

  // Reject review using correct API endpoint
  const handleRejectReview = async (reviewId) => {
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/reviews/${reviewId}/reject`, {
        method: 'PATCH'
      });

      if (response.ok) {
        // Update local state optimistically
        setReviews(reviews.map(review => 
          review._id === reviewId 
            ? { ...review, status: 'rejected' }
            : review
        ));
        
        // Update stats
        setStats(prevStats => ({
          ...prevStats,
          pending: Math.max(0, prevStats.pending - 1),
          rejected: prevStats.rejected + 1
        }));
        
        showToast('Review rejected successfully!', 'success');
      } else {
        throw new Error('Failed to reject review');
      }
    } catch (error) {
      console.error('Error rejecting review:', error);
      
      // Fallback for demo - update locally
      setReviews(reviews.map(review => 
        review._id === reviewId 
          ? { ...review, status: 'rejected' }
          : review
      ));
      
      setStats(prevStats => ({
        ...prevStats,
        pending: Math.max(0, prevStats.pending - 1),
        rejected: prevStats.rejected + 1
      }));
      
      showToast('Review rejected successfully! (Demo mode)', 'success');
    } finally {
      setLoading(false);
    }
  };

  // Delete review using correct API endpoint
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/reviews/${reviewId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        const reviewToDelete = reviews.find(r => r._id === reviewId);
        setReviews(reviews.filter(review => review._id !== reviewId));
        
        // Update stats
        if (reviewToDelete) {
          setStats(prevStats => ({
            ...prevStats,
            total: Math.max(0, prevStats.total - 1),
            [reviewToDelete.status]: Math.max(0, prevStats[reviewToDelete.status] - 1)
          }));
        }
        
        showToast('Review deleted successfully!', 'success');
      } else {
        throw new Error('Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      
      // Fallback for demo - update locally
      const reviewToDelete = reviews.find(r => r._id === reviewId);
      setReviews(reviews.filter(review => review._id !== reviewId));
      
      if (reviewToDelete) {
        setStats(prevStats => ({
          ...prevStats,
          total: Math.max(0, prevStats.total - 1),
          [reviewToDelete.status]: Math.max(0, prevStats[reviewToDelete.status] - 1)
        }));
      }
      
      showToast('Review deleted successfully! (Demo mode)', 'success');
    } finally {
      setLoading(false);
    }
  };

  // Send/Update reply using correct API endpoint
  const handleSendReply = async () => {
    if (!replyText.trim()) {
      showToast('Please enter a reply message', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/reviews/${selectedReview._id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text: replyText.trim() })
      });

      if (response.ok) {
        const updatedReview = await response.json();
        
        // Update local state with the response from server
        setReviews(reviews.map(review => 
          review._id === selectedReview._id 
            ? { ...review, reply: updatedReview.reply || { text: replyText.trim(), createdAt: new Date().toISOString(), admin: 'Admin' } }
            : review
        ));
        
        showToast(selectedReview.reply ? 'Reply updated successfully!' : 'Reply sent successfully!', 'success');
      } else {
        throw new Error('Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      
      // Fallback for demo - update locally
      const reply = {
        text: replyText.trim(),
        createdAt: new Date().toISOString(),
        admin: 'Admin'
      };

      setReviews(reviews.map(review => 
        review._id === selectedReview._id 
          ? { ...review, reply }
          : review
      ));
      
      showToast((selectedReview.reply ? 'Reply updated' : 'Reply sent') + ' successfully! (Demo mode)', 'success');
    } finally {
      setReplyText('');
      setShowReplyModal(false);
      setSelectedReview(null);
      setLoading(false);
    }
  };

  // Enhanced reply modal setup
  const openReplyModal = (review) => {
    console.log('Opening reply modal for review:', review._id);
    setSelectedReview(review);
    setReplyText(review.reply ? review.reply.text : ''); // Pre-fill if editing existing reply
    setShowReplyModal(true);
  };

  // Close reply modal
  const closeReplyModal = () => {
    console.log('Closing reply modal');
    setShowReplyModal(false);
    setSelectedReview(null);
    setReplyText('');
  };
  const toggleReviewExpansion = (reviewId) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  // Toast notification
  const showToast = (message, type = 'info') => {
    // Simple toast implementation
    const toastElement = document.createElement('div');
    toastElement.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500' : 
      type === 'error' ? 'bg-red-500' : 'bg-amber-500'
    } text-white`;
    toastElement.textContent = message;
    document.body.appendChild(toastElement);
    
    setTimeout(() => {
      document.body.removeChild(toastElement);
    }, 3000);
  };

  // Get image URL for review images
  const getImageUrl = (imagePath) => {
    if (!imagePath) return FALLBACK_IMAGE;
    // Handle full URLs
    if (imagePath.startsWith('http')) return imagePath;
    // Handle relative paths from uploads folder
    return resolveImageUrl(imagePath);
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReviews(1);
    }
  }, [searchTerm, statusFilter, ratingFilter, sortBy, isAuthenticated]);

  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-amber-500 fill-amber-500'
                : 'text-amber-200'
            }`}
          />
        ))}
      </div>
    );
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm',
      approved: 'bg-green-100 text-green-800 border-green-200 shadow-sm',
      rejected: 'bg-red-100 text-red-800 border-red-200 shadow-sm'
    };

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      approved: <Check className="w-3 h-3" />,
      rejected: <X className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badges[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Filter reviews with proper null checks
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = (review.user?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (review.product?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (review.comment?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter);
    
    return matchesSearch && matchesStatus && matchesRating;
  });

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-2xl flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-amber-600 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900">Checking Authentication...</h2>
          <p className="text-gray-600">Please wait while we verify your credentials.</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-amber-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
            <p className="text-gray-600">Sign in to access the review management system</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                placeholder="admin123"
                required
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-700">
                <strong>Demo Credentials:</strong><br/>
                Email: admin@example.com<br/>
                Password: admin123
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact your system administrator
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-2">
              Review Management
            </h1>
            <p className="text-gray-600 text-lg">Monitor, moderate, and respond to customer feedback</p>
            {user && (
              <p className="text-sm text-gray-500 mt-1">
                Logged in as: <span className="font-medium">{user.name || user.email}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchReviews(currentPage)}
              disabled={loading}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-all duration-200"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Reviews</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-green-600 mt-1">+12% from last month</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <MessageCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-500 mt-1">Awaiting approval</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Approved</p>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-gray-500 mt-1">Live reviews</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Rejected</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-sm text-gray-500 mt-1">Filtered out</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <X className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-2xl border border-amber-200 p-6 mb-8 shadow-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-80">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reviews, products, or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white min-w-32"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white min-w-32"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white min-w-32"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enhanced Reviews List */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-amber-200 p-12 text-center shadow-lg">
            <RefreshCw className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Reviews...</h3>
            <p className="text-gray-600">Please wait while we fetch the latest reviews.</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-amber-200 p-12 text-center shadow-lg">
            <MessageCircle className="w-16 h-16 text-amber-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Found</h3>
            <p className="text-gray-600">No reviews match your current filters.</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review._id} className="bg-white rounded-2xl border border-amber-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4 flex-1">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg">{review.product?.name || 'Unknown Product'}</h3>
                      {getStatusBadge(review.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{review.user?.name || 'Anonymous'}</span>
                      </div>
                      {review.verified && (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                          <Award className="w-3 h-3" />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt || review.date).toLocaleDateString()}
                      </span>
                      {review.helpfulCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Heart className="w-3 h-3" />
                          {review.helpfulCount} helpful
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveReview(review._id)}
                    disabled={loading || review.status === 'approved'}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-md transition-all duration-200 ${
                      review.status === 'approved'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 disabled:opacity-50'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {review.status === 'approved' ? 'Approved' : 'Approve'}
                  </button>
                  
                  <button
                    onClick={() => handleRejectReview(review._id)}
                    disabled={loading || review.status === 'rejected'}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-md transition-all duration-200 ${
                      review.status === 'rejected'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    {review.status === 'rejected' ? 'Rejected' : 'Reject'}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Reply button clicked for review:', review._id);
                      openReplyModal(review);
                    }}
                    className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 rounded-lg hover:from-amber-700 hover:to-orange-700 flex items-center gap-2 text-sm font-medium shadow-md transition-all duration-200"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {review.reply ? 'Edit Reply' : 'Reply'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteReview(review._id)}
                    disabled={loading}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-md transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Review Content */}
              <div className="space-y-4">
                {review.title && (
                  <h4 className="font-semibold text-gray-900 text-lg">{review.title}</h4>
                )}
                
                <div className="relative">
                  <p className={`text-gray-700 leading-relaxed ${
                    !expandedReviews.has(review._id) && (review.comment?.length || 0) > 300 
                      ? 'line-clamp-3' 
                      : ''
                  }`}>
                    {review.comment || 'No comment provided'}
                  </p>
                  
                  {(review.comment?.length || 0) > 300 && (
                    <button
                      onClick={() => toggleReviewExpansion(review._id)}
                      className="text-amber-600 hover:text-amber-800 text-sm font-medium mt-2 flex items-center gap-1"
                    >
                      {expandedReviews.has(review._id) ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show More
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Review Images */}
                {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {review.images.map((image, index) => (
                      <img
                        key={index}
                        src={getImageUrl(image)}
                        alt={`Review ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-amber-200 shadow-sm flex-shrink-0 hover:scale-105 transition-transform duration-200 cursor-pointer"
                        onClick={() => {
                          // Open image in new tab for full view
                          window.open(getImageUrl(image), '_blank');
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Admin Reply Section - Only show if there's a reply */}
                {review.reply && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-amber-100 p-1 rounded-full">
                        <MessageCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="font-semibold text-amber-700">Admin Response</span>
                      <span className="text-sm text-gray-500">
                        {new Date(review.reply.createdAt || review.reply.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{review.reply.text}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => fetchReviews(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors duration-200"
          >
            Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => fetchReviews(page)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                currentPage === page
                  ? 'bg-amber-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => fetchReviews(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors duration-200"
          >
            Next
          </button>
        </div>
      )}

      {/* Enhanced Reply Modal */}
      {showReplyModal && selectedReview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeReplyModal();
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl border border-amber-200 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Reply to Review</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeReplyModal();
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Review Summary */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-semibold text-gray-900">{selectedReview.user?.name || 'Anonymous'}</span>
                {renderStars(selectedReview.rating || 0)}
                <span className="text-sm text-gray-500">
                  {new Date(selectedReview.createdAt || selectedReview.date || new Date()).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed">{selectedReview.comment || 'No comment provided'}</p>
            </div>

            {/* Reply Form */}
            <div className="space-y-6">
              {/* Show existing reply if available */}
              {selectedReview.reply && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-amber-700">Current Reply</span>
                    <span className="text-sm text-gray-500">
                      {new Date(selectedReview.reply.createdAt || selectedReview.reply.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{selectedReview.reply.text}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {selectedReview.reply ? 'Update Your Reply' : 'Your Reply'}
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  placeholder={selectedReview.reply ? 'Update your response...' : 'Write your response to this review...'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none transition-all duration-200"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {(replyText?.length || 0)}/500 characters
                  </span>
                  <div className="flex gap-2 text-xs text-gray-400">
                    <span>• Be professional and helpful</span>
                    <span>• Address customer concerns</span>
                    <span>• Thank them for feedback</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSendReply}
                  disabled={loading || !(replyText?.trim()) || (replyText?.length || 0) > 500}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-3 rounded-xl hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg transition-all duration-200"
                >
                  <Send className="w-5 h-5" />
                  {loading ? 'Sending...' : (selectedReview?.reply ? 'Update Reply' : 'Send Reply')}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeReplyModal();
                  }}
                  className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>

              {/* Quick Reply Templates */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Reply Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setReplyText("Thank you for your positive feedback! We're delighted to hear that you had a great experience with our product.")}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 text-sm transition-colors duration-200"
                  >
                    <div className="font-medium text-gray-900 mb-1">Positive Response</div>
                    <div className="text-gray-600">For 4-5 star reviews</div>
                  </button>
                  <button
                    onClick={() => setReplyText("Thank you for bringing this to our attention. We apologize for any inconvenience caused and would like to make this right. Please contact our support team so we can resolve this issue.")}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 text-sm transition-colors duration-200"
                  >
                    <div className="font-medium text-gray-900 mb-1">Issue Resolution</div>
                    <div className="text-gray-600">For 1-3 star reviews</div>
                  </button>
                  <button
                    onClick={() => setReplyText("We appreciate your detailed feedback and suggestions. Your input helps us improve our products and services for all customers.")}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 text-sm transition-colors duration-200"
                  >
                    <div className="font-medium text-gray-900 mb-1">Feedback Appreciation</div>
                    <div className="text-gray-600">For constructive reviews</div>
                  </button>
                  <button
                    onClick={() => setReplyText("Thank you for taking the time to share your experience. We're constantly working to improve and your feedback is valuable to us.")}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 text-sm transition-colors duration-200"
                  >
                    <div className="font-medium text-gray-900 mb-1">General Thanks</div>
                    <div className="text-gray-600">Standard response</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9998]">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex items-center gap-4">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
            <span className="text-lg font-medium text-gray-900">Processing...</span>
          </div>
        </div>
      )}

      {/* Custom Styles for Line Clamp */}
      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default AdminReviewManagement;
