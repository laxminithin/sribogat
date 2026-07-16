import React, { useState, useEffect } from 'react';
import { usersApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Search, ChevronDown, ChevronUp, ShoppingBag, IndianRupee, Calendar, Heart } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import CustomerDetailsModal from '../../components/modals/CustomerDetailsModal';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerAnalytics, setCustomerAnalytics] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAllCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerAnalytics = async (customerId) => {
    try {
      const analytics = await usersApi.getCustomerAnalytics(customerId);
      setCustomerAnalytics(analytics);
      setSelectedCustomer(customerId);
    } catch (err) {
      toast.error('Failed to load customer analytics');
    }
  };

  const handleCustomerExpand = async (customerId) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
      setCustomerAnalytics(null);
    } else {
      setExpandedCustomer(customerId);
      await loadCustomerAnalytics(customerId);
    }
  };

  const handleViewDetails = (customerId) => {
    setSelectedCustomer(customerId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedCustomer(null);
    setIsDetailsModalOpen(false);
  };

  const handleCustomerUpdate = () => {
    loadCustomers(); // Refresh the customers list after update
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
            <div className="absolute inset-0 animate-pulse rounded-full h-12 w-12 border-4 border-amber-300 opacity-20"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <div className="text-red-500 mb-4">
              <p className="text-lg font-medium">{error}</p>
            </div>
            <button 
              onClick={loadCustomers}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Customers
            </h1>
            <p className="text-gray-600 mt-2">Manage and analyze your customer base</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl p-6 transform hover:scale-105 transition-all duration-300 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Customers</p>
                <p className="text-3xl font-bold mt-2 text-gray-800">{customers.length}</p>
              </div>
              <div className="bg-gradient-to-r from-amber-400 to-amber-600 p-4 rounded-xl shadow-lg">
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl p-6 transform hover:scale-105 transition-all duration-300 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Active Users</p>
                <p className="text-3xl font-bold mt-2 text-gray-800">{customers.filter(c => c.isActive).length}</p>
              </div>
              <div className="bg-gradient-to-r from-orange-400 to-orange-600 p-4 rounded-xl shadow-lg">
                <Heart className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl p-6 transform hover:scale-105 transition-all duration-300 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">New This Month</p>
                <p className="text-3xl font-bold mt-2 text-gray-800">
                  {customers.filter(c => {
                    const createdDate = new Date(c.createdAt);
                    const currentDate = new Date();
                    return createdDate.getMonth() === currentDate.getMonth() && 
                           createdDate.getFullYear() === currentDate.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-4 rounded-xl shadow-lg">
                <Calendar className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-amber-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-200">
              <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">Analytics</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-amber-100">
                {filteredCustomers.map((customer) => (
                  <React.Fragment key={customer._id}>
                    <tr className="hover:bg-amber-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-sm">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{customer.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {customer.address?.city}, {customer.address?.state}
                        </div>
                        <div className="text-sm text-gray-500">{customer.address?.pincode}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleCustomerExpand(customer._id)}
                          className="flex items-center text-sm text-amber-600 hover:text-amber-800 font-medium hover:bg-amber-100 px-3 py-1 rounded-lg transition-all duration-200"
                        >
                          View Analytics
                          {expandedCustomer === customer._id ? (
                            <ChevronUp className="w-4 h-4 ml-1" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-1" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(customer._id)}
                          className="text-amber-600 hover:text-amber-800 text-sm font-medium hover:bg-amber-100 px-3 py-1 rounded-lg transition-all duration-200"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                    {expandedCustomer === customer._id && customerAnalytics && (
                      <tr>
                        <td colSpan="5" className="px-6 py-6 bg-amber-50">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-amber-100 flex items-center space-x-3">
                              <div className="p-3 bg-amber-100 rounded-lg">
                                <ShoppingBag className="w-6 h-6 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                                <p className="text-xl font-bold text-gray-900">{customerAnalytics.totalOrders}</p>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-amber-100 flex items-center space-x-3">
                              <div className="p-3 bg-green-100 rounded-lg">
                                <IndianRupee className="w-6 h-6 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 font-medium">Total Spent</p>
                                <p className="text-xl font-bold text-gray-900">₹{customerAnalytics.totalSpent.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-amber-100 flex items-center space-x-3">
                              <div className="p-3 bg-purple-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 font-medium">Last Order</p>
                                <p className="text-lg font-bold text-gray-900">
                                  {customerAnalytics.lastOrderDate 
                                    ? new Date(customerAnalytics.lastOrderDate).toLocaleDateString()
                                    : 'Never'}
                                </p>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-amber-100 flex items-center space-x-3">
                              <div className="p-3 bg-red-100 rounded-lg">
                                <Heart className="w-6 h-6 text-red-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 font-medium">Wishlist Items</p>
                                <p className="text-xl font-bold text-gray-900">{customerAnalytics.wishlistCount}</p>
                              </div>
                            </div>
                          </div>

                          {/* Monthly Spending Chart */}
                          <div className="bg-white p-6 rounded-xl shadow-md border border-amber-100 mb-6">
                            <h3 className="text-lg font-bold text-amber-800 mb-4">Monthly Spending</h3>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={Object.entries(customerAnalytics.monthlySpending).map(([month, amount]) => ({
                                    month,
                                    amount
                                  }))}
                                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
                                  <XAxis dataKey="month" stroke="#6b7280" />
                                  <YAxis stroke="#6b7280" />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: '#fef3c7', 
                                      border: '1px solid #d97706',
                                      borderRadius: '12px'
                                    }} 
                                  />
                                  <Bar dataKey="amount" fill="#d97706" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Top Products */}
                          <div className="bg-white p-6 rounded-xl shadow-md border border-amber-100">
                            <h3 className="text-lg font-bold text-amber-800 mb-4">Frequently Bought Products</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {customerAnalytics.topProducts.map((product) => (
                                <div key={product._id} className="flex items-center space-x-3 p-4 border border-amber-200 rounded-xl hover:shadow-md transition-all duration-200 hover:bg-amber-50">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded-lg shadow-md"
                                  />
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">{product.name}</p>
                                    <p className="text-sm text-amber-600 font-medium">
                                      Purchased {product.purchaseCount} times
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto border border-amber-100">
              <ShoppingBag className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">No customers found</h3>
              <p className="text-gray-500">Try adjusting your search terms</p>
            </div>
          </div>
        )}

        {/* Customer Details Modal */}
        {isDetailsModalOpen && (
          <CustomerDetailsModal
            userId={selectedCustomer}
            onClose={handleCloseModal}
            onUpdate={handleCustomerUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default Customers;
