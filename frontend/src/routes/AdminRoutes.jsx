import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/admin/Dashboard';
import ProductsManagement from '../pages/admin/ProductsManagement';
import Orders from '../pages/admin/AdminOrders';
import Customers from '../pages/admin/Customers';
import Analytics from '../pages/admin/Analytics';
import AdminCouponManagement from '../pages/admin/AdminCouponManagement';

const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard/>} />
      <Route path="/products" element={<ProductsManagement />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/coupons" element={<AdminCouponManagement />} />
    </Routes>
  );
};

export default AdminRoutes; 
