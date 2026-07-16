import axios from 'axios';
import { toast } from 'react-hot-toast';
import config from '../config/config';

// Create axios instance with default config
const api = axios.create({
  baseURL: config.API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
  // Make sure all 2xx status codes are treated as success
  validateStatus: function (status) {
    return status >= 200 && status < 300;
  }
});

export const toFormUrlEncoded = (value, prefix = '', searchParams = new URLSearchParams()) => {
  if (value === undefined || value === null) {
    return searchParams;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const key = prefix ? `${prefix}[${index}]` : String(index);
      toFormUrlEncoded(item, key, searchParams);
    });
    return searchParams;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nextPrefix = prefix ? `${prefix}[${key}]` : key;
      toFormUrlEncoded(nestedValue, nextPrefix, searchParams);
    });
    return searchParams;
  }

  if (prefix) {
    searchParams.append(prefix, String(value));
  }

  return searchParams;
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: new Date().getTime()
      };
    }

    // Check for admin token first
    const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      return config;
    }

    // Then check for user token
    const userToken = localStorage.getItem('kissanbandi_token') || sessionStorage.getItem('kissanbandi_token');
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);

    // Network or CORS error
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response.status === 401) {
      const hadAdminSession =
        Boolean(localStorage.getItem('adminToken')) || Boolean(sessionStorage.getItem('adminToken'));

      // Clear tokens and reload page
      localStorage.removeItem('adminToken');
      localStorage.removeItem('kissanbandi_token');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('kissanbandi_user');
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('kissanbandi_token');
      sessionStorage.removeItem('adminUser');
      sessionStorage.removeItem('kissanbandi_user');
      window.location.href = hadAdminSession ? '/admin/login' : '/login';
      return Promise.reject(error);
    }

    // FIXED: Don't show automatic toast for registration endpoints
    // Let the component handle success/error messaging
    const isRegistrationEndpoint = error.config?.url?.includes('/users/register');
    const isLoginEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/users/login');
    
    // Don't show automatic toasts for auth endpoints - let components handle them
    if (!isRegistrationEndpoint && !isLoginEndpoint) {
      const message = error.response?.data?.error || error.message || 'An error occurred';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Products API
export const productsApi = {
  // Get all products with optional filters
  getAllProducts: async (filters = {}) => {
    try {
      console.log('🔄 Fetching products with filters:', filters);

      const timestamp = Date.now();

      const response = await api.get('/products', {
        params: { ...filters, _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const { data } = response;

      // Debug full API response structure
      console.log('✅ API response received:', data);

      // Normalize the data
      let products = [];

      if (Array.isArray(data)) {
        products = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.products)) {
          products = data.products;
        } else if (Array.isArray(data.data)) {
          products = data.data;
        }
      }

      // Fallback check
      if (!Array.isArray(products)) {
        console.warn('⚠️ Unexpected products format. Setting to empty array.');
        products = [];
      }

      console.log('📦 Products to return:', products);
      return products;

    } catch (error) {
      console.error('❌ Error fetching products:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // Enhanced Get product by ID - Updated for ProductDetailPage
  getProductById: async (id) => {
    try {
      console.log('🔄 Fetching product by ID:', id);
      
      if (!id) {
        throw new Error('Product ID is required');
      }

      const timestamp = Date.now();
      const response = await api.get(`/products/${id}`, {
        params: { _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const { data } = response;
      console.log('✅ Product detail API response:', data);

      // Handle different response structures
      let product = null;

      if (data && typeof data === 'object') {
        if (data.success && data.data) {
          // Response format: { success: true, data: product }
          product = data.data;
        } else if (data._id || data.id) {
          // Direct product object
          product = data;
        } else if (data.product) {
          // Response format: { product: product }
          product = data.product;
        }
      }

      if (!product) {
        throw new Error('Product not found or invalid response format');
      }

      // Validate required fields
      if (!product._id && !product.id) {
        throw new Error('Product missing required ID field');
      }

      if (!product.name) {
        console.warn('⚠️ Product missing name field');
      }

      console.log('📦 Product to return:', product);
      return product;

    } catch (error) {
      console.error('❌ Error fetching product by ID:', {
        id,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      // Enhanced error handling for product detail page
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error('Product not found');
        } else if (error.response.status === 400) {
          throw new Error('Invalid product ID');
        } else {
          throw new Error(`Server error: ${error.response.status}`);
        }
      } else if (error.request) {
        throw new Error('Network error: Unable to fetch product');
      } else {
        throw error;
      }
    }
  },

  // ✅ NEW: Upload images only (separate from product creation)
  uploadImages: async (imageFiles) => {
    try {
      console.log('🔄 Uploading images:', imageFiles.length);

      const formData = new FormData();
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      const response = await api.post('/products/upload-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Images uploaded successfully:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error uploading images:', error);
      throw error;
    }
  },

  // ✅ NEW: Upload single image
  uploadSingleImage: async (imageFile) => {
    try {
      console.log('🔄 Uploading single image');

      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await api.post('/products/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Single image uploaded successfully:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error uploading single image:', error);
      throw error;
    }
  },

  // ✅ NEW: Create product with images in one step (using your /create-with-images route)
createProductWithImages: async (productData, images = []) => {
  try {
    console.log('🔄 Creating product with images:', productData);
    console.log('🏷️ HSN Code in productData:', productData.hsn || productData.hsnCode);
    console.log('📸 Images to upload:', images.length);

    const formData = new FormData();

    // Add product data with specific HSN logging
    Object.keys(productData).forEach(key => {
      const value = productData[key];
      
      // Special logging for HSN field
      if (key === 'hsn' || key === 'hsnCode') {
        console.log(`🏷️ Processing HSN field: ${key} = "${value}"`);
      }
      
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          // Handle arrays (tags, features)
          value.forEach(item => {
            console.log(`📝 Adding array field: ${key}[] = "${item}"`);
            formData.append(key, item);
          });
        } else {
          console.log(`📝 Adding field: ${key} = "${value}"`);
          formData.append(key, value);
        }
      } else {
        console.warn(`⚠️ Skipping empty/null field: ${key} = ${value}`);
      }
    });

    // Debug: Log all FormData entries
    console.log('📋 FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (key === 'hsn' || key === 'hsnCode') {
        console.log(`🏷️ FormData HSN: ${key} = "${value}"`);
      } else {
        console.log(`📄 FormData: ${key} = ${value instanceof File ? '[File]' : value}`);
      }
    }

    // Add image files
    images.forEach((image, index) => {
      if (image instanceof File) {
        console.log(`📸 Adding image ${index + 1}: ${image.name}`);
        formData.append('images', image);
      }
    });

    const response = await api.post('/products/create-with-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('✅ Product with images created successfully:', response.data);
    
    // Check if HSN is in the response
    const createdProduct = response.data?.product || response.data?.data || response.data;
    if (createdProduct) {
      console.log('🏷️ HSN in created product:', createdProduct.hsn || createdProduct.hsnCode || 'NOT FOUND');
    }
    
    return response.data;

  } catch (error) {
    console.error('❌ Error creating product with images:', error);
    
    // Enhanced error logging
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
      console.error('❌ Response headers:', error.response.headers);
    }
    
    throw error;
  }
},

  // Create new product (admin only) - Your existing method
  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Update product (admin only) - Enhanced with image support
updateProduct: async (id, productData, images = [], replaceImages = false) => {
  try {
    console.log('🔄 Updating product:', id);
    console.log('🏷️ HSN Code in update data:', productData.hsn || productData.hsnCode);
    console.log('📸 New images:', images.length);

    // If no images, use regular JSON update
    if (!images || images.length === 0) {
      console.log('📝 Updating without images (JSON)');
      console.log('🏷️ HSN in JSON update:', productData.hsn || productData.hsnCode);
      
      const response = await api.put(`/products/${id}`, productData);
      
      // Check if HSN is in the response
      const updatedProduct = response.data?.product || response.data?.data || response.data;
      if (updatedProduct) {
        console.log('🏷️ HSN in updated product:', updatedProduct.hsn || updatedProduct.hsnCode || 'NOT FOUND');
      }
      
      return response.data;
    }

    // If images provided, use FormData
    console.log('📝 Updating with images (FormData)');
    const formData = new FormData();

    // Add product data with HSN debugging
    Object.keys(productData).forEach(key => {
      const value = productData[key];
      
      // Special logging for HSN field
      if (key === 'hsn' || key === 'hsnCode') {
        console.log(`🏷️ Processing HSN field in update: ${key} = "${value}"`);
      }
      
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => {
            console.log(`📝 Adding array field: ${key}[] = "${item}"`);
            formData.append(key, item);
          });
        } else {
          console.log(`📝 Adding field: ${key} = "${value}"`);
          formData.append(key, value);
        }
      } else {
        console.warn(`⚠️ Skipping empty/null field in update: ${key} = ${value}`);
      }
    });

    // Add replace images flag
    formData.append('replaceImages', replaceImages.toString());

    // Debug: Log all FormData entries for update
    console.log('📋 Update FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (key === 'hsn' || key === 'hsnCode') {
        console.log(`🏷️ FormData HSN: ${key} = "${value}"`);
      } else {
        console.log(`📄 FormData: ${key} = ${value instanceof File ? '[File]' : value}`);
      }
    }

    // Add new image files
    images.forEach((image, index) => {
      if (image instanceof File) {
        console.log(`📸 Adding new image ${index + 1}: ${image.name}`);
        formData.append('images', image);
      }
    });

    const response = await api.put(`/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('✅ Product updated successfully:', response.data);
    
    // Check if HSN is in the response
    const updatedProduct = response.data?.product || response.data?.data || response.data;
    if (updatedProduct) {
      console.log('🏷️ HSN in updated product:', updatedProduct.hsn || updatedProduct.hsnCode || 'NOT FOUND');
    }
    
    return response.data;

  } catch (error) {
    console.error('❌ Error updating product:', error);
    
    // Enhanced error logging
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
      console.error('❌ Response headers:', error.response.headers);
    }
    
    throw error;
  }
},

// 🔍 Debug function to test HSN field specifically
debugHSNField: async (productData) => {
  try {
    console.log('🔍 === HSN DEBUG TEST ===');
    console.log('🏷️ Original productData:', productData);
    console.log('🏷️ HSN field value:', productData.hsn);
    console.log('🏷️ HSN field type:', typeof productData.hsn);
    console.log('🏷️ HSN field length:', productData.hsn?.length);
    console.log('🏷️ HSN field isEmpty:', !productData.hsn || productData.hsn.trim() === '');
    
    // Test FormData creation
    const formData = new FormData();
    formData.append('hsn', productData.hsn || '');
    
    console.log('📋 FormData HSN test:');
    for (let [key, value] of formData.entries()) {
      if (key === 'hsn') {
        console.log(`🏷️ FormData HSN: "${value}" (type: ${typeof value})`);
      }
    }
    
    // Test JSON stringification
    console.log('🔄 JSON.stringify test:', JSON.stringify({ hsn: productData.hsn }));
    
    console.log('🔍 === END HSN DEBUG ===');
    
  } catch (error) {
    console.error('❌ HSN Debug error:', error);
  }
},

  // Delete product (admin only)
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // ✅ NEW: Update product stock
  updateStock: async (id, stock) => {
    const response = await api.patch(`/products/${id}/stock`, { stock });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/products/${id}/status`, { status });
    return response.data;
  },

  // Enhanced Get products by category
  getProductsByCategory: async (category, subcategory = null) => {
    try {
      console.log('🔄 Fetching products by category:', { category, subcategory });
      
      const params = { category };
      if (subcategory) params.subcategory = subcategory;
      
      const timestamp = Date.now();
      
      // ✅ FIXED: Use /products endpoint instead of /products/category
      const response = await api.get('/products', { 
        params: { ...params, _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const { data } = response;
      console.log('✅ Category products API response:', data);

      // Normalize the data
      let products = [];
      if (Array.isArray(data)) {
        products = data;
      } else if (data && data.success && Array.isArray(data.data)) {
        products = data.data;
      } else if (data && Array.isArray(data.products)) {
        products = data.products;
      }

      console.log('📦 Category products to return:', products);
      return products;

    } catch (error) {
      console.error('❌ Error fetching products by category:', error);
      throw error;
    }
  },

  // Enhanced Search products
  searchProducts: async (query, filters = {}) => {
    try {
      console.log('🔄 Searching products with query:', query);
      
      if (!query || query.trim().length === 0) {
        return [];
      }

      const timestamp = Date.now();
      
      // ✅ UPDATED: Use 'q' parameter instead of 'query' to match your backend
      const response = await api.get('/products/search', { 
        params: { q: query.trim(), ...filters, _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const { data } = response;
      console.log('✅ Search products API response:', data);

      // Normalize the data
      let products = [];
      if (Array.isArray(data)) {
        products = data;
      } else if (data && data.success && Array.isArray(data.data)) {
        products = data.data;
      } else if (data && Array.isArray(data.products)) {
        products = data.products;
      }

      console.log('📦 Search products to return:', products);
      return products;

    } catch (error) {
      console.error('❌ Error searching products:', error);
      throw error;
    }
  },

  // Get featured products
  getFeaturedProducts: async (limit = 8) => {
    try {
      console.log('🔄 Fetching featured products');
      
      const timestamp = Date.now();
      const response = await api.get('/products/featured', {
        params: { limit, _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const { data } = response;
      console.log('✅ Featured products API response:', data);

      // Normalize the data
      let products = [];
      if (Array.isArray(data)) {
        products = data;
      } else if (data && data.success && Array.isArray(data.data)) {
        products = data.data;
      } else if (data && Array.isArray(data.products)) {
        products = data.products;
      }

      console.log('📦 Featured products to return:', products);
      return products;

    } catch (error) {
      console.error('❌ Error fetching featured products:', error);
      throw error;
    }
  },

  // ✅ NEW: Get categories
  getCategories: async () => {
    try {
      const response = await api.get('/products/categories');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      throw error;
    }
  },

  // ✅ NEW: Get brands
  getBrands: async () => {
    try {
      const response = await api.get('/products/brands');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching brands:', error);
      throw error;
    }
  },

  // ✅ NEW: Get storage info
  getStorageInfo: async () => {
    try {
      const response = await api.get('/products/storage-info');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching storage info:', error);
      throw error;
    }
  },

  // ✅ NEW: Check upload health
  checkUploadHealth: async () => {
    try {
      const response = await api.get('/products/upload-health');
      return response.data;
    } catch (error) {
      console.error('❌ Error checking upload health:', error);
      throw error;
    }
  }
};

// Orders API - CONSOLIDATED VERSION
export const ordersApi = {
  // Get all orders for admin
  getAllOrders: async (params = {}) => {
    try {
      console.log('Fetching orders with params:', params);
      const timestamp = new Date().getTime();
      const response = await api.get('/orders/admin/all', {
        params: { ...params, _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Orders API response:', {
        status: response.status,
        data: response.data
      });

      if (!response.data) {
        throw new Error('No data received from orders endpoint');
      }

      // Return the paginated response structure
      return {
        orders: Array.isArray(response.data.orders) ? response.data.orders : [],
        total: response.data.total || 0,
        page: response.data.page || 1,
        totalPages: response.data.totalPages || 1
      };
    } catch (error) {
      console.error('Error fetching orders:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },
  
  // Get orders by date range
  getOrdersByDateRange: async (startDate, endDate) => {
    try {
      console.log('Fetching orders by date range:', { startDate, endDate });
      const timestamp = new Date().getTime();
      const response = await api.get('/orders/date-range', {
        params: {
          startDate,
          endDate,
          _t: timestamp
        },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Ensure we return an array
      const orders = Array.isArray(response.data) ? response.data :
                    Array.isArray(response.data?.orders) ? response.data.orders :
                    response.data?.data || [];
      
      return orders;
    } catch (error) {
      console.error('Error fetching orders by date range:', error);
      throw error;
    }
  },
  
  // Get order statistics
  getOrderStats: async (params = {}) => {
    try {
      console.log('Fetching order stats with params:', params);
      const timestamp = new Date().getTime();
      const response = await api.get('/orders/admin/stats', {
        params: { ...params, _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Order stats response:', response.data);

      if (!response.data) {
        throw new Error('No data received from stats endpoint');
      }

      return {
        totalOrders: response.data.totalOrders || 0,
        totalRevenue: response.data.totalRevenue || 0,
        averageOrderValue: response.data.averageOrderValue || 0,
        statusBreakdown: response.data.statusBreakdown || {},
        dailyStats: Array.isArray(response.data.dailyStats) ? response.data.dailyStats : []
      };
    } catch (error) {
      console.error('Error fetching order stats:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },
  
  // Update order status
  updateOrderStatus: async (id, status) => {
    try {
      console.log('Updating order status:', { id, status });
      const response = await api.patch(`/orders/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },
  
  // Export orders
  exportOrders: async (filters = {}) => {
    try {
      console.log('Exporting orders with filters:', filters);
      const timestamp = new Date().getTime();
      const response = await api.get('/orders/admin/export', {
        params: { ...filters, _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        responseType: 'blob'
      });

      // Verify that we received a CSV  b
      if (!response.data || !(response.data instanceof Blob)) {
        throw new Error('Invalid response format from export endpoint');
      }

      // Check content type
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('text/csv')) {
        console.warn('Unexpected content type:', contentType);
      }

      return response.data;
    } catch (error) {
      console.error('Error exporting orders:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // Get user's own orders
  getMyOrders: async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await api.get('/orders/my-orders', {
        params: { _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Normalize response
      return Array.isArray(response.data)
        ? response.data
        : response.data?.orders || response.data?.data || [];
    } catch (error) {
      console.error('Error fetching user orders:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // Get specific order by ID
  getOrder: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Create new order
  createOrder: async (orderData) => {
    const response = await api.post('/orders', toFormUrlEncoded(orderData).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  // Create Razorpay order
  createRazorpayOrder: async (data) => {
    const response = await api.post('/orders/razorpay/create', data);
    return response.data;
  },

  // Verify Razorpay payment
  verifyPayment: async (data) => {
    const response = await api.post('/orders/razorpay/verify', data);
    return response.data;
  },

  // ADMIN NOTES FUNCTIONALITY
  // Update admin note for cancelled orders
  updateAdminNote: async (orderId, data) => {
    try {
      console.log('API: Updating admin note for order:', orderId, data);
      
      const response = await api.patch(`/orders/${orderId}/admin-note`, data);
      
      console.log('API: Admin note update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error updating admin note:', error);
      
      // Enhanced error handling
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.error || 'Failed to update admin note';
        const errorDetails = error.response.data?.details || '';
        
        throw new Error(`${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network error: Unable to update admin note. Please check your connection.');
      } else {
        // Other error
        throw new Error('An unexpected error occurred while updating admin note');
      }
    }
  },

  // Get admin note history (optional)
  getAdminNoteHistory: async (orderId) => {
    try {
      console.log('API: Fetching admin note history for order:', orderId);
      
      const response = await api.get(`/orders/${orderId}/admin-note`);
      
      console.log('API: Admin note history response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error fetching admin note history:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.error || 'Failed to fetch admin note history';
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error('Network error: Unable to fetch admin note history');
      } else {
        throw new Error('An unexpected error occurred while fetching admin note history');
      }
    }
  },

  // Bulk update admin notes (optional - for future use)
  bulkUpdateAdminNotes: async (updates) => {
    try {
      console.log('API: Bulk updating admin notes:', updates);
      
      const response = await api.patch('/orders/bulk-admin-notes', { updates });
      
      console.log('API: Bulk admin note update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Error bulk updating admin notes:', error);
      throw error;
    }
  }
};

// Enhanced Users API
export const usersApi = {
  getAllCustomers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getCustomerById: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
  
  getCustomerOrders: async (id) => {
    const response = await api.get(`/users/${id}/orders`);
    return response.data;
  },
  
  getCustomerAnalytics: async (id) => {
    const response = await api.get(`/users/${id}/analytics`);
    return response.data;
  },
  
  updateCustomer: async (userId, userData) => {
    const response = await api.put(`/users/${userId}/profile`, toFormUrlEncoded(userData).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', toFormUrlEncoded(userData).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  // Enhanced Wishlist functionality
  getWishlist: async () => {
    try {
      console.log('🔄 Fetching user wishlist');
      
      const token = localStorage.getItem('kissanbandi_token') || sessionStorage.getItem('kissanbandi_token');
      if (!token) {
        console.log('ℹ️ No auth token found, returning empty wishlist');
        return [];
      }

      const timestamp = Date.now();
      const response = await api.get('/users/wishlist', {
        params: { _t: timestamp },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const { data } = response;
      console.log('✅ Wishlist API response:', data);

      // Normalize the data
      let wishlist = [];
      if (Array.isArray(data)) {
        wishlist = data;
      } else if (data && data.success && Array.isArray(data.data)) {
        wishlist = data.data;
      } else if (data && Array.isArray(data.wishlist)) {
        wishlist = data.wishlist;
      }

      console.log('📦 Wishlist to return:', wishlist);
      return wishlist;

    } catch (error) {
      console.error('❌ Error fetching wishlist:', error);
      
      // Don't throw error for wishlist - just return empty array
      if (error.response?.status === 401) {
        console.log('ℹ️ User not authenticated for wishlist');
        return [];
      }
      
      console.warn('⚠️ Wishlist fetch failed, returning empty array');
      return [];
    }
  },

  addToWishlist: async (productId) => {
    try {
      console.log('🔄 Adding product to wishlist:', productId);
      
      const response = await api.post(`/users/wishlist/${productId}`);
      
      console.log('✅ Add to wishlist response:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error adding to wishlist:', error);
      throw error;
    }
  },

  removeFromWishlist: async (productId) => {
    try {
      console.log('🔄 Removing product from wishlist:', productId);
      
      const response = await api.delete(`/users/wishlist/${productId}`);
      
      console.log('✅ Remove from wishlist response:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error removing from wishlist:', error);
      throw error;
    }
  }
};



export default api;
