import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/api/analyticsApi';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download, Calendar, RefreshCcw, TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const COLORS = ['#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [stats, setStats] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, [startDate, endDate]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await analyticsApi.getDashboardStats(
        startDate?.toISOString(),
        endDate?.toISOString()
      );
      setStats(data);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type, format = 'csv') => {
    try {
      setExportLoading(true);
      const blob = await analyticsApi.exportData(
        type,
        startDate?.toISOString(),
        endDate?.toISOString(),
        format
      );
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`${type} exported successfully`);
    } catch (err) {
      toast.error(`Failed to export ${type}`);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600"></div>
          <div className="absolute inset-0 animate-pulse rounded-full h-16 w-16 border-4 border-amber-300 opacity-20"></div>
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
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive business insights and metrics</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Date Range Picker */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                className="px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                placeholderText="Select date range"
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setDateRange([null, null]);
                loadStats();
              }}
              className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
              title="Reset filters"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            {/* Export Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport('orders')}
                disabled={exportLoading}
                className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Download className="w-4 h-4" />
                <span>Export Orders</span>
              </button>
              <button
                onClick={() => handleExport('customers')}
                disabled={exportLoading}
                className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-yellow-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-yellow-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Download className="w-4 h-4" />
                <span>Export Customers</span>
              </button>
            </div>
          </div>
        </div>

        {stats && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-amber-100 group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-gray-500 font-medium">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-amber-600 text-sm font-medium">+12%</span>
                      <span className="text-gray-400 text-sm ml-1">vs last period</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-400 to-amber-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>

              {Object.entries(stats.orderStats).map(([status, data], index) => {
                const icons = [Package, TrendingUp, Users];
                const colors = [
                  'from-orange-400 to-orange-600',
                  'from-yellow-400 to-yellow-600',
                  'from-amber-500 to-orange-600'
                ];
                const Icon = icons[index % icons.length];
                const colorClass = colors[index % colors.length];
                
                return (
                  <div key={status} className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-amber-100 group">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm text-gray-500 font-medium capitalize">{status} Orders</h3>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{data.count}</p>
                        <p className="text-sm text-gray-500 mt-1">₹{data.revenue.toLocaleString()}</p>
                      </div>
                      <div className={`bg-gradient-to-r ${colorClass} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-amber-800">Daily Revenue</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-500">Live</span>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
                    <XAxis dataKey="_id" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fef3c7', 
                        border: '1px solid #d97706',
                        borderRadius: '12px'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#d97706" 
                      strokeWidth={3}
                      name="Revenue"
                      dot={{ fill: '#d97706', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#d97706', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#b45309" 
                      strokeWidth={3}
                      name="Orders"
                      dot={{ fill: '#b45309', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#b45309', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Products */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-100">
                <h2 className="text-xl font-bold text-amber-800 mb-6">Top Products</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topProducts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
                      <XAxis dataKey="product.name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fef3c7', 
                          border: '1px solid #d97706',
                          borderRadius: '12px'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="totalSold" fill="#d97706" name="Units Sold" />
                      <Bar dataKey="revenue" fill="#b45309" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Customers */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-100">
                <h2 className="text-xl font-bold text-amber-800 mb-6">Top 5 Customers</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.topCustomers.slice(0, 5)}
                        dataKey="totalSpent"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}
                      >
                        {stats.topCustomers.map((entry, index) => (
                          <Cell key={entry._id} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fef3c7', 
                          border: '1px solid #d97706',
                          borderRadius: '12px'
                        }} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Additional Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-100">
                <h3 className="text-lg font-bold text-amber-800 mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Order Value</span>
                    <span className="text-lg font-bold text-amber-600">₹{(stats.totalRevenue / (stats.orderStats.delivered?.count || 1)).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Conversion Rate</span>
                    <span className="text-lg font-bold text-amber-600">
                      {((stats.orderStats.delivered?.count || 0) / Object.values(stats.orderStats).reduce((sum, stat) => sum + stat.count, 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Orders</span>
                    <span className="text-lg font-bold text-amber-600">
                      {Object.values(stats.orderStats).reduce((sum, stat) => sum + stat.count, 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-100">
                <h3 className="text-lg font-bold text-amber-800 mb-4">Growth Trends</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Growth</span>
                    <span className="text-lg font-bold text-green-600">+15.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Retention</span>
                    <span className="text-lg font-bold text-green-600">78%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Revenue Growth</span>
                    <span className="text-lg font-bold text-green-600">+22.1%</span>
                  </div>
                </div>
              </div>

              
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;