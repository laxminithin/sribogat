import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../pages/checkout/AuthProvider';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  console.log('AdminRoute Check:', {
    isAuthenticated,
    userRole: user?.role,
    path: location.pathname
  });

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to admin login');
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    console.log('Not admin role, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('Admin access granted');
  return children;
};

export default AdminRoute; 