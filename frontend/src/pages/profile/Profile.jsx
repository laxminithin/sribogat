import React, { useEffect, useState } from 'react';
import { useAuth } from '../checkout/AuthProvider';
import { toast } from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Building2, Save, Loader } from 'lucide-react';
import { usersApi } from '../../services/api';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    alternatePhone: user?.alternatePhone || '',
    address: {
      street: user?.address?.street || '',
      locality: user?.address?.locality || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      pincode: user?.address?.pincode || ''
    }
  });

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      alternatePhone: user?.alternatePhone || '',
      address: {
        street: user?.address?.street || '',
        locality: user?.address?.locality || '',
        city: user?.address?.city || '',
        state: user?.address?.state || '',
        pincode: user?.address?.pincode || ''
      }
    });
  }, [user]);

  // ✅ Allow only letters and spaces
  const validateNameInput = (value) => {
    return value.replace(/[^a-zA-Z\s]/g, '');
  };

  const validatePhoneInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 10);
  };

  const validatePincodeInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 6);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'name') {
      processedValue = validateNameInput(value);
    } else if (name === 'phone' || name === 'alternatePhone') {
      processedValue = validatePhoneInput(value);
    } else if (name === 'address.pincode') {
      processedValue = validatePincodeInput(value);
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: processedValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
  };

  const validateForm = () => {
    // ✅ Check if name contains only letters and spaces
    if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      toast.error('Name can only contain letters');
      return false;
    }

    if (formData.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return false;
    }

    if (formData.alternatePhone && formData.alternatePhone.length !== 10) {
      toast.error('Alternate phone number must be exactly 10 digits');
      return false;
    }

    if (formData.address.pincode.length !== 6) {
      toast.error('Pincode must be exactly 6 digits');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await usersApi.updateProfile(formData);
      if (response) {
        await updateUser(response);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Unable to update profile. Please try again.');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err.message) {
        toast.error(err.message);
      } else {
        toast.error('An error occurred while updating profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8 mt-32">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-lg mb-4 animate-bounce duration-2000">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
              Profile Settings
            </h1>
            <p className="text-amber-700 mt-2">Manage your account settings and preferences</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-amber-200 p-8 hover:shadow-2xl transition-all duration-500">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-amber-800">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="group">
                    <label htmlFor="name" className="block text-sm font-medium text-amber-700 mb-2">
                      Name (Letters Only)
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 group-hover:border-amber-300 bg-white"
                      placeholder="John Doe"
                    />
                    <p className="text-xs text-amber-600 mt-1">Only letters are allowed, no numbers or symbols</p>
                  </div>

                  <div className="group">
                    <label htmlFor="email" className="block text-sm font-medium text-amber-700 mb-2">
                      Email Address
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="email"
                        value={user?.email}
                        disabled
                        className="flex-1 px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm bg-amber-50 text-amber-600"
                      />
                      {user?.isEmailVerified && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-orange-800">Contact Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label htmlFor="phone" className="block text-sm font-medium text-amber-700 mb-2">
                      Phone Number (10 digits)
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="text"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm"
                      maxLength="10"
                    />
                    <p className="text-xs text-amber-600 mt-1">Exactly 10 digits required</p>
                  </div>

                  <div className="group">
                    <label htmlFor="alternatePhone" className="block text-sm font-medium text-amber-700 mb-2">
                      Alternate Phone (Optional, 10 digits)
                    </label>
                    <input
                      id="alternatePhone"
                      name="alternatePhone"
                      type="text"
                      value={formData.alternatePhone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm"
                      maxLength="10"
                    />
                    <p className="text-xs text-amber-600 mt-1">Exactly 10 digits if provided</p>
                  </div>
                </div>
              </div>

             {/* Address Info */}
<div className="space-y-6">
  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl">
    <div className="w-10 h-10 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-full flex items-center justify-center">
      <MapPin className="w-5 h-5 text-white" />
    </div>
    <h3 className="text-lg font-semibold text-yellow-800">Address Information</h3>
  </div>

  <div className="grid grid-cols-1 gap-6">
    {/* Street Address */}
    <div className="group">
      <label htmlFor="address.street" className="block text-sm font-medium text-amber-700 mb-2">
        Street Address
      </label>
      <input
        id="address.street"
        name="address.street"
        type="text"
        required
        value={formData.address.street}
        onChange={handleChange}
        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm bg-white"
        placeholder="123 Main St"
      />
    </div>

    {/* Locality/Area */}
    <div className="group">
      <label htmlFor="address.locality" className="block text-sm font-medium text-amber-700 mb-2">
        Locality/Area
      </label>
      <input
        id="address.locality"
        name="address.locality"
        type="text"
        required
        value={formData.address.locality}
        onChange={handleChange}
        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm bg-white"
        placeholder="Neighborhood"
      />
    </div>

    {/* City, State, Pincode */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* City */}
      <div className="group">
        <label htmlFor="address.city" className="block text-sm font-medium text-amber-700 mb-2">
          City
        </label>
        <input
          id="address.city"
          name="address.city"
          type="text"
          required
          value={formData.address.city}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm bg-white"
          placeholder="City name"
        />
      </div>

      {/* State */}
      <div className="group">
        <label htmlFor="address.state" className="block text-sm font-medium text-amber-700 mb-2">
          State
        </label>
        <select
          id="address.state"
          name="address.state"
          required
          value={formData.address.state}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm bg-white"
        >
          <option value="">Select State</option>
          {INDIAN_STATES.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>

      {/* Pincode */}
      <div className="group">
        <label htmlFor="address.pincode" className="block text-sm font-medium text-amber-700 mb-2">
          Pincode (6 digits)
        </label>
        <input
          id="address.pincode"
          name="address.pincode"
          type="text"
          required
          value={formData.address.pincode}
          onChange={handleChange}
          maxLength="6"
          className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl shadow-sm bg-white"
          placeholder="123456"
        />
        <p className="text-xs text-amber-600 mt-1">Exactly 6 digits required</p>
      </div>
    </div>
  </div>
</div>


              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-8 py-4 border border-transparent rounded-xl text-base font-medium text-white bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 mr-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-3" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
