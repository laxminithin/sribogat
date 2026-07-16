import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const hasInit = useRef(false);

  // ✅ Load auth data from storage
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;

    const tokenSources = [
      { token: localStorage.getItem('adminToken'), user: localStorage.getItem('adminUser'), role: 'admin' },
      { token: sessionStorage.getItem('adminToken'), user: sessionStorage.getItem('adminUser'), role: 'admin' },
      { token: localStorage.getItem('kissanbandi_token'), user: localStorage.getItem('kissanbandi_user'), role: 'user' },
      { token: sessionStorage.getItem('kissanbandi_token'), user: sessionStorage.getItem('kissanbandi_user'), role: 'user' },
    ];

    for (const source of tokenSources) {
      if (source.token && source.user) {
        try {
          const parsedUser = JSON.parse(source.user);
          setUser(parsedUser);
          setIsAuthenticated(true);
          api.defaults.headers.common['Authorization'] = `Bearer ${source.token}`;
          break;
        } catch (error) {
          console.error("Error parsing stored user:", error);
        }
      }
    }

    setLoading(false);
  }, []);

  // ✅ Refresh token if needed
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const response = await api.post('/auth/refresh-token');
        const { token } = response.data;
        const isAdmin = user?.role === 'admin';
        const useLocalStorage = isAdmin
          ? Boolean(localStorage.getItem('adminToken'))
          : Boolean(localStorage.getItem('kissanbandi_token'));
        const storage = useLocalStorage ? localStorage : sessionStorage;

        if (isAdmin) {
          storage.setItem('adminToken', token);
        } else {
          storage.setItem('kissanbandi_token', token);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        logout();
      }
    };

    if (isAuthenticated) {
      const interval = setInterval(refreshToken, 23 * 60 * 60 * 1000); // every 23 hours
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const resendVerificationEmail = async (email) => {
    try {
      await api.post('/users/resend-verification', { email });
      toast.success('Verification email sent! Please check your inbox.');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send verification email');
      return false;
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await api.post('/users/login', { email, password });
      const { token, user: userData } = response.data;

      // ✅ BLOCK ADMIN USERS FROM REGULAR LOGIN
      if (userData.role === 'admin') {
        console.warn('Admin login attempt blocked in regular login:', userData.email);
        throw new Error('Admin access is restricted. Please use the admin panel.');
      }

      // Only proceed for non-admin users
      setUser(userData);
      setIsAuthenticated(true);

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('kissanbandi_token', token);
      storage.setItem('kissanbandi_user', JSON.stringify(userData));

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return { token, user: userData };

    } catch (error) {
      // Handle email verification error
      if (error.response?.data?.error === "Please verify your email first") {
        const shouldResend = window.confirm(
          "Your email is not verified. Would you like us to resend the verification email?"
        );
        if (shouldResend) {
          await resendVerificationEmail(email);
        } else {
          toast.error("Please verify your email before logging in.");
        }
        throw new Error('EMAIL_NOT_VERIFIED');
      }
      
      // Re-throw the error (including admin restriction error)
      throw error;
    }
  };

  const adminLogin = async (email, password, rememberMe = false) => {
    try {
      const response = await api.post('/users/admin/login', { email, password });
      const { token, user: userData } = response.data;

      if (userData.role !== 'admin') throw new Error('Unauthorized access');

      setUser(userData);
      setIsAuthenticated(true);

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('adminToken', token);
      storage.setItem('adminUser', JSON.stringify(userData));

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    ['kissanbandi_token', 'kissanbandi_user', 'adminToken', 'adminUser'].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    delete api.defaults.headers.common['Authorization'];
    navigate('/');
  };

  const checkSession = async () => {
    try {
      const res = await api.get('/users/check-session');
      return res.data.valid;
    } catch {
      logout();
      return false;
    }
  };

  const updateUser = async (userData) => {
    try {
      setUser(userData);

      const isLocal = localStorage.getItem('kissanbandi_token') || localStorage.getItem('adminToken');
      const storage = isLocal ? localStorage : sessionStorage;

      if (userData.role === 'admin') {
        storage.setItem('adminUser', JSON.stringify(userData));
      } else {
        storage.setItem('kissanbandi_user', JSON.stringify(userData));
      }

      return true;
    } catch (err) {
      console.error('Failed to update user:', err);
      return false;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    adminLogin,
    logout,
    checkSession,
    updateUser
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
