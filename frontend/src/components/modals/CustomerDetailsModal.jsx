import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { usersApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { INDIAN_STATES } from '../../constants';

const CustomerDetailsModal = ({ userId, onClose, onUpdate }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      landmark: ''
    }
  });

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.getCustomerById(userId);
      setUserData(response);
      setFormData({
        name: response.name || '',
        email: response.email || '',
        phone: response.phone || '',
        alternatePhone: response.alternatePhone || '',
        address: {
          street: response.address?.street || '',
          city: response.address?.city || '',
          state: response.address?.state || '',
          pincode: response.address?.pincode || '',
          landmark: response.address?.landmark || ''
        }
      });
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError(err.message || 'Failed to fetch user details');
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-green-50 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-green-900">Customer Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-600">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>{error}</span>
              </div>
            ) : (
              <form>
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Alternate Phone</label>
                        <input
                          type="tel"
                          name="alternatePhone"
                          value={formData.alternatePhone}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Address Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Street Address</label>
                        <input
                          type="text"
                          name="address.street"
                          value={formData.address.street}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input
                          type="text"
                          name="address.city"
                          value={formData.address.city}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <select
                          name="address.state"
                          value={formData.address.state}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">PIN Code</label>
                        <input
                          type="text"
                          name="address.pincode"
                          value={formData.address.pincode}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Landmark</label>
                        <input
                          type="text"
                          name="address.landmark"
                          value={formData.address.landmark}
                          disabled
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
