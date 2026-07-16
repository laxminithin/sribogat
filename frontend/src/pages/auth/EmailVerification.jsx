import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../../services/api';

const EmailVerification = () => {
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const { token } = useParams();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        toast.error('Verification token is missing');
        return;
      }

      try {
        console.log('Attempting to verify email with token:', token);
        const response = await api.get(`/users/verify-email/${token}`);
        console.log('Verification response:', response.data);
        setStatus('success');
        toast.success('Email verified successfully!');
      } catch (err) {
        console.error('Verification error:', err.response?.data || err.message);
        setStatus('error');
        toast.error(
          err.response?.data?.error || 
          err.response?.data?.message || 
          'Email verification failed'
        );
      }
    };

    verifyEmail();
  }, [token]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-amber-100 p-3 rounded-full border border-amber-200">
                <Loader className="h-12 w-12 text-amber-600 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying your email
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
            <div className="mt-4">
              <div className="w-full bg-amber-200 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 h-1.5 rounded-full animate-pulse" style={{width: '70%'}}></div>
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full border border-green-200 animate-bounce">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-lg text-base font-medium text-white bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 transition-all duration-200 hover:shadow-xl transform hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full border border-red-200">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-6">
              The verification link is invalid or has expired. Please try registering again.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-lg text-base font-medium text-white bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 transition-all duration-200 hover:shadow-xl transform hover:scale-105"
            >
              Register Again
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-xl border border-amber-200">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerification;