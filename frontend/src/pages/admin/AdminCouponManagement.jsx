
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import config from '../../config/config';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ToggleLeft, 
  ToggleRight, 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp,
  Search,
  Filter,
  Download,
  X,
  Check,
  AlertCircle,
  Gift,
  Percent,
  ShoppingCart,
  Clock,
  Target,
  BarChart3
} from 'lucide-react';

const AdminCouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCoupons, setSelectedCoupons] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedCouponStats, setSelectedCouponStats] = useState(null);
  const [summary, setSummary] = useState({});

  // Form state for creating/editing coupons
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    maxDiscountAmount: '',
    minOrderValue: '',
    maxUsageCount: '',
    usagePerUser: '1',
    startDate: '',
    endDate: '',
    budget: '',
    isActive: true,
    allowedUserEmails: '',
    applicableProducts: [],
    excludedProducts: [],
    applicableCategories: [],
    userGroups: 'all'
  });
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  const [errors, setErrors] = useState({});

  // API Base URL - Update this to match your backend
  const API_BASE_URL = `${config.API_URL}/coupons`;

  // Get auth token — AuthProvider stores it in localStorage (Remember me) or sessionStorage
  const getAuthToken = () => {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
  };

  // FIXED: Enhanced API Helper function with better error handling
  const apiCall = async (url, options = {}) => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      console.log('🔍 API Call Debug:', {
        url: `${API_BASE_URL}${url}`,
        method: options.method || 'GET',
        hasToken: !!token,
        body: options.body ? JSON.parse(options.body) : null
      });

      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      console.log('🔍 Response Status:', response.status);

      // Get response text first to handle both JSON and non-JSON responses
      const responseText = await response.text();
      // console.log('🔍 Response Text:', responseText);

      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        const errorMessage = responseData.error || 
                           responseData.message || 
                           `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ API Error Response:', responseData);
        throw new Error(errorMessage);
      }

      return responseData;
    } catch (error) {
      console.error('❌ API Call Failed:', error);
      throw error;
    }
  };

  // Load coupons from API
  useEffect(() => {
    loadCoupons();
    loadProducts();
  }, []);

  // Product list for the "applicable products" selector
  const loadProducts = async () => {
    try {
      const response = await fetch(`${config.API_URL}/products`);
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/', {
        method: 'GET'
      });
      
      if (response.success) {
        setCoupons(response.data);
        setSummary(response.summary || {});
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      showToast('Failed to load coupons: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced toast notification
  const showToast = (message, type = 'success') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Generate code from title
    if (name === 'title' && !editingCoupon) {
      const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 12);
      setFormData(prev => ({
        ...prev,
        code: code
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.code.trim()) newErrors.code = 'Coupon code is required';
    if (formData.code.length < 3) newErrors.code = 'Code must be at least 3 characters';
    if (!formData.discountValue || formData.discountValue <= 0) {
      newErrors.discountValue = 'Discount value must be greater than 0';
    }
    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      newErrors.discountValue = 'Percentage cannot exceed 100%';
    }
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (formData.budget && formData.budget <= 0) {
      newErrors.budget = 'Budget must be greater than 0';
    }
    if (formData.maxDiscountAmount && Number(formData.maxDiscountAmount) <= 0) {
      newErrors.maxDiscountAmount = 'Max discount must be greater than 0';
    }
    if (formData.allowedUserEmails.trim()) {
      const invalid = formData.allowedUserEmails
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)
        .filter(e => !/^\S+@\S+\.\S+$/.test(e));
      if (invalid.length) {
        newErrors.allowedUserEmails = `Invalid email(s): ${invalid.join(', ')}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FIXED: Enhanced form submission with proper data formatting
 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast('Please fix the errors below', 'error');
    return;
  }

  try {
    // FIXED: Build coupon data step by step to avoid issues
    const couponData = {
      title: formData.title.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : 0,
      usagePerUser: Number(formData.usagePerUser) || 1,
      isActive: Boolean(formData.isActive),
      userGroups: formData.userGroups || 'all',
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      allowedUserEmails: formData.allowedUserEmails
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean),
      applicableProducts: formData.applicableProducts || []
    };

    if (formData.maxDiscountAmount && Number(formData.maxDiscountAmount) > 0) {
      couponData.maxDiscountAmount = Number(formData.maxDiscountAmount);
    }

    // FIXED: Only add optional fields if they have valid values
    if (formData.maxUsageCount && formData.maxUsageCount.trim() !== '' && Number(formData.maxUsageCount) > 0) {
      couponData.maxUsageCount = Number(formData.maxUsageCount);
    }

    if (formData.budget && formData.budget.trim() !== '' && Number(formData.budget) > 0) {
      couponData.budget = Number(formData.budget);
    }

    // REMOVED: The problematic forEach loops that were causing issues
    // REMOVED: These lines were corrupting the data:
    // ['maxUsageCount', 'budget', 'minOrderValue', 'discountValue', 'usagePerUser'].forEach((key) => {
    //   if (couponData[key] === '') {
    //     couponData[key] = null;
    //   }
    // });

    // FIXED: Clean removal of empty values without corrupting existing data
    Object.keys(couponData).forEach(key => {
      if (couponData[key] === undefined || couponData[key] === null) {
        delete couponData[key];
      }
    });

    console.log('🔧 Submitting coupon data:', couponData);

    if (editingCoupon) {
      // Update coupon
      console.log('🔧 Updating coupon with ID:', editingCoupon._id);
      const response = await apiCall(`/${editingCoupon._id}`, {
        method: 'PUT',
        body: JSON.stringify(couponData)
      });
      
      if (response.success) {
        showToast('Coupon updated successfully!');
      }
    } else {
      // Create coupon
      console.log('🔧 Creating new coupon');
      const response = await apiCall('/', {
        method: 'POST',
        body: JSON.stringify(couponData)
      });
      
      if (response.success) {
        showToast('Coupon created successfully!');
      }
    }

    resetForm();
    setShowCreateModal(false);
    setEditingCoupon(null);
    await loadCoupons();
  } catch (error) {
    console.error('❌ Error saving coupon:', error);
    showToast(error.message || 'Failed to save coupon', 'error');
  }
};

  const resetForm = () => {
    setFormData({
      title: '',
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      maxDiscountAmount: '',
      minOrderValue: '',
      maxUsageCount: '',
      usagePerUser: '1',
      startDate: '',
      endDate: '',
      budget: '',
      isActive: true,
      allowedUserEmails: '',
      applicableProducts: [],
      excludedProducts: [],
      applicableCategories: [],
      userGroups: 'all'
    });
    setErrors({});
  };

  // FIXED: Enhanced edit handler with better date formatting
  const handleEdit = (coupon) => {
    console.log('🔧 Editing coupon:', coupon);
    setEditingCoupon(coupon);
    
    // FIXED: Better date formatting
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };

    setFormData({
      title: coupon.title || '',
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue ? coupon.discountValue.toString() : '',
      maxDiscountAmount: coupon.maxDiscountAmount ? coupon.maxDiscountAmount.toString() : '',
      minOrderValue: coupon.minOrderValue ? coupon.minOrderValue.toString() : '',
      maxUsageCount: coupon.maxUsageCount ? coupon.maxUsageCount.toString() : '',
      usagePerUser: coupon.usagePerUser ? coupon.usagePerUser.toString() : '1',
      startDate: formatDate(coupon.startDate),
      endDate: formatDate(coupon.endDate),
      budget: coupon.budget ? coupon.budget.toString() : '',
      isActive: Boolean(coupon.isActive),
      allowedUserEmails: (coupon.allowedUserEmails || []).join(', '),
      applicableProducts: coupon.applicableProducts || [],
      excludedProducts: coupon.excludedProducts || [],
      applicableCategories: coupon.applicableCategories || [],
      userGroups: coupon.userGroups || 'all'
    });
    setShowCreateModal(true);
  };

  const handleToggleStatus = async (couponId, newStatus) => {
    try {
      const response = await apiCall(`/${couponId}/toggle`, {
        method: 'PATCH'
      });
      
      if (response.success) {
        showToast(`Coupon ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        await loadCoupons();
      }
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      showToast(error.message || 'Failed to update coupon status', 'error');
    }
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const response = await apiCall(`/${couponId}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        showToast('Coupon deleted successfully!');
        await loadCoupons();
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      showToast(error.message || 'Failed to delete coupon', 'error');
    }
  };

  const loadCouponAnalytics = async (couponId) => {
    try {
      const response = await apiCall(`/${couponId}/analytics`, {
        method: 'GET'
      });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      return null;
    }
  };

  const getStatusColor = (coupon) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (!coupon.isActive) return 'text-red-600 bg-red-100';
    if (now < startDate) return 'text-blue-600 bg-blue-100';
    if (now > endDate) return 'text-gray-600 bg-gray-100';
    if (coupon.budget && coupon.budgetUtilized >= coupon.budget) return 'text-orange-600 bg-orange-100';
    if (coupon.maxUsageCount && coupon.currentUsage >= coupon.maxUsageCount) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusText = (coupon) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (!coupon.isActive) return 'Inactive';
    if (now < startDate) return 'Scheduled';
    if (now > endDate) return 'Expired';
    if (coupon.budget && coupon.budgetUtilized >= coupon.budget) return 'Budget Exhausted';
    if (coupon.maxUsageCount && coupon.currentUsage >= coupon.maxUsageCount) return 'Usage Limit Reached';
    return 'Active';
  };

 const filteredCoupons = coupons.filter(coupon => {
  const matchesSearch = (coupon.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                       (coupon.code?.toLowerCase() || '').includes(searchQuery.toLowerCase());
  
  if (filterStatus === 'all') return matchesSearch;
  
  const status = getStatusText(coupon).toLowerCase();
  
  // FIXED: Exact matching instead of includes() to prevent false matches
  switch (filterStatus.toLowerCase()) {
    case 'active':
      return matchesSearch && status === 'active';
    case 'inactive':
      return matchesSearch && status === 'inactive';
    case 'expired':
      return matchesSearch && status === 'expired';
    case 'scheduled':
      return matchesSearch && status === 'scheduled';
    default:
      return matchesSearch;
  }
});

  const calculateUtilizationPercentage = (coupon) => {
    if (!coupon.budget) return 0;
    return Math.min(100, (coupon.budgetUtilized / coupon.budget) * 100);
  };

  const calculateUsagePercentage = (coupon) => {
    if (!coupon.maxUsageCount) return 0;
    return Math.min(100, (coupon.currentUsage / coupon.maxUsageCount) * 100);
  };

  const showCouponStats = async (coupon) => {
    const analytics = await loadCouponAnalytics(coupon._id);
    setSelectedCouponStats({ ...coupon, analytics });
    setShowAnalytics(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600"></div>
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
              Coupon Management
            </h1>
            <p className="text-gray-600 mt-2">Create and manage discount coupons for your store</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Create Coupon
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { 
              title: 'Total Coupons', 
              value: summary.totalCoupons || coupons.length, 
              icon: Gift, 
              color: 'from-amber-400 to-amber-600',
              change: '+5 this month'
            },
            { 
              title: 'Active Coupons', 
              value: summary.activeCoupons || coupons.filter(c => c.isActive && getStatusText(c) === 'Active').length, 
              icon: Target, 
              color: 'from-green-400 to-green-600',
              change: '12 running'
            },
            { 
              title: 'Total Usage', 
              value: summary.totalUsage || coupons.reduce((sum, c) => sum + (c.currentUsage || 0), 0), 
              icon: Users, 
              color: 'from-blue-400 to-blue-600',
              change: '+89 this week'
            },
            { 
              title: 'Budget Utilized', 
              value: `₹${(summary.totalBudgetUtilized || coupons.reduce((sum, c) => sum + (c.budgetUtilized || 0), 0)).toLocaleString()}`, 
              icon: DollarSign, 
              color: 'from-purple-400 to-purple-600',
              change: '68% of budget'
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
                  <div className="text-sm text-amber-600 mt-2">{stat.change}</div>
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
                placeholder="Search coupons..."
                className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <select
  value={filterStatus}
  onChange={(e) => setFilterStatus(e.target.value)}
  className="px-4 py-2 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
>
  <option value="all">All Status</option>
  <option value="active">Active</option>
  <option value="inactive">Inactive</option>
  <option value="expired">Expired</option>
  <option value="scheduled">Scheduled</option>
</select>
            </div>
          </div>
        </div>

        {/* Coupons Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-amber-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Coupon Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-amber-50 transition-all duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{coupon.title}</div>
                          <div className="text-sm text-amber-600 font-mono">{coupon.code}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(coupon.startDate).toLocaleDateString()} - {new Date(coupon.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                      </div>
                      {coupon.minOrderValue > 0 && (
                        <div className="text-xs text-gray-500">Min: ₹{coupon.minOrderValue}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {coupon.currentUsage || 0} {coupon.maxUsageCount ? `/ ${coupon.maxUsageCount}` : ''}
                      </div>
                      {coupon.maxUsageCount && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-amber-600 h-2 rounded-full" 
                            style={{ width: `${calculateUsagePercentage(coupon)}%` }}
                          ></div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ₹{(coupon.budgetUtilized || 0).toLocaleString()} 
                        {coupon.budget ? ` / ₹${coupon.budget.toLocaleString()}` : ''}
                      </div>
                      {coupon.budget && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${calculateUtilizationPercentage(coupon)}%` }}
                          ></div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(coupon)}`}>
                        {getStatusText(coupon)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => showCouponStats(coupon)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-all duration-200"
                          title="View Analytics"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-all duration-200"
                          title="Edit Coupon"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(coupon._id, !coupon.isActive)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            coupon.isActive 
                              ? 'text-green-600 hover:text-green-900 hover:bg-green-100' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                          title={coupon.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {coupon.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(coupon._id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-lg transition-all duration-200"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredCoupons.length === 0 && (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">No coupons found</h3>
            <p className="text-gray-500">Create your first coupon to get started</p>
          </div>
        )}
      </div>

      {/* Create/Edit Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCoupon(null);
                  resetForm();
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., New Year Sale"
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono ${
                      errors.code ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., NEWYEAR2025"
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Describe your coupon offer..."
                />
              </div>

              {/* Discount Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type *
                  </label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="discountValue"
                      value={formData.discountValue}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                        errors.discountValue ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                      min="0"
                      max={formData.discountType === 'percentage' ? "100" : ""}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">
                        {formData.discountType === 'percentage' ? '%' : '₹'}
                      </span>
                    </div>
                  </div>
                  {errors.discountValue && <p className="text-red-500 text-sm mt-1">{errors.discountValue}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Discount Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="maxDiscountAmount"
                      value={formData.maxDiscountAmount}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                        errors.maxDiscountAmount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="No cap"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">₹</span>
                    </div>
                  </div>
                  {errors.maxDiscountAmount && <p className="text-red-500 text-sm mt-1">{errors.maxDiscountAmount}</p>}
                  <p className="text-xs text-gray-500 mt-1">Caps the discount (useful for % coupons)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Order Value
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="minOrderValue"
                      value={formData.minOrderValue}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">₹</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Usage Count
                  </label>
                  <input
                    type="number"
                    name="maxUsageCount"
                    value={formData.maxUsageCount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Unlimited"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited usage</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usage Per User *
                  </label>
                  <input
                    type="number"
                    name="usagePerUser"
                    value={formData.usagePerUser}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="1"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Limit
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                        errors.budget ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Unlimited"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">₹</span>
                    </div>
                  </div>
                  {errors.budget && <p className="text-red-500 text-sm mt-1">{errors.budget}</p>}
                  <p className="text-xs text-gray-500 mt-1">Total discount budget for this coupon</p>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
                </div>
              </div>

              {/* User Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable User Groups
                </label>
                <select
                  name="userGroups"
                  value={formData.userGroups}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">All Users</option>
                  <option value="new">New Users Only</option>
                  <option value="premium">Premium Members Only</option>
                </select>
              </div>

              {/* Customer Restriction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restrict to Specific Customers
                </label>
                <input
                  type="text"
                  name="allowedUserEmails"
                  value={formData.allowedUserEmails}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errors.allowedUserEmails ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., customer1@example.com, customer2@example.com"
                />
                {errors.allowedUserEmails && <p className="text-red-500 text-sm mt-1">{errors.allowedUserEmails}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated customer emails. Leave empty to allow everyone. Only these customers can see and use this coupon.
                </p>
              </div>

              {/* Applicable Products */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable Products
                </label>
                {/* Selected products as removable chips */}
                {formData.applicableProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.applicableProducts.map(id => {
                      const p = products.find(pr => String(pr.id) === String(id));
                      return (
                        <span key={id} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                          {p ? p.name : id}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              applicableProducts: prev.applicableProducts.filter(pid => String(pid) !== String(id))
                            }))}
                            className="hover:text-amber-950"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, applicableProducts: [] }))}
                      className="text-xs text-gray-500 hover:text-red-600 underline"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {/* Search box + select all */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products…"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  {(() => {
                    const filtered = products.filter(p => (p.name?.toLowerCase() || '').includes(productSearch.toLowerCase()));
                    const allFilteredSelected = filtered.length > 0 && filtered.every(p => formData.applicableProducts.some(id => String(id) === String(p.id)));
                    return (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applicableProducts: allFilteredSelected
                            ? prev.applicableProducts.filter(id => !filtered.some(p => String(p.id) === String(id)))
                            : [...new Set([...prev.applicableProducts, ...filtered.map(p => p.id)])]
                        }))}
                        disabled={filtered.length === 0}
                        className="whitespace-nowrap text-sm font-medium px-3 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {allFilteredSelected ? 'Deselect all' : 'Select all'}
                      </button>
                    );
                  })()}
                </div>

                {/* Checkbox list */}
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {products
                    .filter(p => (p.name?.toLowerCase() || '').includes(productSearch.toLowerCase()))
                    .map(product => {
                      const checked = formData.applicableProducts.some(id => String(id) === String(product.id));
                      return (
                        <label key={product.id} className="flex items-center gap-3 px-3 py-2 hover:bg-amber-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setFormData(prev => ({
                              ...prev,
                              applicableProducts: checked
                                ? prev.applicableProducts.filter(id => String(id) !== String(product.id))
                                : [...prev.applicableProducts, product.id]
                            }))}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                          />
                          <span className="text-sm text-gray-700 flex-1">{product.name}</span>
                          <span className="text-sm text-gray-500">₹{product.price}</span>
                        </label>
                      );
                    })}
                  {products.filter(p => (p.name?.toLowerCase() || '').includes(productSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">No products found</p>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  {formData.applicableProducts.length > 0
                    ? `${formData.applicableProducts.length} product(s) selected — discount applies only to these.`
                    : 'Leave empty to apply the discount to the whole cart.'}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Activate coupon immediately
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCoupon(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-8 py-3 rounded-xl hover:from-amber-700 hover:to-orange-800 transition-all duration-200 font-medium"
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                {selectedCouponStats ? `${selectedCouponStats.title} Analytics` : 'Coupon Analytics Overview'}
              </h2>
              <button
                onClick={() => {
                  setShowAnalytics(false);
                  setSelectedCouponStats(null);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedCouponStats ? (
              // Individual Coupon Analytics
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-sm font-medium">Total Usage</p>
                        <p className="text-2xl font-bold text-blue-800">{selectedCouponStats.currentUsage || 0}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-sm font-medium">Total Sales</p>
                        <p className="text-2xl font-bold text-green-800">₹{(selectedCouponStats.totalSales || 0).toLocaleString()}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 text-sm font-medium">Budget Used</p>
                        <p className="text-2xl font-bold text-purple-800">₹{(selectedCouponStats.budgetUtilized || 0).toLocaleString()}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-600 text-sm font-medium">Conversion Rate</p>
                        <p className="text-2xl font-bold text-amber-800">
                          {selectedCouponStats.maxUsageCount ? 
                            `${(((selectedCouponStats.currentUsage || 0) / selectedCouponStats.maxUsageCount) * 100).toFixed(1)}%` : 
                            'N/A'
                          }
                        </p>
                      </div>
                      <Target className="w-8 h-8 text-amber-600" />
                    </div>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedCouponStats.maxUsageCount && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Usage Progress</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Used: {selectedCouponStats.currentUsage || 0}</span>
                          <span>Limit: {selectedCouponStats.maxUsageCount}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500" 
                            style={{ width: `${calculateUsagePercentage(selectedCouponStats)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {selectedCouponStats.maxUsageCount - (selectedCouponStats.currentUsage || 0)} uses remaining
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedCouponStats.budget && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Budget Utilization</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Used: ₹{(selectedCouponStats.budgetUtilized || 0).toLocaleString()}</span>
                          <span>Budget: ₹{selectedCouponStats.budget.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500" 
                            style={{ width: `${calculateUtilizationPercentage(selectedCouponStats)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500">
                          ₹{(selectedCouponStats.budget - (selectedCouponStats.budgetUtilized || 0)).toLocaleString()} remaining
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coupon Details */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Coupon Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Code:</span>
                      <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">{selectedCouponStats.code}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Discount:</span>
                      <span className="ml-2">
                        {selectedCouponStats.discountType === 'percentage' ? 
                          `${selectedCouponStats.discountValue}%` : 
                          `₹${selectedCouponStats.discountValue}`
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Valid Period:</span>
                      <span className="ml-2">
                        {new Date(selectedCouponStats.startDate).toLocaleDateString()} - {new Date(selectedCouponStats.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">User Group:</span>
                      <span className="ml-2 capitalize">{selectedCouponStats.userGroups}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Overall Analytics Dashboard
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Coupons</h3>
                    <p className="text-3xl font-bold text-blue-900">{coupons.length}</p>
                    <p className="text-blue-600 text-sm mt-2">
                      {coupons.filter(c => c.isActive).length} active
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Total Revenue</h3>
                    <p className="text-3xl font-bold text-green-900">
                      ₹{coupons.reduce((sum, c) => sum + (c.totalSales || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-green-600 text-sm mt-2">From coupon sales</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">Budget Utilized</h3>
                    <p className="text-3xl font-bold text-purple-900">
                      ₹{coupons.reduce((sum, c) => sum + (c.budgetUtilized || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-purple-600 text-sm mt-2">Total discounts given</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Coupons</h3>
                  <div className="space-y-3">
                    {coupons
                      .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
                      .slice(0, 5)
                      .map((coupon, index) => (
                        <div key={coupon._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{coupon.title}</div>
                              <div className="text-sm text-gray-500">{coupon.code}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">₹{(coupon.totalSales || 0).toLocaleString()}</div>
                            <div className="text-sm text-gray-500">{coupon.currentUsage || 0} uses</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponManagement;
