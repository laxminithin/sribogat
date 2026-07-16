// Fixed Order Controller - Proper GST Field Names for Database Storage + HSN Support
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const RazorpayTransaction = require('../models/RazorpayTransaction');
require('dotenv').config();

console.log('🔍 Order model import check:', {
  orderExists: !!Order,
  orderType: typeof Order,
  isFunction: typeof Order === 'function',
  modelName: Order?.modelName || 'No modelName',
  isMongooseModel: Order?.prototype?.constructor === Order
});

// ✅ FIXED: Proper GST calculation from database
const getProductPricing = (product) => {
  console.log('🔍 Analyzing product pricing:', {
    productId: product._id,
    name: product.name,
    price: product.price,
    gstRate: product.gstRate,
    gst: product.gst,
    totalPrice: product.totalPrice,
    gstAmount: product.gstAmount,
    hsn: product.hsn || product.hsnCode // ✅ Added HSN support
  });

  // Method 1: If database has pre-calculated total price with GST
  if (product.totalPrice !== undefined && product.totalPrice !== null && product.totalPrice > 0) {
    const basePrice = parseFloat(product.price) || 0;
    const totalPrice = parseFloat(product.totalPrice);
    const gstRate = product.gstRate || product.gst || 18;
    const calculatedGstAmount = totalPrice - basePrice;
    
    console.log('✅ Using database totalPrice method:', {
      basePrice,
      totalPrice,
      gstRate,
      calculatedGstAmount
    });
    
    return {
      basePrice,
      gstRate,
      gstAmount: calculatedGstAmount > 0 ? calculatedGstAmount : (basePrice * gstRate) / 100,
      totalPrice,
      hasGSTIncluded: true,
      hsn: product.hsn || product.hsnCode || '1234' // ✅ Default HSN if not available
    };
  }
  
  // Method 2: If database has separate GST amount stored
  if (product.gstAmount !== undefined && product.gstAmount !== null && product.gstAmount > 0) {
    const basePrice = parseFloat(product.price) || 0;
    const gstAmount = parseFloat(product.gstAmount);
    const gstRate = product.gstRate || product.gst || 18;
    const totalPrice = basePrice + gstAmount;
    
    console.log('✅ Using database gstAmount method:', {
      basePrice,
      gstAmount,
      gstRate,
      totalPrice
    });
    
    return {
      basePrice,
      gstRate,
      gstAmount,
      totalPrice,
      hasGSTIncluded: true,
      hsn: product.hsn || product.hsnCode || '1234' // ✅ Default HSN if not available
    };
  }
  
  // Method 3: Calculate GST from base price and rate (fallback)
  const basePrice = parseFloat(product.price) || 0;
  const gstRate = product.gstRate || product.gst || 18;
  const gstAmount = (basePrice * gstRate) / 100;
  const totalPrice = basePrice + gstAmount;
  
  console.warn(`⚠️ Product ${product.name} missing pre-calculated GST data, calculating:`, {
    basePrice, gstRate, gstAmount, totalPrice
  });
  
  return {
    basePrice,
    gstRate,
    gstAmount,
    totalPrice,
    hasGSTIncluded: false,
    hsn: product.hsn || product.hsnCode || '1234' // ✅ Default HSN if not available
  };
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { 
      items, 
      shippingAddress, 
      paymentMethod,
      couponCode,
      couponId,
      discount: frontendDiscount,
      amount: frontendAmount
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    let calculatedSubtotal = 0;
    let calculatedGST = 0;
    let processedItems = [];

    // ✅ FIXED: Process items using proper database pricing with GST calculation + HSN
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.product} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      // ✅ Get proper pricing data from database
      const pricingData = getProductPricing(product);
      
      const itemSubtotal = pricingData.totalPrice * item.quantity;
      const itemGSTTotal = pricingData.gstAmount * item.quantity;
      
      calculatedSubtotal += itemSubtotal;
      calculatedGST += itemGSTTotal;

      // ✅ FIXED: Store GST information using correct field names + HSN
      processedItems.push({
        product: item.product,
        quantity: item.quantity,
        price: pricingData.totalPrice, // Total price including GST
        basePrice: pricingData.basePrice, // Base price without GST
        gst: pricingData.gstAmount, // ✅ Use 'gst' field name (matches your current structure)
        gstRate: pricingData.gstRate, // GST rate percentage
        gstAmount: pricingData.gstAmount, // GST amount per unit (for backward compatibility)
        totalGstAmount: itemGSTTotal, // Total GST for this item
        hsn: pricingData.hsn, // ✅ HSN code for tax compliance
        name: product.name
      });

      console.log(`📦 Processed item ${product.name}:`, {
        basePrice: pricingData.basePrice,
        gstRate: pricingData.gstRate,
        gstAmount: pricingData.gstAmount,
        totalPrice: pricingData.totalPrice,
        hsn: pricingData.hsn, // ✅ Log HSN code
        quantity: item.quantity,
        itemSubtotal,
        itemGSTTotal,
        storedGstField: pricingData.gstAmount // This will be stored in 'gst' field
      });

      // Update stock
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    // ✅ Calculate totals using database pricing with GST
    const orderSubtotal = Math.round(calculatedSubtotal * 100) / 100;
    const orderGST = Math.round(calculatedGST * 100) / 100;
    const orderDiscount = frontendDiscount || 0;
    const orderDiscountedSubtotal = Math.max(0, orderSubtotal - orderDiscount);
    
    // Adjust GST proportionally if discount applied
    let adjustedOrderGST = orderGST;
    if (orderDiscount > 0 && orderSubtotal > 0) {
      const discountRatio = orderDiscountedSubtotal / orderSubtotal;
      adjustedOrderGST = orderGST * discountRatio;
    }
    adjustedOrderGST = Math.round(adjustedOrderGST * 100) / 100;
    
    const shippingCharge = orderDiscountedSubtotal >= 500 ? 0 : 50;
    const totalAmount = orderDiscountedSubtotal + shippingCharge;

    console.log('💰 COD Order Calculation (Fixed GST Field Names + HSN):', {
      originalSubtotal: orderSubtotal,
      originalGST: orderGST,
      discount: orderDiscount,
      discountedSubtotal: orderDiscountedSubtotal,
      adjustedGST: adjustedOrderGST,
      shipping: shippingCharge,
      total: totalAmount,
      itemsWithHSN: processedItems.map(item => ({ name: item.name, hsn: item.hsn })),
      note: 'GST properly calculated and stored with correct field names + HSN codes'
    });

    // Validate coupon if provided
    if (couponId && couponCode && orderDiscount > 0) {
      const coupon = await Coupon.findById(couponId);
      if (!coupon || !coupon.isActive || new Date() > coupon.endDate) {
        return res.status(400).json({ error: 'Invalid or expired coupon' });
      }
    }

    const order = new Order({
      user: req.user.userId,
      items: processedItems, // ✅ Contains GST breakdown with correct field names + HSN
      subtotal: orderSubtotal, // ✅ Includes GST calculated from database
      discountedSubtotal: orderDiscountedSubtotal,
      discount: orderDiscount,
      couponCode: couponCode || null,
      couponId: couponId || null,
      totalAmount,
      gstAmount: adjustedOrderGST, // ✅ GST calculated from database
      originalGstAmount: orderGST, // ✅ Original GST before discount adjustment
      shippingCharge,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'initiated',
      status: 'pending'
    });

    const savedOrder = await order.save();

    console.log('✅ Order created with proper GST breakdown using correct field names + HSN codes');
    console.log('📋 Saved order items preview:', savedOrder.items.map(item => ({
      name: item.name,
      gst: item.gst, // ✅ This should now have the GST amount
      gstRate: item.gstRate,
      basePrice: item.basePrice,
      price: item.price,
      hsn: item.hsn // ✅ HSN code
    })));

    res.status(201).json({
      success: true,
      order: savedOrder,
      message: 'Order created successfully with proper GST breakdown and HSN codes'
    });

  } catch (error) {
    console.error('❌ Error in createOrder:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create order', 
      details: error.message 
    });
  }
};

// ✅ FIXED: Enhanced Razorpay order creation with proper GST handling + HSN
exports.createRazorpayOrder = async (req, res) => {
  try {
    console.log('=== RAZORPAY ORDER CREATE (FIXED GST FIELD NAMES + HSN) ===');
    console.log('Request body:', req.body);
    
    const { 
      amount, 
      subtotal: frontendSubtotal, 
      discountedSubtotal: frontendDiscountedSubtotal,
      discount: frontendDiscount,
      couponCode,
      couponId,
      shipping: frontendShipping,
      cartItems,
      calculationMethod = 'database_pricing_with_correct_gst_fields_and_hsn'
    } = req.body;

    // Validate coupon if provided
    let validatedDiscount = 0;
    let validatedCoupon = null;

    if (couponCode && couponId) {
      validatedCoupon = await Coupon.findById(couponId);
      if (!validatedCoupon || validatedCoupon.code !== couponCode.toUpperCase()) {
        return res.status(400).json({ success: false, error: 'Invalid coupon' });
      }

      // Check coupon validity
      const now = new Date();
      const isCurrentlyValid = (
        validatedCoupon.isActive && 
        now >= validatedCoupon.startDate && 
        now <= validatedCoupon.endDate &&
        (!validatedCoupon.maxUsageCount || validatedCoupon.currentUsage < validatedCoupon.maxUsageCount) &&
        (!validatedCoupon.budget || validatedCoupon.budgetUtilized < validatedCoupon.budget)
      );
      
      if (!isCurrentlyValid) {
        return res.status(400).json({ success: false, error: 'Coupon is not currently valid' });
      }
    }

    // ✅ FIXED: Process cart items and calculate GST properly for storage + HSN
    let processedItems = [];
    let calculatedSubtotal = 0;
    let calculatedGST = 0;

    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      console.log('🛒 Processing cart items with proper database pricing, GST calculation + HSN...');
      
      for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            error: `Product ${item.productId} not found` 
          });
        }
        
        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            error: `Insufficient stock for ${product.name}` 
          });
        }

        // ✅ Get proper pricing data from database
        const pricingData = getProductPricing(product);
        
        console.log(`📦 Product ${product.name} pricing calculation:`, {
          basePrice: pricingData.basePrice,
          gstRate: pricingData.gstRate,
          gstAmount: pricingData.gstAmount,
          totalPrice: pricingData.totalPrice,
          hsn: pricingData.hsn, // ✅ Log HSN
          quantity: item.quantity,
          itemSubtotal: pricingData.totalPrice * item.quantity,
          itemGSTTotal: pricingData.gstAmount * item.quantity
        });

        // ✅ Calculate totals using proper database pricing
        const itemSubtotal = pricingData.totalPrice * item.quantity;
        const itemGSTTotal = pricingData.gstAmount * item.quantity;
        
        calculatedSubtotal += itemSubtotal;
        calculatedGST += itemGSTTotal;

        // ✅ FIXED: Store GST information using correct field names + HSN
        processedItems.push({
          product: item.productId,
          quantity: item.quantity,
          price: pricingData.totalPrice, // Total price including GST
          basePrice: pricingData.basePrice, // Base price without GST
          gst: pricingData.gstAmount, // ✅ Use 'gst' field name (matches your structure)
          gstRate: pricingData.gstRate, // GST rate percentage
          gstAmount: pricingData.gstAmount, // GST amount per unit (for backward compatibility)
          totalGstAmount: itemGSTTotal, // Total GST for this item
          hsn: pricingData.hsn, // ✅ HSN code for tax compliance
          name: product.name
        });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Cart items are required' });
    }

    // Backend calculations
    const finalSubtotal = Math.round(calculatedSubtotal * 100) / 100;
    const finalGST = Math.round(calculatedGST * 100) / 100;
    
    console.log('💰 Backend Subtotal (calculated from database with correct GST fields + HSN):', {
      calculatedSubtotal: finalSubtotal,
      calculatedGST: finalGST,
      frontendSubtotal,
      hsnCodes: processedItems.map(item => ({ name: item.name, hsn: item.hsn })),
      note: 'GST properly calculated and will use correct field names + HSN codes'
    });

    // Validate subtotal match with frontend
    if (Math.abs(frontendSubtotal - finalSubtotal) > 0.01) {
      console.error('❌ Subtotal mismatch:', {
        frontendSubtotal,
        backendSubtotal: finalSubtotal,
        backendGST: finalGST
      });
      return res.status(400).json({
        success: false,
        error: `Subtotal mismatch. Expected: ₹${finalSubtotal.toFixed(2)}, Received: ₹${frontendSubtotal.toFixed(2)}`,
        debug: {
          backendCalculated: {
            subtotal: finalSubtotal,
            gst: finalGST
          },
          frontend: {
            subtotal: frontendSubtotal
          }
        }
      });
    }

    // Calculate discount if coupon is applied
    if (validatedCoupon) {
      if (finalSubtotal < validatedCoupon.minOrderValue) {
        return res.status(400).json({
          success: false,
          error: `Minimum order value of ₹${validatedCoupon.minOrderValue} required`
        });
      }

      if (validatedCoupon.discountType === 'percentage') {
        validatedDiscount = (finalSubtotal * validatedCoupon.discountValue) / 100;
        if (validatedCoupon.maxDiscountAmount && validatedDiscount > validatedCoupon.maxDiscountAmount) {
          validatedDiscount = validatedCoupon.maxDiscountAmount;
        }
      } else if (validatedCoupon.discountType === 'fixed') {
        validatedDiscount = Math.min(validatedCoupon.discountValue, finalSubtotal);
      }
      
      validatedDiscount = Math.round(validatedDiscount * 100) / 100;

      if (Math.abs(frontendDiscount - validatedDiscount) > 0.01) {
        return res.status(400).json({
          success: false,
          error: `Discount mismatch. Expected: ₹${validatedDiscount.toFixed(2)}, Received: ₹${frontendDiscount.toFixed(2)}`
        });
      }
    }

    const finalDiscount = Math.round(validatedDiscount * 100) / 100;
    const finalDiscountedSubtotal = Math.max(0, finalSubtotal - finalDiscount);

    // Adjust GST proportionally if discount is applied
    let adjustedGST = finalGST;
    if (finalDiscount > 0 && finalSubtotal > 0) {
      const discountRatio = finalDiscountedSubtotal / finalSubtotal;
      adjustedGST = finalGST * discountRatio;
      console.log('🧮 GST adjusted for discount:', {
        originalGST: finalGST,
        discountRatio,
        adjustedGST
      });
    }
    adjustedGST = Math.round(adjustedGST * 100) / 100;

    // Calculate shipping
    const finalShipping = finalDiscountedSubtotal >= 500 ? 0 : 50;

    // Final total = discounted subtotal + shipping (GST already included in subtotal)
    const finalTotal = finalDiscountedSubtotal + finalShipping;
    const roundedFinalTotal = Math.round(finalTotal * 100) / 100;

    console.log('💰 Backend Final Calculations (Fixed GST Field Names + HSN):', {
      originalSubtotal: finalSubtotal,
      originalGST: finalGST,
      discount: finalDiscount,
      discountedSubtotal: finalDiscountedSubtotal,
      adjustedGST: adjustedGST,
      shipping: finalShipping,
      total: roundedFinalTotal,
      note: 'GST properly calculated and will be stored with correct field names + HSN codes'
    });

    // Validate total amount with frontend
    if (Math.abs(amount - roundedFinalTotal) > 0.01) {
      console.error('❌ Amount mismatch:', {
        frontendAmount: amount,
        backendAmount: roundedFinalTotal,
        difference: Math.abs(amount - roundedFinalTotal)
      });
      
      return res.status(400).json({
        success: false,
        error: `Amount mismatch. Expected: ₹${roundedFinalTotal.toFixed(2)}, Received: ₹${amount.toFixed(2)}`,
        debug: {
          backendCalculation: {
            originalSubtotal: finalSubtotal,
            discount: finalDiscount,
            discountedSubtotal: finalDiscountedSubtotal,
            gst: adjustedGST,
            shipping: finalShipping,
            total: roundedFinalTotal
          }
        }
      });
    }

    console.log('✅ Amount validation passed - creating Razorpay order');
    
    // Create Razorpay order
    const options = {
      amount: Math.round(roundedFinalTotal * 100), // Convert to paisa
      currency: "INR",
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // ✅ FIXED: Store transaction info with complete GST breakdown using correct field names + HSN
    const transaction = new RazorpayTransaction({
      userId: req.user.userId,
      razorpayOrderId: razorpayOrder.id,
      amount: roundedFinalTotal,
      currency: "INR",
      status: 'created',
      paymentMethod: 'razorpay',
      metadata: {
        receipt: options.receipt,
        created_at: new Date(),
        originalSubtotal: finalSubtotal,
        discount: finalDiscount,
        discountedSubtotal: finalDiscountedSubtotal,
        gstAmount: adjustedGST, // ✅ Store adjusted GST amount
        originalGstAmount: finalGST, // ✅ Store original GST amount
        shippingCharge: finalShipping,
        totalAmount: roundedFinalTotal,
        couponCode: couponCode || null,
        couponId: couponId || null,
        cartItems: cartItems || [],
        processedItems: processedItems, // ✅ Includes GST breakdown with correct field names + HSN
        calculationMethod: 'database_pricing_with_correct_gst_field_names_and_hsn',
        backendValidated: true,
        validatedAt: new Date(),
        gstNote: 'GST properly calculated from database and stored with correct field names (gst field) + HSN codes'
      }
    });

    await transaction.save();
    console.log('✅ Transaction created successfully with proper GST breakdown using correct field names + HSN codes');

    // Return backend validated totals to frontend
    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // in paisa
      currency: razorpayOrder.currency,
      validatedTotals: {
        subtotal: finalSubtotal, // ✅ Includes GST calculated from database
        discount: finalDiscount,
        discountedSubtotal: finalDiscountedSubtotal,
        gst: adjustedGST, // ✅ GST amount (adjusted for discount)
        originalGst: finalGST, // ✅ Original GST amount
        shipping: finalShipping,
        total: roundedFinalTotal
      },
      gstBreakdown: processedItems.map(item => ({
        productId: item.product,
        productName: item.name,
        quantity: item.quantity,
        basePrice: item.basePrice,
        gstRate: item.gstRate,
        gstAmountPerUnit: item.gst, // ✅ Using correct field name
        totalGstAmount: item.totalGstAmount,
        hsn: item.hsn // ✅ HSN code for invoice
      })),
      gstNote: 'GST properly calculated from database pricing data and stored with correct field names + HSN codes'
    });

  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      details: error.message
    });
  }
};

// ✅ FIXED: Updated verifyPayment function to handle proper GST storage + HSN
exports.verifyPayment = async (req, res) => {
  try {
    console.log('🚀 === PAYMENT VERIFICATION (FIXED GST FIELD NAMES + HSN) ===');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_details
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_details) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required payment details' 
      });
    }

    // Find the transaction record
    const transaction = await RazorpayTransaction.findOne({
      razorpayOrderId: razorpay_order_id
    });

    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        error: 'Transaction not found'
      });
    }

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      console.error('❌ Signature verification failed');
      transaction.status = 'failed';
      transaction.errorDescription = 'Invalid payment signature';
      await transaction.save();
      
      return res.status(400).json({ 
        success: false,
        error: "Invalid payment signature"
      });
    }

    console.log('✅ Signature verification passed');

    // ✅ Extract validated data from transaction metadata (BACKEND TRUTH)
    const metadata = transaction.metadata || {};
    const {
      originalSubtotal,
      discount,
      discountedSubtotal,
      gstAmount,
      originalGstAmount,
      shippingCharge,
      totalAmount,
      couponCode,
      couponId,
      processedItems // ✅ Contains GST breakdown with correct field names + HSN
    } = metadata;

    console.log('🎫 Using BACKEND validated data with proper GST breakdown (correct field names + HSN):', {
      originalSubtotal,
      discount,
      discountedSubtotal,
      gstAmount,
      originalGstAmount,
      shippingCharge,
      totalAmount,
      couponCode,
      couponId,
      processedItemsCount: processedItems?.length || 0,
      hsnCodes: processedItems?.map(item => ({ name: item.name, hsn: item.hsn })) || []
    });

    // Validate order details
    const { items, shippingAddress } = order_details;
    if (!items || !Array.isArray(items) || !shippingAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order details provided' 
      });
    }

    // Update stock for all items
    console.log('💰 Updating stock for items...');
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ 
          success: false,
          error: `Product with ID ${item.product} does not exist`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false,
          error: `Only ${product.stock} units available for ${product.name}`
        });
      }

      // Update product stock
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
      
      console.log(`📦 Stock updated for ${product.name}`);
    }

    console.log('✅ All items processed and stock updated');

    // ✅ FIXED: Create order using processed items with GST information using correct field names + HSN
    let orderItems = [];
    
    if (processedItems && Array.isArray(processedItems)) {
      // Use processed items from transaction (contains proper GST breakdown with correct field names + HSN)
      orderItems = processedItems.map(processedItem => ({
        product: processedItem.product,
        quantity: processedItem.quantity,
        price: processedItem.price, // Total price including GST
        basePrice: processedItem.basePrice, // Base price without GST
        gst: processedItem.gst, // ✅ Use 'gst' field name (matches your structure)
        gstRate: processedItem.gstRate, // GST rate percentage
        gstAmount: processedItem.gstAmount, // GST amount per unit (for backward compatibility)
        totalGstAmount: processedItem.totalGstAmount, // Total GST for this item
        hsn: processedItem.hsn, // ✅ HSN code for tax compliance
        name: processedItem.name
      }));
    } else {
      // Fallback: use items from order_details but calculate proper GST with correct field names + HSN
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (product) {
          const pricingData = getProductPricing(product);
          
          orderItems.push({
            product: item.product,
            quantity: item.quantity,
            price: pricingData.totalPrice,
            basePrice: pricingData.basePrice,
            gst: pricingData.gstAmount, // ✅ Use 'gst' field name
            gstRate: pricingData.gstRate,
            gstAmount: pricingData.gstAmount, // For backward compatibility
            totalGstAmount: pricingData.gstAmount * item.quantity,
            hsn: pricingData.hsn, // ✅ HSN code
            name: product.name
          });
        }
      }
    }

    console.log('📦 Order items with proper GST breakdown prepared (correct field names + HSN):', {
      totalItems: orderItems.length,
      sampleItem: orderItems[0] ? {
        name: orderItems[0].name,
        basePrice: orderItems[0].basePrice,
        gst: orderItems[0].gst, // ✅ This should now have the GST amount
        gstRate: orderItems[0].gstRate,
        totalPrice: orderItems[0].price,
        hsn: orderItems[0].hsn // ✅ HSN code
      } : 'No items'
    });

    // ✅ Create order using BACKEND validated data with GST information using correct field names + HSN
    const order = new Order({
      user: req.user.userId,
      items: orderItems, // ✅ Use order items with GST breakdown using correct field names + HSN
      // ✅ Use BACKEND validated data from transaction metadata
      subtotal: originalSubtotal || 0, // Already includes GST
      discountedSubtotal: discountedSubtotal || 0,
      discount: discount || 0,
      couponCode: couponCode || null,
      couponId: couponId || null,
      totalAmount: totalAmount, // Use backend calculated total
      gstAmount: gstAmount || 0, // ✅ Store adjusted GST amount
      originalGstAmount: originalGstAmount || 0, // ✅ Store original GST amount
      shippingCharge: shippingCharge || 0,
      shippingAddress,
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      razorpayDetails: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      }
    });

    await order.save();
    console.log('✅ Order created successfully with proper GST breakdown using correct field names + HSN codes:', order._id);
    
    // ✅ Log the saved items to verify GST field and HSN are populated
    console.log('📋 Saved order items with GST and HSN verification:', order.items.map(item => ({
      name: item.name,
      gst: item.gst, // ✅ This should now show the actual GST amount instead of 0
      gstRate: item.gstRate,
      basePrice: item.basePrice,
      price: item.price,
      quantity: item.quantity,
      hsn: item.hsn // ✅ HSN code for tax compliance
    })));

    // Apply coupon usage if coupon was used
    if (couponId && discount > 0) {
      try {
        console.log('🎫 Applying coupon usage...');
        await updateCouponAfterPayment(couponId, order._id, req.user.userId, discount, originalSubtotal);
        console.log('✅ Coupon usage applied successfully');
      } catch (couponError) {
        console.error('❌ Error applying coupon usage:', couponError);
        // Don't fail the order creation
      }
    }

    // Update transaction record
    transaction.orderId = order._id;
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.status = 'captured';
    transaction.metadata = {
      ...transaction.metadata,
      finalOrderId: order._id,
      captured_at: new Date()
    };
    
    await transaction.save();

    console.log('🎉 === PAYMENT VERIFICATION COMPLETED WITH CORRECT GST FIELD NAMES + HSN CODES ===');

    res.status(201).json({
      success: true,
      order,
      message: 'Payment verified and order created successfully with proper GST breakdown using correct field names + HSN codes'
    });
  } catch (error) {
    console.error('💥 Payment verification error:', error);
    
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: 'An error occurred during payment verification'
    });
  }
};

const updateCouponAfterPayment = async (couponId, orderId, userId, discountAmount, orderTotal) => {
  try {
    console.log('🎫 Manually updating coupon usage:', {
      couponId,
      orderId,
      discountAmount,
      orderTotal
    });

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      console.error('❌ Coupon not found for manual update');
      return;
    }

    // Check if already updated
    const existingUsage = coupon.usageHistory.find(
      usage => usage.orderId && usage.orderId.toString() === orderId.toString()
    );

    if (existingUsage) {
      console.log('✅ Coupon usage already recorded');
      return;
    }

    // Manual update
    coupon.usageHistory.push({
      userId,
      orderId,
      discountAmount: parseFloat(discountAmount),
      orderTotal: parseFloat(orderTotal),
      usedAt: new Date()
    });
    
    coupon.currentUsage = (coupon.currentUsage || 0) + 1;
    coupon.totalSales = (coupon.totalSales || 0) + parseFloat(orderTotal);
    coupon.budgetUtilized = (coupon.budgetUtilized || 0) + parseFloat(discountAmount);
    
    await coupon.save();

    console.log('✅ Manual coupon update successful:', {
      code: coupon.code,
      currentUsage: coupon.currentUsage,
      totalSales: coupon.totalSales,
      budgetUtilized: coupon.budgetUtilized
    });

  } catch (error) {
    console.error('❌ Manual coupon update failed:', error);
  }
};

// Get all orders (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      search, 
      sortField = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const query = {};

    if (status) query.status = status;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { '_id': { $regex: searchRegex } },
        { 'user.name': { $regex: searchRegex } },
        { 'user.email': { $regex: searchRegex } },
        { 'user.phone': { $regex: searchRegex } }
      ];
    }

    const sortObj = {};
    if (sortField === 'user.name') {
      sortObj['user.name'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name price image hsn hsnCode') // ✅ Include HSN fields
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const orders = await Order.find({ user: req.user.userId })
      .populate('items.product', 'name price image hsn hsnCode') // ✅ Include HSN fields
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Order.countDocuments({ user: req.user.userId });

    res.json({
      orders,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get order by ID
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name price image hsn hsnCode'); // ✅ Include HSN fields

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update order status (admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email')
      .populate('items.product', 'name price image hsn hsnCode'); // ✅ Include HSN fields

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update payment status (admin)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get orders by date range
exports.getOrdersByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const orders = await Order.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
      .populate('user', 'name email phone')
      .populate('items.product', 'name price image hsn hsnCode') // ✅ Include HSN fields
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export orders
exports.exportOrders = async (req, res) => {
  try {
    const { startDate, endDate, status, search } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { '_id': { $regex: searchRegex } },
        { 'user.name': { $regex: searchRegex } },
        { 'user.email': { $regex: searchRegex } },
        { 'user.phone': { $regex: searchRegex } }
      ];
    }

    console.log('Export query:', query);

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name price hsn hsnCode') // ✅ Include HSN fields
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || !orders.length) {
      return res.status(404).json({ error: 'No orders found for the specified criteria' });
    }

    // Create CSV content with GST breakdown + HSN
    const csvRows = [];
    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Items',
      'HSN Codes', // ✅ Added HSN column
      'Subtotal',
      'GST Amount',
      'Shipping Charge',
      'Total Amount',
      'Status',
      'Payment Status',
      'Payment Method',
      'Shipping Address',
      'Admin Note'
    ];

    csvRows.push(headers.join(','));

    for (const order of orders) {
      const hsnCodes = (order.items || []).map(item => 
        item.hsn || item.product?.hsn || item.product?.hsnCode || '1234'
      ).join('; '); // ✅ Collect HSN codes

      const row = [
        `"${order._id || ''}"`,
        `"${order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}"`,
        `"${(order.user?.name || '').replace(/"/g, '""')}"`,
        `"${(order.user?.email || '').replace(/"/g, '""')}"`,
        `"${(order.user?.phone || '').replace(/"/g, '""')}"`,
        `"${(order.items || []).map(item => 
          `${(item.product?.name || '').replace(/"/g, '""')} (${item.quantity || 0} × ₹${item.price || 0})`
        ).join('; ')}"`,
        `"${hsnCodes}"`, // ✅ HSN codes column
        `"₹${(order.subtotal || 0).toLocaleString()}"`,
        `"₹${(order.gstAmount || 0).toLocaleString()}"`,
        `"₹${(order.shippingCharge || 0).toLocaleString()}"`,
        `"₹${(order.totalAmount || 0).toLocaleString()}"`,
        `"${order.status || 'pending'}"`,
        `"${order.paymentStatus || 'pending'}"`,
        `"${order.paymentMethod || 'N/A'}"`,
        `"${order.shippingAddress ? 
          [
            order.shippingAddress.address,
            order.shippingAddress.city,
            order.shippingAddress.state,
            order.shippingAddress.pincode
          ].filter(Boolean).join(', ').replace(/"/g, '""')
          : 'Address not available'
        }"`,
        `"${(order.adminNote || '').replace(/"/g, '""')}"`
      ];
      
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const filename = `orders-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent));
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ 
      error: 'Failed to export orders',
      details: error.message 
    });
  }
};

// Get order statistics
exports.getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price hsn hsnCode') // ✅ Include HSN fields
      .lean();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalGST = orders.reduce((sum, order) => sum + (order.gstAmount || 0), 0);
    const totalShipping = orders.reduce((sum, order) => sum + (order.shippingCharge || 0), 0);
    const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    const statusBreakdown = orders.reduce((acc, order) => {
      const status = order.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const dailyStats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          totalGST: { $sum: "$gstAmount" },
          totalShipping: { $sum: "$shippingCharge" }
        }
      },
      { $sort: { "_id": -1 } }
    ]);

    const stats = {
      totalOrders,
      totalRevenue,
      totalGST,
      totalShipping,
      averageOrderValue,
      statusBreakdown,
      dailyStats
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({ 
      error: 'Failed to get order statistics',
      details: error.message 
    });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, notes } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const transaction = await RazorpayTransaction.findOne({ orderId });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'captured') {
      return res.status(400).json({ error: 'Payment not captured or already refunded' });
    }

    const refund = await razorpay.payments.refund(transaction.razorpayPaymentId, {
      amount: amount * 100,
      notes
    });

    await RazorpayTransaction.findByIdAndUpdate(transaction._id, {
      status: 'refunded',
      refundId: refund.id,
      refundStatus: refund.status,
      refundAmount: amount,
      metadata: {
        ...transaction.metadata,
        refund: {
          reason: notes,
          processedAt: new Date()
        }
      }
    });

    order.status = 'cancelled';
    order.paymentStatus = 'refunded';
    await order.save();

    res.json({ success: true, refund });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get transaction details
exports.getTransactionDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await RazorpayTransaction.findById(transactionId)
      .populate('orderId')
      .populate('userId', 'name email phone');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all transactions (admin only)
exports.getAllTransactions = async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await RazorpayTransaction.find(query)
      .populate('orderId')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await RazorpayTransaction.countDocuments(query);

    res.json({
      transactions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction statistics (admin only)
exports.getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await RazorpayTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const dailyStats = await RazorpayTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id': -1 } }
    ]);

    res.json({
      statusWiseStats: stats,
      dailyStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 

// Edit order shipping address
exports.editOrderAddress = async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    const orderId = req.params.id;

    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return res.status(400).json({ error: 'Valid shipping address is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this order' });
    }

    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ error: 'Address cannot be edited for this order status' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { shippingAddress },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('items.product', 'name price image hsn hsnCode'); // ✅ Include HSN fields

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Shipping address updated successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get order by ID - Updated with proper authorization
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log('🔍 BACKEND - getOrderById called with:', { orderId, userId: req.user?.userId });

    const order = await Order.findById(orderId)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name price image category description hsn hsnCode gstPercent');

    console.log('🔍 BACKEND - Raw order from DB:', {
      found: !!order,
      orderId: order?._id,
      orderNumber: order?.orderNumber,
      formattedOrderNumber: order?.formattedOrderNumber,
      createdAt: order?.createdAt,
      hasVirtualMethod: typeof order?.invoiceOrderNumber
    });

    if (!order) {
      console.log('❌ BACKEND - Order not found');
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderUserId = order.user._id.toString();
    const requestUserId = req.user.userId.toString();
    
    if (req.user.role !== 'admin' && orderUserId !== requestUserId) {
      console.log('❌ BACKEND - Authorization failed');
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }

    // ✅ Test the virtual field directly on the document
    console.log('🔍 BACKEND - Testing virtual field directly:', {
      virtualInvoiceNumber: order.invoiceOrderNumber,
      virtualDisplayNumber: order.displayOrderNumber
    });

    // ✅ Convert to JSON
    const orderData = order.toJSON();
    
    console.log('🔍 BACKEND - After toJSON():', {
      invoiceOrderNumber: orderData.invoiceOrderNumber,
      displayOrderNumber: orderData.displayOrderNumber,
      orderNumber: orderData.orderNumber,
      formattedOrderNumber: orderData.formattedOrderNumber,
      createdAt: orderData.createdAt,
      allKeys: Object.keys(orderData).filter(key => key.includes('order') || key.includes('invoice') || key.includes('number'))
    });

    // ✅ Manual fallback if virtual still doesn't work
    if (!orderData.invoiceOrderNumber && orderData.orderNumber && orderData.createdAt) {
      const year = new Date(orderData.createdAt).getFullYear();
      const paddedOrderNum = String(orderData.orderNumber).padStart(6, '0');
      orderData.invoiceOrderNumber = `${year}${paddedOrderNum}`;
      console.log('📝 BACKEND - Manually added invoiceOrderNumber:', orderData.invoiceOrderNumber);
    }

    console.log('🔍 BACKEND - Final response data:', {
      hasInvoiceOrderNumber: !!orderData.invoiceOrderNumber,
      invoiceOrderNumber: orderData.invoiceOrderNumber
    });

    res.json({
      success: true,
      order: orderData
    });
  } catch (error) {
    console.error('❌ BACKEND - Error in getOrderById:', error);
    res.status(500).json({ error: error.message });
  }
};

// Download invoice as PDF - Updated to include proper GST + HSN
exports.downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name price image category description gstPercent hsn hsnCode'); // ✅ Include HSN fields

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to download this invoice' });
    }

    let subtotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;

    const items = order.items.map(item => {
      const product = item.product;
      const gstPercent = item.gstRate || product?.gstPercent || 18; // ✅ Use item's GST rate
      const quantity = item.quantity || 0;
      const basePrice = item.basePrice || 0; // ✅ Use stored base price
      const gstAmount = item.gstAmount || 0; // ✅ Use stored GST amount
      const totalAmount = item.price * quantity;
      const hsn = item.hsn || product?.hsn || product?.hsnCode || '1234'; // ✅ Get HSN from item or product

      const totalBase = basePrice * quantity;
      const totalGst = gstAmount * quantity;

      const cgst = totalGst / 2;
      const sgst = totalGst / 2;

      subtotal += totalBase;
      totalCGST += cgst;
      totalSGST += sgst;

      return {
        name: product.name,
        description: product.description,
        quantity,
        unitPrice: basePrice.toFixed(2),
        gstPercent,
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2),
        total: totalAmount.toFixed(2),
        hsn: hsn // ✅ Include HSN in invoice data
      };
    });

    const shipping = order.shippingCharge || 0;
    const grandTotal = (subtotal + totalCGST + totalSGST + shipping).toFixed(2);

    const invoiceData = {
      invoice: {
        number: `INV-${order._id.slice(-8).toUpperCase()}`,
        date: new Date(order.createdAt).toLocaleDateString('en-IN'),
        orderId: order._id,
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'pending',
        paymentMethod: order.paymentMethod || 'N/A'
      },
      company: {
        name: 'BOGAT',
        tagline: 'Premium Quality Products',
        email: 'support@bogat.com',
        website: 'www.bogat.com',
        gstNumber: 'YOUR_GST_NUMBER'
      },
      customer: {
        name: order.user?.name || 'Customer',
        email: order.user?.email || 'N/A',
        phone: order.user?.phone || 'N/A'
      },
      shippingAddress: {
        address: order.shippingAddress?.address || 'N/A',
        city: order.shippingAddress?.city || '',
        state: order.shippingAddress?.state || '',
        pincode: order.shippingAddress?.pincode || 'N/A',
        phone: order.shippingAddress?.phone || 'N/A'
      },
      items,
      totals: {
        subtotal: subtotal.toFixed(2),
        cgst: totalCGST.toFixed(2),
        sgst: totalSGST.toFixed(2),
        totalGST: (totalCGST + totalSGST).toFixed(2),
        shipping: shipping.toFixed(2),
        grandTotal
      },
      gstBreakdown: {
        cgstRate: '50% of item GST',
        sgstRate: '50% of item GST',
        cgstAmount: totalCGST.toFixed(2),
        sgstAmount: totalSGST.toFixed(2),
        totalGST: (totalCGST + totalSGST).toFixed(2)
      },
      razorpayDetails: order.razorpayDetails || null
    };

    res.json({
      success: true,
      invoiceData,
      message: 'Invoice data generated successfully with HSN codes'
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to generate invoice',
      details: error.message 
    });
  }
};

// Update admin note
exports.updateAdminNote = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const orderId = req.params.id;

    console.log('Updating admin note for order:', orderId);
    console.log('Admin note:', adminNote);
    console.log('User role:', req.user.role);

    if (!orderId) {
      return res.status(400).json({ 
        success: false,
        error: 'Order ID is required' 
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required. Only administrators can add/edit admin notes.' 
      });
    }

    if (adminNote && typeof adminNote !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Admin note must be a string' 
      });
    }

    if (adminNote && adminNote.length > 1000) {
      return res.status(400).json({ 
        success: false,
        error: 'Admin note cannot exceed 1000 characters' 
      });
    }

    const existingOrder = await Order.findById(orderId);
    
    if (!existingOrder) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    console.log(`Adding admin note to ${existingOrder.status} order`);

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { 
        adminNote: adminNote ? adminNote.trim() : '',
        adminNoteUpdatedAt: new Date(),
        adminNoteUpdatedBy: req.user.userId
      },
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('user', 'name email phone')
    .populate('items.product', 'name price image hsn hsnCode'); // ✅ Include HSN fields

    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found after update' 
      });
    }

    console.log('Admin note updated successfully for order:', orderId);

    res.json({
      success: true,
      order: updatedOrder,
      message: adminNote ? 'Admin note updated successfully' : 'Admin note cleared successfully'
    });

  } catch (error) {
    console.error('Error updating admin note:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        error: 'Validation error',
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID format' 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Internal server error while updating admin note',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Get admin note history (optional - for audit trail)
exports.getAdminNoteHistory = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required' 
      });
    }

    const order = await Order.findById(orderId)
      .populate('adminNoteUpdatedBy', 'name email')
      .select('adminNote adminNoteUpdatedAt adminNoteUpdatedBy status');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    res.json({
      success: true,
      adminNote: order.adminNote,
      adminNoteUpdatedAt: order.adminNoteUpdatedAt,
      adminNoteUpdatedBy: order.adminNoteUpdatedBy,
      orderStatus: order.status
    });

  } catch (error) {
    console.error('Error fetching admin note history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch admin note history' 
    });
  }
};

exports.findOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    console.log(`🔍 Searching for order by number: ${orderNumber}`);
    
    let order = await Order.findByOrderNumber(orderNumber)
      .populate('user', 'name email phone')
      .populate('items.product', 'name price image hsn hsnCode');

    if (!order) {
      // Try finding by formatted order number as fallback
      order = await Order.findByFormattedOrderNumber(orderNumber)
        .populate('user', 'name email phone')
        .populate('items.product', 'name price image hsn hsnCode');
    }

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found',
        searchedFor: orderNumber
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to view this order' 
      });
    }

    console.log(`✅ Found order:`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      formattedOrderNumber: order.formattedOrderNumber,
      displayOrderNumber: order.displayOrderNumber
    });

    res.json({
      success: true,
      order,
      orderNumbers: {
        orderNumber: order.orderNumber,
        formattedOrderNumber: order.formattedOrderNumber,
        displayOrderNumber: order.displayOrderNumber
      }
    });
  } catch (error) {
    console.error('Error finding order by number:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

exports.getNextOrderNumber = async (req, res) => {
  try {

    const nextNumbers = await Order.getNextOrderNumber();
    
    console.log('📊 Retrieved next order numbers:', nextNumbers);
    
    res.json({
      success: true,
      nextOrderNumber: nextNumbers.orderNumber,
      nextFormattedOrderNumber: nextNumbers.formattedOrderNumber,
      nextDisplayOrderNumber: `ORD-${nextNumbers.formattedOrderNumber}`
    });
  } catch (error) {
    console.error('Error getting next order number:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get next order number',
      details: error.message 
    });
  }
};

exports.getOrderNumberStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required' 
      });
    }

    const stats = await Order.getOrderNumberStats();
    
    console.log('📊 Retrieved order number statistics:', stats);
    
    res.json({
      success: true,
      stats: {
        ...stats,
        nextDisplayOrderNumber: `ORD-${stats.nextFormattedOrderNumber}`
      }
    });
  } catch (error) {
    console.error('Error getting order number stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get order number statistics',
      details: error.message 
    });
  }
};