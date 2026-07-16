import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  // Smooth scroll to top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/users/reset-password/${token}`, {
        password,
        confirmPassword
      });
      setResetComplete(true);
      toast.success('Password reset successful');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-6 sm:py-12 px-3 sm:px-4 lg:px-8">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="bg-green-100 p-2 sm:p-3 rounded-full border border-green-200">
                <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
              </div>
            </div>
            <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
              Password Reset Complete
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your password has been successfully reset
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-4 sm:p-6">
            <div className="text-center">
              <p className="text-gray-700 mb-4">
                You can now sign in with your new password
              </p>
              <Link
                to="/admin/login"
                className="inline-flex items-center justify-center w-full py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign in with new password
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-4 sm:p-6">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="appearance-none relative block w-full px-3 py-2 sm:py-3 pr-10 border border-amber-200 placeholder-amber-400 text-gray-900 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base hover:border-amber-300 transition-colors duration-200"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
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
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="appearance-none relative block w-full px-3 py-2 sm:py-3 pr-10 border border-amber-200 placeholder-amber-400 text-gray-900 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base hover:border-amber-300 transition-colors duration-200"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    {showConfirmPassword ? (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 hover:text-amber-700 transition-colors duration-200" />
                    ) : (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 hover:text-amber-700 transition-colors duration-200" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <h4 className="text-sm font-medium text-amber-800 mb-2">Password Requirements:</h4>
              <ul className="text-xs text-amber-700 space-y-1">
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  At least 8 characters long
                </li>
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  One uppercase letter
                </li>
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  One lowercase letter
                </li>
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${/\d/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  One number
                </li>
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${/[@$!%*?&]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  One special character (@$!%*?&)
                </li>
              </ul>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || password !== confirmPassword || password.length < 8}
                className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  </span>
                ) : null}
                Reset Password
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/admin/login"
                className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors duration-200"
              >
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;