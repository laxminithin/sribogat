// Fixed CheckoutPage.js - Proper GST Calculation from Database
import React, { useState, useEffect } from 'react';
import { useCart } from '../checkout/CartContext';
import { useAuth } from '../checkout/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, Trash2, MapPin, ShoppingBag, CreditCard, Truck, CheckCircle, 
  Plus, Minus, Gift, Tag, X, Percent, Copy, Sparkles, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi, productsApi } from '../../services/api';
import { resolveImageUrl } from '../../config/config';
import couponApi from '../../services/couponApi';
import { getPriceData } from '../../utils/pricing';

const CheckoutPage = () => {
  const { 
    state: cartState,
    updateQuantity, 
    removeItem,
    getTotalItems,
    getCartTotal,
    clearCart,
    cartStats
  } = useCart();
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [useRegisteredAddress, setUseRegisteredAddress] = useState(true);

  // Coupon States
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCoupons, setShowCoupons] = useState(false);
  const [couponSuggestions, setCouponSuggestions] = useState([]);
  const [couponDiscount, setCouponDiscount] = useState(0);
  
  // Product details with database pricing
  const [productDetails, setProductDetails] = useState(new Map());
  const [pricingLoading, setPricingLoading] = useState(true);

  // Backend validated totals state
  const [backendValidatedTotals, setBackendValidatedTotals] = useState(null);

  const [customAddress, setCustomAddress] = useState({
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: ''
  });

  // ✅ Fetch product details including database pricing for all cart items
  const fetchProductDetails = async () => {
    try {
      setPricingLoading(true);
      console.log('🛒 Fetching product details with database pricing for cart items...');
      
      const productPromises = cartState.items.map(async (item) => {
        try {
          const productId = item._id || item.id;
          const productData = await productsApi.getProductById(productId);
          
          console.log(`📦 Product ${productId} raw data from database:`, {
            name: productData.name,
            price: productData.price,
            gstRate: productData.gstRate,
            gst: productData.gst,
            gstAmount: productData.gstAmount,
            totalPrice: productData.totalPrice
          });
          
          return {
            id: productId,
            ...productData
          };
        } catch (error) {
          console.error(`❌ Error fetching product ${item._id || item.id}:`, error);
          return {
            id: item._id || item.id,
            ...item,
            price: item.price || 0,
            gstRate: 0,
            gstAmount: 0,
            totalPrice: item.price || 0
          };
        }
      });

      const products = await Promise.all(productPromises);
      const productMap = new Map();
      
      products.forEach(product => {
        productMap.set(product.id, product);
      });
      
      console.log('✅ Product details loaded:', productMap.size, 'products');
      setProductDetails(productMap);
      
    } catch (error) {
      console.error('❌ Error fetching product details:', error);
      toast.error('Failed to load product details');
    } finally {
      setPricingLoading(false);
    }
  };

  // Fetch available coupons with better error handling
  const fetchAvailableCoupons = async () => {
    try {
      const subtotal = calculateCartSubtotal();
      
      if (!user || subtotal === 0) {
        setAvailableCoupons([]);
        return;
      }

      console.log('🎫 Fetching available coupons for subtotal:', subtotal);
      const response = await couponApi.getAvailableCoupons(subtotal);
      
      if (response.success) {
        setAvailableCoupons(response.data || []);
        console.log('✅ Available coupons loaded:', response.data?.length || 0);
      } else {
        console.warn('Coupon fetch unsuccessful:', response);
        setAvailableCoupons([]);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setAvailableCoupons([]);
    }
  };

  // Get coupon suggestions with better error handling
  const fetchCouponSuggestions = async () => {
    try {
      const subtotal = calculateCartSubtotal();
      
      if (!user || subtotal === 0) {
        setCouponSuggestions([]);
        return;
      }

      const cartItems = cartState.items.map(item => {
        const productId = item._id || item.id;
        const product = productDetails.get(productId);
        const priceData = product ? getPriceData(product) : { totalPrice: item.price || 0 };
        
        return {
          productId,
          price: priceData.totalPrice,
          quantity: item.quantity
        };
      });
      
      console.log('🎫 Fetching coupon suggestions...');
      const response = await couponApi.getSuggestions(subtotal, cartItems);
      
      if (response.success && response.data.suggestions) {
        setCouponSuggestions(response.data.suggestions);
        console.log('✅ Coupon suggestions loaded:', response.data.suggestions.length);
      } else {
        setCouponSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching coupon suggestions:', error);
      setCouponSuggestions([]);
    }
  };

  // ✅ Calculate cart subtotal using database pricing (already includes GST)
  const calculateCartSubtotal = () => {
    let subtotal = 0;
    
    cartState.items.forEach(item => {
      const productId = item._id || item.id;
      const product = productDetails.get(productId);
      
      if (product) {
        const priceData = getPriceData(product);
        subtotal += priceData.totalPrice * item.quantity;
        
        console.log(`💰 Item calculation for ${product.name}:`, {
          basePrice: priceData.basePrice,
          gstAmount: priceData.gstAmount,
          totalPrice: priceData.totalPrice,
          quantity: item.quantity,
          itemTotal: priceData.totalPrice * item.quantity
        });
      } else {
        // Fallback to cart item price
        subtotal += (item.price || 0) * item.quantity;
      }
    });
    
    console.log('📊 Cart subtotal calculated:', subtotal);
    return Math.round(subtotal * 100) / 100;
  };

  // Apply coupon
  const applyCouponCode = async (code = null) => {
    const codeToApply = code || couponCode.trim().toUpperCase();
    
    if (!codeToApply) {
      toast.error('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    console.log('🎫 Applying coupon:', codeToApply);
    
    try {
      const subtotal = calculateCartSubtotal();
      const cartItems = cartState.items.map(item => {
        const productId = item._id || item.id;
        const product = productDetails.get(productId);
        const priceData = product ? getPriceData(product) : { totalPrice: item.price || 0 };
        
        return {
          productId,
          price: priceData.totalPrice,
          quantity: item.quantity
        };
      });
      
      const response = await couponApi.validateCoupon(codeToApply, subtotal, cartItems);
      
      if (response.success) {
        setAppliedCoupon(response.data.coupon);
        setCouponDiscount(response.data.discount);
        setCouponCode('');
        setBackendValidatedTotals(null);
        
        console.log('✅ Coupon applied successfully:', {
          code: response.data.coupon.code,
          discount: response.data.discount
        });
        toast.success(
          <div className="flex items-center">
            <Gift className="w-4 h-4 mr-2 text-green-500" />
            Coupon applied! Saved ₹{response.data.discount}
          </div>
        );
      }
    } catch (error) {
      console.error('❌ Coupon validation error:', error);
      toast.error('Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  // Remove applied coupon
  const removeCoupon = () => {
    console.log('🎫 Removing coupon:', appliedCoupon?.code);
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setBackendValidatedTotals(null);
    toast.success('Coupon removed');
  };

  // ✅ Calculate Totals Function - Uses database pricing with GST included
  const calculateTotals = () => {
    if (backendValidatedTotals) {
      console.log('🔄 Using backend validated totals:', backendValidatedTotals);
      return {
        subtotal: backendValidatedTotals.subtotal,
        discount: backendValidatedTotals.discount,
        discountedSubtotal: backendValidatedTotals.discountedSubtotal,
        shipping: backendValidatedTotals.shipping,
        total: backendValidatedTotals.total
      };
    }

    const subtotal = calculateCartSubtotal();
    const discountAmount = appliedCoupon ? couponDiscount : 0;
    
    console.log('💰 Frontend Calculation Debug:', {
      subtotal,
      discountAmount,
      appliedCoupon: appliedCoupon?.code,
      couponDiscount,
      note: 'Subtotal already includes GST from database'
    });
    
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const shipping = discountedSubtotal >= 500 ? 0 : 50;
    const total = discountedSubtotal + shipping;

    console.log('💰 Frontend Calculated Totals:', {
      subtotal,
      discount: discountAmount,
      discountedSubtotal,
      shipping,
      total,
      note: 'No GST added - already included in database pricing'
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      discountedSubtotal: Math.round(discountedSubtotal * 100) / 100,
      shipping,
      total: Math.round(total * 100) / 100
    };
  };

  // ✅ Payment Processing Function - Includes proper GST data for backend
  const handleProceedToPayment = async () => {
    try {
      if (!user) {
        navigate('/login');
        toast.error('Please login to continue', { id: 'cart-empty' });
        return;
      }

      if (pricingLoading) {
        toast.error('Please wait while we load pricing...');
        return;
      }

      setIsProcessing(true);
      const frontendTotals = calculateTotals();

      // Validate address
      const shippingAddress = getShippingAddress();
      if (!shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
        toast.error('Please provide complete shipping address');
        setIsProcessing(false);
        return;
      }

      const orderPayload = {
        items: cartState.items.map((item) => {
          const productId = item._id || item.id;
          const product = productDetails.get(productId);
          const priceData = product
            ? getPriceData(product)
            : {
                totalPrice: Number(item.price) || 0,
              };

          return {
            product: productId,
            quantity: item.quantity,
            price: priceData.totalPrice,
            name: product?.name || item.name,
          };
        }),
        subtotal: frontendTotals.subtotal,
        discountedSubtotal: frontendTotals.discountedSubtotal,
        discount: frontendTotals.discount,
        total: frontendTotals.total,
        shipping: frontendTotals.shipping,
        couponCode: appliedCoupon?.code || null,
        paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
        shippingAddress,
      };

      console.log('🧾 Creating order with current backend contract:', orderPayload);

      const orderResponse = await ordersApi.createOrder(orderPayload);
      const createdOrder = orderResponse?.order || orderResponse;

      if (!createdOrder?._id && !createdOrder?.id) {
        throw new Error('Order was not created successfully');
      }

      // TODO(teamlead): prepaid PayPal flow goes here. The order above is created
      // as paymentStatus:'pending'. Before clearing the cart / navigating, drive:
      //   const { paypalOrderId } = await ordersApi.createPaypalOrder({ orderId });
      //   ...render PayPal Buttons, on approval:
      //   await ordersApi.capturePaypalOrder({ orderId, paypalOrderId });
      // Only clear the cart + show success once capture returns completed.
      // (Backend endpoints are scaffolded in paypalController.js and return 501
      //  until implemented — so end-to-end checkout stays blocked by design.)

      if (appliedCoupon && frontendTotals.discount > 0) {
        try {
          await couponApi.updateCouponUsage(appliedCoupon._id, {
            orderId: createdOrder._id || createdOrder.id,
            userId: user._id || user.id,
            discountAmount: frontendTotals.discount,
            orderTotal: frontendTotals.total,
            usedAt: new Date().toISOString(),
          });
        } catch (couponError) {
          console.error('Failed to update coupon usage:', couponError);
        }
      }

      clearCart();
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setBackendValidatedTotals(null);
      toast.success('Order placed successfully');
      navigate('/orders');
    } catch (error) {
      console.error('💥 Payment error:', error);
      toast.error(error.response?.data?.error || error.message || 'Order failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateQuantity = (item, quantity) => {
    if (quantity < 1) {
      handleRemoveItem(item);
      return;
    }

    const maxQty = item.stock ?? Infinity;
    if (quantity > maxQty) {
      toast.error(`Only ${maxQty} in stock`);
      return;
    }

    const success = updateQuantity(item.id || item._id, quantity, item.size, item.color);
    if (success) {
      toast.success('Quantity updated', { duration: 1000 });
      setBackendValidatedTotals(null);
    }
  };

  const handleRemoveItem = (item) => {
    const success = removeItem(item.id || item._id, item.size, item.color);
    if (success) {
      toast.success('Item removed from cart', { id: 'cart-empty' });
      setBackendValidatedTotals(null);
    }
  };

  // Load data when cart changes
  useEffect(() => {
    if (cartState.items.length > 0) {
      fetchProductDetails();
    } else {
      setProductDetails(new Map());
      setAvailableCoupons([]);
      setCouponSuggestions([]);
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setBackendValidatedTotals(null);
    }
  }, [cartState.items]);

  // Load coupons after product details are loaded
  useEffect(() => {
    if (productDetails.size > 0 && user) {
      fetchAvailableCoupons();
      fetchCouponSuggestions();
    }
  }, [productDetails, user]);

  // Clear backend validated totals when coupon changes
  useEffect(() => {
    setBackendValidatedTotals(null);
  }, [appliedCoupon, couponDiscount]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setItemsLoaded(true), 100);

    if (user && user.address) {
      setCustomAddress({
        address: formatAddress(user.address),
        city: user.address.city || user.city || '',
        state: user.address.state || user.state || '',
        pincode: user.address.pincode || user.pincode || '',
        phone: user.phone || ''
      });
    }

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, [user]);

  const formatAddress = (addressObj) => {
    if (typeof addressObj === 'string') return addressObj;
    if (!addressObj) return '';
    
    const parts = [];
    if (addressObj.street) parts.push(addressObj.street);
    if (addressObj.locality) parts.push(addressObj.locality);
    if (addressObj.city) parts.push(addressObj.city);
    if (addressObj.state) parts.push(addressObj.state);
    if (addressObj.pincode) parts.push(addressObj.pincode);
    
    return parts.join(', ');
  };

  const getShippingAddress = () => {
    if (useRegisteredAddress && user?.address) {
      return {
        address: formatAddress(user.address),
        city: user.address.city || user.city || '',
        state: user.address.state || user.state || '',
        pincode: user.address.pincode || user.pincode || '',
        phone: user.phone || ''
      };
    } else {
      return customAddress;
    }
  };

  const handleCustomAddressChange = (field, value) => {
    setCustomAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Show empty cart state if no items
  if (cartState?.isEmpty || cartState.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="container mx-auto px-4 py-6 sm:py-8 pt-24 sm:pt-32">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-amber-200 p-6 sm:p-8 transform hover:scale-105 transition-all duration-500">
              <div className="text-amber-300 mb-4 sm:mb-6 animate-bounce">
                <ShoppingBag className="w-16 h-16 sm:w-24 sm:h-24 mx-auto" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-3 sm:mb-4">
                Your cart is empty
              </h2>
              <p className="text-gray-600 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                Looks like you haven't added any items to your cart yet.
                Start shopping to add items to your cart.
              </p>
              <button
                onClick={() => navigate('/products')}
                className="group bg-gradient-to-r from-amber-600 to-orange-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium hover:from-amber-700 hover:to-orange-800 transition-all duration-300 inline-flex items-center transform hover:scale-105 hover:shadow-lg text-sm sm:text-base"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:animate-pulse" />
                Continue Shopping
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-6 sm:py-8 pt-24 sm:pt-32">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-2">
            Checkout
          </h1>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-amber-600 to-orange-700 mx-auto rounded-full"></div>
          
          {pricingLoading && (
            <div className="mt-4 text-amber-600 text-sm flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
              Loading pricing from database...
            </div>
          )}

          {backendValidatedTotals && (
            <div className="mt-2 text-green-600 text-xs flex items-center justify-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Amounts validated by backend
            </div>
          )}
        </div>
        
        {/* Cart Items and Coupon Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-amber-200 p-4 sm:p-8 hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Cart Items
                </h2>
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold">
                  {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {cartState.items.map((item, index) => {
                  const productId = item._id || item.id;
                  const product = productDetails.get(productId);
                  const priceData = product ? getPriceData(product) : {
                    basePrice: item.price || 0,
                    gstRate: 0,
                    gstAmount: 0,
                    totalPrice: item.price || 0
                  };
                  
                  const itemSubtotal = priceData.totalPrice * item.quantity;
                  
                  return (
                    <div 
                      key={`${productId}-${item.size || ''}-${item.color || ''}`}
                      className={`group bg-gradient-to-r from-white to-amber-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-amber-200 hover:border-amber-300 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] ${itemsLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0">
                        <div className="relative overflow-hidden rounded-lg sm:rounded-xl w-full sm:w-auto">
                          <img
                            src={resolveImageUrl(
                              item.image || item.imageUrl || product?.image || product?.imageUrl || product?.images?.[0]
                            )}
                            alt={item.name}
                            className="w-full sm:w-20 md:w-24 h-48 sm:h-20 md:h-24 object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        
                        <div className="sm:ml-4 md:ml-6 flex-1 w-full sm:w-auto">
                          <h3 className="font-bold text-gray-800 text-base sm:text-lg group-hover:text-amber-700 transition-colors">
                            {item.name}
                          </h3>
                          <div className="bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent font-bold text-base sm:text-lg">
                            ₹{priceData.totalPrice.toFixed(2)}/{item.unit || 'unit'}
                          </div>
                          
                          {!pricingLoading && priceData.gstAmount > 0 && (
                            <div className="text-xs text-gray-600 mt-1 space-y-1">

                              <div className="font-medium text-green-600">
                                Total: ₹{itemSubtotal.toFixed(2)} (incl. all taxes)
                              </div>
                            </div>
                          )}
                          
                          {(item.size || item.color) && (
                            <div className="text-sm text-gray-600 mt-1">
                              {item.size && <span>Size: {item.size}</span>}
                              {item.size && item.color && <span> • </span>}
                              {item.color && <span>Color: {item.color}</span>}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-4 md:space-x-6">
                          <div className="flex items-center bg-white rounded-lg sm:rounded-xl border-2 border-amber-200 shadow-sm hover:shadow-md transition-all duration-200">
                            <button
                              onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                              className="px-3 sm:px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-l-lg sm:rounded-l-xl transition-colors duration-200 font-bold text-base sm:text-lg"
                            >
                              <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <span className="px-3 sm:px-4 py-2 border-x-2 border-amber-200 font-bold text-gray-700 min-w-[2.5rem] sm:min-w-[3rem] text-center text-sm sm:text-base">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                              className="px-3 sm:px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-r-lg sm:rounded-r-xl transition-colors duration-200 font-bold text-base sm:text-lg"
                              disabled={item.quantity >= (item.stock || Infinity)}
                            >
                              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleRemoveItem(item)}
                            className="p-2 sm:p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all duration-200 transform hover:scale-110"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coupon Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-amber-200 p-4 sm:p-8 hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
                  <Gift className="w-6 h-6 text-amber-600 mr-2" />
                  Coupons & Offers
                </h2>
                <button
                  onClick={() => setShowCoupons(!showCoupons)}
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm"
                >
                  {showCoupons ? 'Hide' : 'View All'}
                </button>
              </div>

              {/* Applied Coupon Display */}
              {appliedCoupon && (
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-green-800">{appliedCoupon.title}</div>
                        <div className="text-sm text-green-600">
                          Code: <span className="font-mono font-bold">{appliedCoupon.code}</span>
                        </div>
                        <div className="text-sm text-green-600">
                          You saved ₹{couponDiscount.toFixed(2)}!
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Remove coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Coupon Input */}
              {!appliedCoupon && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="w-full px-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono uppercase"
                        maxLength="20"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            applyCouponCode();
                          }
                        }}
                      />
                      <Tag className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <button
                      onClick={() => applyCouponCode()}
                      disabled={!couponCode.trim() || couponLoading}
                      className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-xl hover:from-amber-700 hover:to-orange-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                    >
                      {couponLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Coupon Suggestions */}
              {couponSuggestions.length > 0 && !appliedCoupon && (
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Recommended for you</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {couponSuggestions.slice(0, 2).map((suggestion) => (
                      <button
                        key={suggestion._id}
                        onClick={() => applyCouponCode(suggestion.code)}
                        disabled={couponLoading}
                        className="group flex items-center px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 border border-amber-300 rounded-lg text-xs font-medium text-amber-800 hover:text-amber-900 transition-all duration-200 transform hover:scale-105"
                      >
                        <Gift className="w-3 h-3 mr-1" />
                        <span className="font-mono font-bold mr-1">{suggestion.code}</span>
                        <span className="text-green-600 font-bold">
                          Save ₹{suggestion.discount?.toFixed(2) || '0'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Coupons List */}
              {showCoupons && availableCoupons.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {availableCoupons.map((coupon) => (
                    <div key={coupon._id} className="p-3 border border-amber-200 rounded-lg hover:bg-amber-50 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 text-sm">{coupon.title}</div>
                          <div className="text-xs text-gray-600">
                            Code: <span className="font-mono font-bold text-amber-600">{coupon.code}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {coupon.discountType === 'percentage' 
                              ? `${coupon.discountValue}% off` 
                              : `₹${coupon.discountValue} off`
                            }
                            {coupon.minOrderValue > 0 && ` • Min: ₹${coupon.minOrderValue}`}
                          </div>
                        </div>
                        <button
                          onClick={() => applyCouponCode(coupon.code)}
                          disabled={couponLoading || !coupon.canUse}
                          className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 disabled:bg-gray-400 transition-colors duration-200"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-amber-200 p-4 sm:p-8 sticky top-20 sm:top-24 hover:shadow-2xl transition-all duration-500">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 mr-2" />
                Order Summary
                {backendValidatedTotals && (
                  <div className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Backend Validated
                  </div>
                )}
              </h2>
              
              {pricingLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading pricing from database...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    <div className="flex justify-between text-gray-600 text-base sm:text-lg">
                      <span>Subtotal ({getTotalItems()} items) <span className="text-xs text-gray-500">(incl. GST)</span></span>
                      <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    
                    {appliedCoupon && totals.discount > 0 && (
                      <div className="flex justify-between text-green-600 text-base sm:text-lg">
                        <span className="flex items-center">
                          <Gift className="w-4 h-4 mr-2" />
                          Coupon Discount ({appliedCoupon.code})
                        </span>
                        <span className="font-semibold">-₹{totals.discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-600 text-base sm:text-lg items-center">
                      <span className="flex items-center">
                        <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Shipping
                      </span>
                      <span className={`font-semibold ${totals.shipping === 0 ? 'text-amber-600' : ''}`}>
                        {totals.shipping === 0 ? 'Free' : `₹${totals.shipping}`}
                      </span>
                    </div>
                    
                    <div className="border-t-2 border-amber-200 pt-3 sm:pt-4 flex justify-between font-bold text-lg sm:text-xl">
                      <span className="text-gray-800">Total</span>
                      <span className="bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                        ₹{totals.total.toFixed(2)}
                      </span>
                    </div>
                    
                    {appliedCoupon && totals.discount > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center justify-center text-green-700">
                          <Sparkles className="w-4 h-4 mr-2" />
                          <span className="font-semibold">
                            You Save: ₹{totals.discount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Shipping Address Section */}
              <div className="mb-6 sm:mb-8">
                <h3 className="font-bold text-gray-800 mb-3 sm:mb-4 flex items-center text-base sm:text-lg">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2" />
                  Shipping Address
                </h3>
                
                <div className="space-y-3">
                  {user?.address && (
                    <label className="group flex items-start space-x-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-amber-200 hover:border-amber-300 cursor-pointer transition-all duration-200 hover:bg-amber-50/50">
                      <input
                        type="radio"
                        name="address"
                        value="registered"
                        checked={useRegisteredAddress}
                        onChange={() => setUseRegisteredAddress(true)}
                        className="text-amber-600 focus:ring-amber-500 w-4 h-4 sm:w-5 sm:h-5 mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 mr-2" />
                          <span className="font-medium text-gray-700 group-hover:text-amber-700 text-sm sm:text-base">
                            Registered Address
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                          {formatAddress(user.address)}
                        </div>
                      </div>
                    </label>
                  )}

                  <label className="group flex items-start space-x-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-amber-200 hover:border-amber-300 cursor-pointer transition-all duration-200 hover:bg-amber-50/50">
                    <input
                      type="radio"
                      name="address"
                      value="custom"
                      checked={!useRegisteredAddress}
                      onChange={() => setUseRegisteredAddress(false)}
                      className="text-amber-600 focus:ring-amber-500 w-4 h-4 sm:w-5 sm:h-5 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 mr-2" />
                        <span className="font-medium text-gray-700 group-hover:text-amber-700 text-sm sm:text-base">
                          Add New Address
                        </span>
                      </div>
                    </div>
                  </label>

                  {!useRegisteredAddress && (
                    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-amber-50/50 rounded-lg sm:rounded-xl border border-amber-200">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Address *
                        </label>
                        <textarea
                          value={customAddress.address}
                          onChange={(e) => handleCustomAddressChange('address', e.target.value)}
                          placeholder="Enter your full address"
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm sm:text-base"
                          rows="3"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            value={customAddress.city}
                            onChange={(e) => handleCustomAddressChange('city', e.target.value)}
                            placeholder="City"
                            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm sm:text-base"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            State *
                          </label>
                          <input
                            type="text"
                            value={customAddress.state}
                            onChange={(e) => handleCustomAddressChange('state', e.target.value)}
                            placeholder="State"
                            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm sm:text-base"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            Pincode *
                          </label>
                          <input
                            type="text"
                            value={customAddress.pincode}
                            onChange={(e) => handleCustomAddressChange('pincode', e.target.value)}
                            placeholder="6-digit pincode"
                            maxLength="6"
                            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm sm:text-base"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={customAddress.phone}
                            onChange={(e) => handleCustomAddressChange('phone', e.target.value)}
                            placeholder="Phone number"
                            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm sm:text-base"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-6 sm:mb-8">
                <h3 className="font-bold text-gray-800 mb-3 sm:mb-4 flex items-center text-base sm:text-lg">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2" />
                  Payment Method
                </h3>
                <div className="space-y-3">
                  {/* Prepaid only. COD removed — PayPal is the sole method.
                      TODO(teamlead): replace this radio with the PayPal Buttons
                      SDK (<PayPalButtons/>) that calls ordersApi.createPaypalOrder
                      then ordersApi.capturePaypalOrder on approval. */}
                  <label className="group flex items-center space-x-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-amber-200 hover:border-amber-300 cursor-pointer transition-all duration-200 hover:bg-amber-50/50">
                    <input
                      type="radio"
                      name="payment"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-amber-600 focus:ring-amber-500 w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2" />
                      <span className="font-medium text-gray-700 group-hover:text-amber-700 text-sm sm:text-base">
                        PayPal
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <button 
                onClick={handleProceedToPayment}
                disabled={isProcessing || cartStats?.isEmpty || pricingLoading}
                className="group w-full bg-gradient-to-r from-amber-600 to-orange-700 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:from-amber-700 hover:to-orange-800 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-xl flex items-center justify-center text-base sm:text-lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : pricingLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                    Loading pricing...
                  </>
                ) : (
                  <>
                    Place Order • ₹{totals.total.toFixed(2)}
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CheckoutPage;
