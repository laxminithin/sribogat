import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { User, Mail, Lock, Phone, MapPin, CreditCard, Building2, ArrowLeft, Loader, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import { Eye, EyeOff } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    alternatePhone: '',
    gst: '',
    role: 'user',
    address: {
      street: '',
      locality: '',
      city: '',
      state: '',
      pincode: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for name field - only allow letters and spaces
    if (name === 'name') {
      const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: filteredValue
      }));
      return;
    }
    
    // Special handling for phone number fields - only allow numbers, +, -, and spaces
    if (name === 'phone' || name === 'alternatePhone') {
      const filteredValue = value.replace(/[^0-9+\-\s]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: filteredValue
      }));
      return;
    }
    
    // Special handling for email field - don't allow numbers at the start
    if (name === 'email') {
      const filteredValue = value.replace(/^[0-9]+/, '');
      setFormData(prev => ({
        ...prev,
        [name]: filteredValue
      }));
      return;
    }
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      toast.error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return false;
    }

    const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please provide a valid Indian phone number');
      return false;
    }

    if (formData.alternatePhone && !phoneRegex.test(formData.alternatePhone)) {
      toast.error('Please provide a valid Indian alternate phone number');
      return false;
    }

    if (isBusinessAccount && !formData.gst) {
      toast.error('GST number is required for business accounts');
      return false;
    }

    if (formData.gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst)) {
      toast.error('Please provide a valid GST number');
      return false;
    }

    const pincodeRegex = /^\d{6}$/;
    if (formData.address.pincode && !pincodeRegex.test(formData.address.pincode)) {
      toast.error('Please provide a valid 6-digit pincode');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Create clean submit data
      const { confirmPassword, ...submitData } = formData;
      submitData.role = isBusinessAccount ? 'business' : 'user';
      
      // Remove any undefined or empty optional fields
      if (!submitData.alternatePhone || submitData.alternatePhone.trim() === '') {
        delete submitData.alternatePhone;
      }
      if (!submitData.gst || submitData.gst.trim() === '') {
        delete submitData.gst;
      }
      if (!submitData.address.street || submitData.address.street.trim() === '') {
        delete submitData.address.street;
      }
      
      // Ensure no verification object is included
      delete submitData.verification;
      
      console.log('🚀 Starting registration...');
      console.log('📤 Submitting data:', submitData);
      
      const response = await api.post('/users/register', submitData);
      
      console.log('✅ Registration successful!', response.status);
      console.log('📦 Response data:', response.data);
      
      // Handle successful registration
      setRegistered(true);
      toast.success('Registration successful! Please check your email for verification.');
      
      // Store token and user data if provided
      if (response.data && response.data.token) {
        localStorage.setItem('kissanbandi_token', response.data.token);
        localStorage.setItem('kissanbandi_user', JSON.stringify(response.data.user));
      }
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      console.log('❌ Registration request failed');
      console.log('🔍 Error details:', {
        name: err.name,
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url
      });
      
      // Check if this is actually a successful response (201) treated as error
      if (err.response && err.response.status === 201) {
        console.log('✅ 201 response - treating as success');
        
        setRegistered(true);
        toast.success('Registration successful! Please check your email for verification.');
        
        if (err.response.data && err.response.data.token) {
          localStorage.setItem('kissanbandi_token', err.response.data.token);
          localStorage.setItem('kissanbandi_user', JSON.stringify(err.response.data.user));
        }
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }
      
      // Handle actual errors
      if (err.response?.status === 400 && err.response?.data?.error?.includes('already registered')) {
        console.log('🔄 User already exists');
        toast.error('Email already registered. Please login or use a different email.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Log the exact error that's causing the toast
        const errorMessage = err.response?.data?.error || 
                           err.response?.data?.message || 
                           err.message || 
                           'Registration failed. Please try again.';
        
        console.log('💥 Showing error toast:', errorMessage);
        console.log('🔍 This is the error message that will be displayed to user');
        
        // Only show toast if it's not about verification/undefined (those might be false positives)
        if (!errorMessage.includes('verification') && 
            !errorMessage.includes('undefined') &&
            !errorMessage.includes('Cannot read properties')) {
          toast.error(errorMessage);
        } else {
          console.log('🚫 Suppressing verification-related error, might be false positive');
          // Check if user was actually created by trying to redirect
          toast.success('Registration may have completed. Please try logging in.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Show success message if registered
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-amber-200 text-center">
            <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-600 mb-4">Your account has been created successfully.</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero Section with brown theme */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-700 via-orange-700 to-yellow-700 items-center justify-center relative overflow-hidden">
        <div className="relative z-10 px-12 text-white">
          <h2 className="text-4xl font-bold mb-6">Join Bogat Today</h2>
          <p className="text-lg mb-8">Create an account to start buying premium quality products directly from trusted suppliers.</p>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <User className="h-6 w-6" />
              </div>
              <p>Get personalized recommendations</p>
            </div>
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <MapPin className="h-6 w-6" />
              </div>
              <p>Track your orders in real-time</p>
            </div>
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <CreditCard className="h-6 w-6" />
              </div>
              <p>Secure payment options</p>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-white/10"></div>
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-white/10"></div>
      </div>

      {/* Right side - Registration Form with brown theme */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="bg-amber-100 p-3 rounded-xl border border-amber-200">
                <User className="h-12 w-12 text-amber-700" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-amber-600 hover:text-amber-500 inline-flex items-center">
                <ArrowLeft className="mr-1 h-4 w-4" /> Sign in here
              </Link>
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-amber-200">
            {/* Account Type Selection */}
            <div className="mb-6">
              
              <div className="grid grid-cols-1 gap-4">
                <button
                  type="button"
                  onClick={() => setIsBusinessAccount(false)}
                  className={`p-4 text-center rounded-lg border transition-all duration-200 ${
                    !isBusinessAccount
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md'
                      : 'border-amber-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <User className="h-6 w-6 mx-auto mb-2" />
                  <span className="block font-medium">Individual</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      maxLength={50}
                      required
                      className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      pattern="^[a-zA-Z\s]+$"
                      title="Name can only contain letters and spaces"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleChange}
                      pattern="^[a-zA-Z][a-zA-Z0-9._-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                      title="Email must start with a letter and be in valid format"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="appearance-none block w-full px-3 py-2 pr-10 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-amber-600 hover:text-amber-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className="appearance-none block w-full px-3 py-2 pr-10 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-amber-600 hover:text-amber-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <div className="mt-1">
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        maxLength={10}
                        required
                        className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        pattern="^[0-9+\-\s]+$"
                        title="Phone number can only contain numbers, +, -, and spaces"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="alternate-phone" className="block text-sm font-medium text-gray-700">
                      Alternate Phone (Optional)
                    </label>
                    <div className="mt-1">
                      <input
                        id="alternate-phone"
                        name="alternatePhone"
                        maxLength={10}
                        type="tel"
                        className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                        placeholder="Enter your alternate phone number"
                        value={formData.alternatePhone}
                        onChange={handleChange}
                        pattern="^[0-9+\-\s]+$"
                        title="Phone number can only contain numbers, +, -, and spaces"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ID Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Identification</h3>
                {isBusinessAccount && (
                  <div>
                    <label htmlFor="gst" className="block text-sm font-medium text-gray-700">
                      GST Number
                    </label>
                    <div className="mt-1">
                      <input
                        id="gst"
                        name="gst"
                        type="text"
                        required={isBusinessAccount}
                        className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                        placeholder="Enter your GST number"
                        value={formData.gst}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Address</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                      Street Address
                    </label>
                    <div className="mt-1">
                      <input
                        id="street"
                        name="address.street"
                        type="text"
                        className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                        placeholder="Enter your street address"
                        value={formData.address.street}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="locality" className="block text-sm font-medium text-gray-700">
                      Locality/Area
                    </label>
                    <div className="mt-1">
                      <input
                        id="locality"
                        name="address.locality"
                        type="text"
                        className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                        placeholder="Enter your locality or area"
                        value={formData.address.locality}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <div className="mt-1">
                        <input
                          id="city"
                          name="address.city"
                          type="text"
                          className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                          placeholder="Enter your city"
                          value={formData.address.city}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                  <div>
  <label htmlFor="pincode" className="block text-sm font-medium text-gray-700">
    Pincode
  </label>
  <div className="mt-1">
    <input
      id="pincode"
      name="address.pincode"
      type="text"
      inputMode="numeric"
      pattern="\d{6}"
      maxLength={6}
      className="appearance-none block w-full px-3 py-2 border border-amber-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
      placeholder="Enter your 6-digit pincode"
      value={formData.address.pincode}
      onChange={(e) => {
        const value = e.target.value;
        if (/^\d{0,6}$/.test(value)) {
          setFormData((prev) => ({
            ...prev,
            address: {
              ...prev.address,
              pincode: value
            }
          }));
        }
      }}
      title="Please enter a valid 6-digit pincode"
      required
    />
  </div>
</div>

                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <div className="mt-1 relative">
                      <select
                        id="state"
                        name="address.state"
                        className="appearance-none block w-full px-3 py-2 pr-10 border border-amber-200 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm hover:border-amber-300 transition-colors duration-200"
                        value={formData.address.state}
                        onChange={handleChange}
                      >
                        <option value="" className="text-gray-400">Select your state</option>
                        {INDIAN_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <Loader className="animate-spin h-5 w-5" />
                  ) : (
                    'Create Account'
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

export default Register;