import config from '../config/config';

const API_BASE_URL = config.API_URL;

const getUserToken = () =>
  localStorage.getItem('kissanbandi_token') || sessionStorage.getItem('kissanbandi_token');

// Enhanced Coupon API Service with Usage Tracking
const couponApi = {
  async getAvailableCoupons(cartTotal) {
    try {
      const token = getUserToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/coupons/available?cartTotal=${cartTotal}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Failed to fetch coupons`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Coupon API Error:', error);
      throw error;
    }
  },

  async validateCoupon(code, cartTotal, cartItems) {
    try {
      const token = getUserToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, cartTotal, cartItems })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}: Invalid coupon`);
      }
      
      return data;
    } catch (error) {
      console.error('Coupon Validation Error:', error);
      throw error;
    }
  },

  async getSuggestions(cartTotal, cartItems) {
    try {
      const token = getUserToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/coupons/suggestions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cartTotal, cartItems })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Failed to get suggestions`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Coupon Suggestions Error:', error);
      throw error;
    }
  },

  // ✅ NEW: Update coupon usage statistics after successful order
  async updateCouponUsage(couponId, orderData) {
    try {
      const token = getUserToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/coupons/${couponId}/usage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: orderData.orderId,
          userId: orderData.userId,
          discountAmount: orderData.discountAmount,
          orderTotal: orderData.orderTotal,
          usedAt: orderData.usedAt || new Date().toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}: Failed to update coupon usage`);
      }

      console.log('✅ Coupon usage updated successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Coupon Usage Update Error:', error);
      throw error;
    }
  },

  // ✅ NEW: Get coupon usage statistics (optional - for admin dashboard)
  async getCouponStats(couponId) {
    try {
      const token = getUserToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/coupons/${couponId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Failed to fetch coupon stats`);
      }

      return await response.json();
    } catch (error) {
      console.error('Coupon Stats Error:', error);
      throw error;
    }
  },

  // ✅ NEW: Reserve coupon for order (prevents race conditions)
  async reserveCoupon(couponId, orderData) {
    try {
      const token = getUserToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/coupons/${couponId}/reserve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: orderData.userId,
          discountAmount: orderData.discountAmount,
          orderTotal: orderData.orderTotal,
          reservationTimeout: 600000 // 10 minutes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}: Failed to reserve coupon`);
      }

      return data;
    } catch (error) {
      console.error('Coupon Reservation Error:', error);
      throw error;
    }
  },

  // ✅ NEW: Release coupon reservation (if payment fails)
  async releaseCouponReservation(couponId, reservationId) {
    try {
      const token = getUserToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/coupons/${couponId}/release`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reservationId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}: Failed to release coupon`);
      }

      return data;
    } catch (error) {
      console.error('Coupon Release Error:', error);
      throw error;
    }
  }
};

export default couponApi;
