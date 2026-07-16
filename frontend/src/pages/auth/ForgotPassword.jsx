import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail } from 'lucide-react';
import api from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Prevent duplicate submissions
    if (isSubmittingRef.current || loading) {
      return;
    }

    try {
      setLoading(true);
      isSubmittingRef.current = true;
      
      await api.post('/users/forgot-password', { email });
      setSent(true);
      
      // Dismiss any existing toasts before showing new one
      toast.dismiss();
      toast.success('Password reset link sent to your email', {
        id: 'reset-success', // Unique ID to prevent duplicates
        duration: 4000,
      });
    } catch (err) {
      // Dismiss any existing toasts before showing new one
      toast.dismiss();
      toast.error(err.response?.data?.error || 'Failed to send reset link', {
        id: 'reset-error', // Unique ID to prevent duplicates
        duration: 4000,
      });
    } finally {
      setLoading(false);
      // Reset the submission flag after a delay
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-amber-200">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-200 rounded-full flex items-center justify-center shadow-lg">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Check your email
            </h2>
            <p className="mt-4 text-center text-sm text-gray-600 leading-relaxed">
              We've sent a password reset link to <span className="font-semibold text-amber-700">{email}</span>
            </p>
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-full text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Return to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-amber-200">
          <div>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-200 rounded-full flex items-center justify-center shadow-lg">
                <Mail className="h-8 w-8 text-amber-700" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-4 text-center text-sm text-gray-600 leading-relaxed">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 sm:text-sm"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || isSubmittingRef.current}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    </span>
                    <span className="ml-8">Sending...</span>
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="font-medium text-amber-600 hover:text-amber-700 transition-colors duration-200"
              >
                ← Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;