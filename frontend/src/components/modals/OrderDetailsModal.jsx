import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, IndianRupee, Clock, Loader, AlertCircle } from 'lucide-react';
import { usersApi } from '../../services/api';
import { toast } from 'react-hot-toast';

const OrderDetailsModal = ({ order, onClose }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!order?.user?._id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await usersApi.getCustomerById(order.user._id);
        console.log('User details fetched:', response);
        setUserData(response);
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError(err.message || 'Failed to fetch user details');
        toast.error('Failed to load complete user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [order?.user?._id]);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-green-50 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-green-900">Order Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Order Info */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Order #{order._id}</h4>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                {loading ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                ) : error ? (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="text-sm text-gray-900">{userData?.name || order.user?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{userData?.email || order.user?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{userData?.phone || order.user?.phone || 'N/A'}</p>
                    </div>
                    {userData?.alternatePhone && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Alternate Phone</p>
                        <p className="text-sm text-gray-900">{userData.alternatePhone}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-4">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.product?.name || 'Unknown Product'}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900">₹{((item.price || 0) * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-900">Total Amount</p>
                      <p className="text-sm font-medium text-gray-900">₹{(order.totalAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address Section */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="col-span-2">
                  <span className="text-gray-600">Full Name:</span>
                  <span className="ml-2 font-medium">{order.shippingAddress.fullName || 'N/A'}</span>
                </div>
                
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium">{order.shippingAddress.phone || 'N/A'}</span>
                </div>
                
                {order.shippingAddress.alternatePhone && (
                  <div>
                    <span className="text-gray-600">Alternate Phone:</span>
                    <span className="ml-2 font-medium">{order.shippingAddress.alternatePhone}</span>
                  </div>
                )}
                
                <div className="col-span-2">
                  <span className="text-gray-600">Street Address:</span>
                  <span className="ml-2 font-medium">{order.shippingAddress.address || 'N/A'}</span>
                </div>
                
                <div>
                  <span className="text-gray-600">City:</span>
                  <span className="ml-2 font-medium">
                    {order.shippingAddress.city !== 'N/A' ? order.shippingAddress.city : 'Not Provided'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">State:</span>
                  <span className="ml-2 font-medium">
                    {order.shippingAddress.state !== 'N/A' ? order.shippingAddress.state : 'Not Provided'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">PIN Code:</span>
                  <span className="ml-2 font-medium">
                    {order.shippingAddress.pinCode !== 'N/A' ? order.shippingAddress.pinCode : 'Not Provided'}
                  </span>
                </div>
                
                {order.shippingAddress.landmark && order.shippingAddress.landmark !== 'N/A' && (
                  <div>
                    <span className="text-gray-600">Landmark:</span>
                    <span className="ml-2 font-medium">{order.shippingAddress.landmark}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Information</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Method</p>
                    <p className="text-sm text-gray-900">{order.paymentMethod || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Status</p>
                    <p className="text-sm text-gray-900">{order.paymentStatus || 'N/A'}</p>
                  </div>
                  {order.razorpayDetails && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Razorpay Order ID</p>
                        <p className="text-sm text-gray-900">{order.razorpayDetails.orderId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Razorpay Payment ID</p>
                        <p className="text-sm text-gray-900">{order.razorpayDetails.paymentId}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal; 