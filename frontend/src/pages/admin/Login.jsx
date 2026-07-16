import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../pages/checkout/AuthProvider';
import { toast } from 'react-hot-toast';
import { Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLogin, isAuthenticated, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  // Smooth scroll to top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await adminLogin(email, password, rememberMe);

      toast.success('Login successful');
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
      
      // Clear form fields on error
      setEmail('');
      setPassword('');
      setRememberMe(false);
      
      // Force redirect to admin login page
      setTimeout(() => {
        navigate('/admin/login', { replace: true, state: { error: err.message } });
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-6 sm:py-12 px-3 sm:px-4 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="bg-amber-100 p-2 sm:p-3 rounded-full border border-amber-200">
              <Lock className="h-8 w-8 sm:h-12 sm:w-12 text-amber-700" />
            </div>
          </div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in to access the admin dashboard
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-4 sm:p-6">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-500 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 sm:py-3 border border-amber-200 placeholder-amber-400 text-gray-500 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base hover:border-amber-300 transition-colors duration-200"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="appearance-none relative block w-full px-3 py-2 sm:py-3 pr-10 border border-amber-200 placeholder-amber-400 text-gray-900 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base hover:border-amber-300 transition-colors duration-200"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 hover:text-amber-700 transition-colors duration-200" />
                    ) : (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 hover:text-amber-700 transition-colors duration-200" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  </span>
                ) : null}
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;