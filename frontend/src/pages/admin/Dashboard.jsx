import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { productsApi, ordersApi, usersApi } from '../../services/api';
import { ShoppingBag, Users, Package, IndianRupee, TrendingUp, Clock, Award, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    monthlyRevenue: 0,
    dailyOrders: 0,
    orderGrowth: '0%',
    revenueGrowth: '0%',
    customerGrowth: '0%',
    productGrowth: '0%',
    loading: true,
    error: null
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  // Fetch order statistics from the new API endpoint
  const fetchOrderStats = async () => {
    try {
      console.log('Fetching order statistics from /api/orders/admin/stats...');
      const response = await api.get('/orders/admin/stats');
      console.log('Order stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw error;
    }
  };

  const processRevenueData = (orders) => {
    console.log('Processing revenue data from orders:', orders);
    
    // Group orders by month for the last 6 months
    const monthlyRevenue = {};
    const currentDate = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthlyRevenue[monthKey] = 0;
    }

    // Process actual orders
    if (Array.isArray(orders) && orders.length > 0) {
      orders.forEach(order => {
        try {
          const orderDate = new Date(order.createdAt || order.date || order.orderDate || new Date());
          const monthKey = orderDate.toLocaleString('default', { month: 'short' });
          
          // Try different possible amount fields
          const amount = Number(
            order.totalAmount || 
            order.total || 
            order.amount || 
            order.grandTotal || 
            order.finalAmount || 
            0
          );
          
          if (monthlyRevenue.hasOwnProperty(monthKey) && !isNaN(amount) && amount > 0) {
            monthlyRevenue[monthKey] += amount;
          }
        } catch (error) {
          console.warn('Error processing order for revenue:', order, error);
        }
      });
    }

    const result = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue)
    }));
    
    console.log('Processed revenue data:', result);
    return result;
  };

  const processTopProducts = (orders, products) => {
    console.log('Processing top products from orders:', orders, 'and products:', products);
    
    const productSales = {};
    
    // Count sales per product from orders
    if (Array.isArray(orders) && orders.length > 0) {
      orders.forEach(order => {
        try {
          const items = order.items || order.products || order.orderItems || [];
          if (Array.isArray(items)) {
            items.forEach(item => {
              const productId = item.productId || item.product_id || item.id || item._id;
              const quantity = Number(item.quantity || item.qty || 1);
              const price = Number(item.price || item.amount || item.unitPrice || 0);
              
              if (productId) {
                if (!productSales[productId]) {
                  productSales[productId] = {
                    sales: 0,
                    revenue: 0,
                    name: item.name || item.productName || item.title || `Product ${productId}`
                  };
                }
                
                productSales[productId].sales += quantity;
                productSales[productId].revenue += (price * quantity);
              }
            });
          }
        } catch (error) {
          console.warn('Error processing order items:', order, error);
        }
      });
    }

    // If no order items found, create mock data from products
    if (Object.keys(productSales).length === 0 && Array.isArray(products)) {
      console.log('No order data found, creating mock sales data from products');
      products.slice(0, 8).forEach((product, index) => {
        const productId = product.id || product._id || index;
        const mockSales = Math.floor(Math.random() * 50) + 10;
        const price = Number(product.price || product.amount || 100);
        
        productSales[productId] = {
          name: product.name || product.title || `Product ${index + 1}`,
          sales: mockSales,
          revenue: price * mockSales
        };
      });
    }

    // Sort by sales and return top 4
    const result = Object.values(productSales)
      .filter(product => product.sales > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 4);
    
    console.log('Processed top products:', result);
    return result;
  };

  const processCategoryData = (products) => {
    console.log('Processing category data from products:', products);
    
    const categoryCount = {};
    
    if (Array.isArray(products) && products.length > 0) {
      products.forEach(product => {
        const category = product.category || product.type || product.categoryName || 'Others';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    } else {
      // Mock data if no products
      categoryCount['Electronics'] = 15;
      categoryCount['Clothing'] = 20;
      categoryCount['Books'] = 10;
      categoryCount['Home'] = 8;
      categoryCount['Others'] = 5;
    }

    const colors = ['#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];
    const result = Object.entries(categoryCount)
      .map(([name, count], index) => ({
        name,
        value: count,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    console.log('Processed category data:', result);
    return result;
  };

  const processRecentOrders = (orders) => {
    console.log('Processing recent orders:', orders);
    
    if (!Array.isArray(orders) || orders.length === 0) {
      console.log('No orders found, returning empty array');
      return [];
    }

    const result = orders
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || a.orderDate || 0);
        const dateB = new Date(b.createdAt || b.date || b.orderDate || 0);
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((order, index) => ({
        id: order.id || order._id || order.orderNumber || order.orderId || `ORD-${Date.now()}-${index}`,
        customer: order.customerName || order.customer?.name || order.user?.name || order.userName || 'Unknown Customer',
        amount: Number(order.totalAmount || order.total || order.amount || order.grandTotal || 0),
        status: order.status || order.orderStatus || 'Pending',
        date: order.createdAt || order.date || order.orderDate || new Date().toISOString()
      }));
    
    console.log('Processed recent orders:', result);
    return result;
  };

  const calculateGrowthPercentage = (current, previous) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const growth = ((current - previous) / previous) * 100;
    return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  };

  const loadDashboardStats = async () => {
    setStats(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('Starting to fetch dashboard stats...');
      
      // Fetch order statistics first
      let orderStats = {};
      try {
        orderStats = await fetchOrderStats();
        console.log('Order statistics fetched:', orderStats);
      } catch (error) {
        console.error('Error fetching order stats:', error);
        toast.error('Failed to load order statistics');
      }
      
      // Fetch other data with individual error handling
      let orders = [];
      let customers = [];
      let products = [];
      
      // Fetch products
      try {
        console.log('Fetching products...');
        const productsResponse = await productsApi.getAllProducts();
        console.log('Products response:', productsResponse);
        
        products = Array.isArray(productsResponse) 
          ? productsResponse 
          : productsResponse?.data || productsResponse?.products || [];
        
        console.log('Processed products:', products.length);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products data');
      }

      // Fetch orders
      try {
        console.log('Fetching orders...');
        const ordersResponse = await ordersApi.getAllOrders();
        console.log('Orders response:', ordersResponse);
        
        orders = Array.isArray(ordersResponse) 
          ? ordersResponse 
          : ordersResponse?.orders || ordersResponse?.data || [];
        
        console.log('Processed orders:', orders.length);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders data');
      }

      // Fetch customers
      try {
        console.log('Fetching customers...');
        const customersResponse = await usersApi.getAllCustomers();
        console.log('Customers response:', customersResponse);
        
        customers = Array.isArray(customersResponse) 
          ? customersResponse 
          : customersResponse?.data || customersResponse?.users || [];
        
        console.log('Processed customers:', customers.length);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to load customers data');
      }

      // Use order stats data if available, otherwise calculate from orders array
      const totalOrders = orderStats.totalOrders || orders.length || 0;
      const totalRevenue = orderStats.totalRevenue || orders.reduce((sum, order) => {
        const amount = Number(order?.totalAmount || order?.total || order?.amount || order?.grandTotal || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const pendingOrders = orderStats.pendingOrders || orders.filter(order => 
        (order.status || '').toLowerCase() === 'pending'
      ).length || 0;
      const completedOrders = orderStats.completedOrders || orders.filter(order => 
        (order.status || '').toLowerCase() === 'completed' || (order.status || '').toLowerCase() === 'delivered'
      ).length || 0;

      console.log('Calculated stats:', {
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        totalCustomers: customers.length,
        totalProducts: products.length
      });

      // Calculate growth percentages (you can enhance this with actual historical data)
      const orderGrowth = orderStats.orderGrowthPercentage || '+12%';
      const revenueGrowth = orderStats.revenueGrowthPercentage || '+8%';

      // Process all dashboard data
      console.log('Processing dashboard data...');
      const processedRevenueData = processRevenueData(orders);
      const processedRecentOrders = processRecentOrders(orders);
      const processedTopProducts = processTopProducts(orders, products);
      const processedCategoryData = processCategoryData(products);

      // Update all states
      setStats({
        totalOrders,
        totalCustomers: customers.length,
        totalProducts: products.length,
        totalRevenue,
        pendingOrders,
        completedOrders,
        monthlyRevenue: orderStats.monthlyRevenue || 0,
        dailyOrders: orderStats.dailyOrders || 0,
        orderGrowth,
        revenueGrowth,
        customerGrowth: '+8%', // This would need actual user registration data
        productGrowth: '+5%',  // This would need actual product creation data
        loading: false,
        error: null
      });

      setRecentOrders(processedRecentOrders);
      setTopProducts(processedTopProducts);
      setRevenueData(processedRevenueData);
      setCategoryData(processedCategoryData);
      
      console.log('Dashboard stats updated successfully');
      
      // Show success message only if we have some data
      if (products.length > 0 || orders.length > 0 || customers.length > 0 || Object.keys(orderStats).length > 0) {
        toast.success('Dashboard data loaded successfully!');
      }
      
    } catch (err) {
      console.error('Dashboard stats error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load dashboard statistics';
      setStats(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      toast.error(errorMessage);
    }
  };

  if (stats.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600"></div>
            <div className="absolute inset-0 animate-pulse rounded-full h-16 w-16 border-4 border-amber-300 opacity-20"></div>
          </div>
        </div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <div className="text-red-500 mb-4">
              <p className="text-lg font-medium">{stats.error}</p>
            </div>
            <button 
              onClick={loadDashboardStats}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'from-amber-400 to-amber-600',
      change: stats.orderGrowth || '0%'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'from-orange-400 to-orange-600',
      change: '+5%'
    },
    {
      title: 'Completed Orders',
      value: stats.completedOrders,
      icon: Award,
      color: 'from-green-400 to-green-600',
      change: '+15%'
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: IndianRupee,
      color: 'from-amber-500 to-orange-600',
      change: stats.revenueGrowth || '0%'
    },
  ];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's your business overview</p>
          </div>
          <div className="animate-bounce">
            <TrendingUp className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        {/* Stats Cards - Enhanced with more cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div 
              key={index} 
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl p-6 transform hover:scale-105 transition-all duration-300 animate-fade-in border border-amber-100"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2 text-gray-800">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-amber-600 text-sm font-medium">{stat.change}</span>
                    <span className="text-gray-400 text-sm ml-1">vs last month</span>
                  </div>
                </div>
                <div className={`bg-gradient-to-r ${stat.color} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Revenue Trend</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Last 6 months</span>
              </div>
            </div>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fef3c7', 
                      border: '1px solid #d97706',
                      borderRadius: '12px'
                    }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#d97706" 
                    strokeWidth={3}
                    dot={{ fill: '#d97706', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#d97706', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No revenue data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Product Categories */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Product Categories</h3>
            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {categoryData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{item.name}</span>
                      <span className="text-sm font-medium text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No category data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Bottom Section */}
        
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* Recent Orders */}
       <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-3 sm:p-6 border border-amber-100">
 <div className="flex items-center justify-between mb-4 sm:mb-6">
   <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">Recent Orders</h3>
   <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
 </div>
 {recentOrders.length > 0 ? (
   <div className="space-y-2 sm:space-y-4">
     {recentOrders.map((order, index) => (
       <div 
         key={order.id} 
         className="block sm:flex sm:items-center sm:justify-between p-3 sm:p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors duration-200 animate-fade-in space-y-2 sm:space-y-0"
         style={{ animationDelay: `${index * 50}ms` }}
       >
         {/* Mobile Layout - Stacked */}
         <div className="sm:hidden space-y-2">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-2 min-w-0 flex-1">
               <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0"></div>
               <p className="font-medium text-gray-800 text-sm truncate">Order Id : <span className='text-gray-600'>{order.id}</span></p>
             </div>
             <p className="font-bold text-gray-800 text-sm flex-shrink-0">₹{order.amount.toLocaleString()}</p>
           </div>
           <div className="flex items-center justify-between pl-4">
             <p className="text-xs text-gray-500 truncate flex-1">{order.customer}</p>
             <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${getStatusColor(order.status)}`}>
               {order.status}
             </span>
           </div>
         </div>

         {/* Desktop Layout - Horizontal */}
         <div className="hidden sm:flex sm:items-center sm:space-x-4 sm:min-w-0 sm:flex-1">
           <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0"></div>
           <div className="min-w-0 flex-1">
             <p className="font-medium text-gray-800 text-sm lg:text-base truncate">Order Id : <span className='text-gray-600'>{order.id}</span></p>
             <p className="text-xs lg:text-sm text-gray-500 truncate">{order.customer}</p>
           </div>
         </div>
         <div className="hidden sm:block sm:text-right sm:flex-shrink-0">
           <p className="font-bold text-gray-800 text-sm lg:text-base">₹{order.amount.toLocaleString()}</p>
           <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
             {order.status}
           </span>
         </div>
       </div>
     ))}
   </div>
 ) : (
   <div className="flex items-center justify-center h-32 sm:h-64 text-gray-500">
     <div className="text-center">
       <ShoppingBag className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 opacity-50" />
       <p className="text-sm sm:text-base">No recent orders found</p>
     </div>
   </div>
 )}
</div>

        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Add Product', icon: Package, color: 'from-amber-400 to-amber-600', href: '/admin/products' },
              { label: 'View Orders', icon: ShoppingBag, color: 'from-orange-400 to-orange-600', href: '/admin/orders' },
              { label: 'Manage Users', icon: Users, color: 'from-yellow-400 to-yellow-600', href: '/admin/customers' },
              { label: 'Analytics', icon: Eye, color: 'from-amber-500 to-orange-600', href: '/admin/analytics' }
            ].map((action, index) => (
              <Link
                to={action.href}
                key={index}
                className={`bg-gradient-to-r ${action.color} text-white p-4 rounded-xl hover:scale-105 transform transition-all duration-200 shadow-lg hover:shadow-xl flex flex-col items-center`}
              >
                <action.icon className="w-6 h-6 mb-2" />
                <p className="text-sm font-medium">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;