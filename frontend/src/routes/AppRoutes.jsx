import { Routes, Route } from 'react-router-dom';
import Layout from '../layouts/Layout';
import AdminLayout from '../pages/admin/AdminLayout';
import AdminRoute from '../components/auth/AdminRoute';
import PrivateRoute from '../components/auth/PrivateRoute';

import Home from '../pages/home/Home';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import AdminLogin from '../pages/admin/Login';
import AdminRoutes from './AdminRoutes';
import CheckoutPage from '../pages/checkout/CheckoutPage';
import SearchResults from '../pages/SearchResults';
import Profile from '../pages/profile/Profile';
import Orders from '../pages/orders/Orders';
import Wishlist from '../pages/wishlist/Wishlist';

// Blog imports
import BlogsPage from '../pages/BlogsPage';
import BlogDetail from '../pages/BlogDetail';

import SeasonalFruits from '../pages/fruits/seasonal';
import ExoticFruits from '../pages/fruits/ExoticFruits';
import FreshVegetables from '../pages/vegetables/FreshVegetables';
import OrganicFruits from '../pages/fruits/OrganicFruits';
import OrganicVegetables from '../pages/vegetables/OrganicVegetables';
import RootVegetables from '../pages/vegetables/RootVegetables';
import SeasonalVegetables from '../pages/vegetables/SeasonalVegetables';
import AllProductsPage from '../pages/home/allProducts';
import FruitsVeg from '../pages/vegetables/FruitsVeg';
import RefundPolicy from '../pages/orderRefundPolicy/RefundPolicy';
import ProductReviewPage from '../pages/vegetables/Feedback/ProductReviewPage';
import ProductDetailPage from "../pages/vegetables/ProductDetailPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="admin/login" element={<AdminLogin />} />
        <Route path="search" element={<SearchResults />} />
        <Route path="policy" element={<RefundPolicy />} />

   {/* 📝 Blog Routes */}
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="blog/:id" element={<BlogDetail />} />

        {/* 🥦 Fruits & Vegetables routes */}
        <Route path="category/fruits/seasonal-fruits" element={<SeasonalFruits />} />
        <Route path="category/fruits/exotic-fruits" element={<ExoticFruits />} />
        <Route path="category/fruits/organic-fruits" element={<OrganicFruits />} />
        
        <Route path="category/vegetables/organic-vegetables" element={<OrganicVegetables />} />
        <Route path="products" element={<AllProductsPage />} />
        <Route path="category/vegetables/fresh-vegetables" element={<FreshVegetables />} />
        <Route path="category/vegetables/seasonal-vegetables" element={<SeasonalVegetables />} />
        <Route path="category/vegetables/root-vegetables" element={<RootVegetables/>} />
        <Route path="category/vegetables/fruits-veg" element={<FruitsVeg />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="write-review" element ={<ProductReviewPage/>} />
        {/* Protected Routes */}
        <Route
          path="profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="wishlist"
          element={
            <PrivateRoute>
              <Wishlist />
            </PrivateRoute>
          }
        />
        <Route path="checkout" element={<CheckoutPage />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminLayout>
              <AdminRoutes />
            </AdminLayout>
          </AdminRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
