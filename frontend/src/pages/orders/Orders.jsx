import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../checkout/AuthProvider';
import { toast } from 'react-hot-toast';
import { Package, Clock, MapPin, IndianRupee, Loader, Search, AlertCircle, RefreshCw, Filter, Calendar, CheckCircle, Download, ChevronDown, Gift, Tag } from 'lucide-react';
import api from '../../services/api';
import { resolveImageUrl } from '../../config/config';

// Constants
const STATUS_COLORS = {
    pending: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200',
    processing: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200',
    shipped: 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-200',
    delivered: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200',
    cancelled: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200',
    default: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200'
};

const FALLBACK_IMAGE = '/images/product-placeholder.jpg';

// Helper function to check the image path
const getProductImage = (imagePath) => {
    return resolveImageUrl(imagePath, FALLBACK_IMAGE);
};


const getInvoiceOrderNumber = (orderData) => {
  console.log('🔍 Getting invoice order number for:', {
    invoiceNumber: orderData.invoiceNumber,
    invoiceOrderNumber: orderData.invoiceOrderNumber,
    orderNumber: orderData.orderNumber,
    formattedOrderNumber: orderData.formattedOrderNumber,
    createdAt: orderData.createdAt,
    _id: orderData._id
  });

  // Method 1: Use existing 10-digit invoice number (YYYY000001 format)
  if (orderData.invoiceNumber && orderData.invoiceNumber.length === 10) {
    console.log('✅ Using existing 10-digit invoice number:', orderData.invoiceNumber);
    return orderData.invoiceNumber;
  }

  // Method 2: Try the virtual field (fixed typo: was invoiceOrder, should be invoiceOrderNumber)
  if (orderData.invoiceOrderNumber) {
    console.log('✅ Using virtual invoiceOrderNumber:', orderData.invoiceOrderNumber);
    return orderData.invoiceOrderNumber;
  }
  
  // Method 3: Generate from orderNumber and createdAt (10-digit format)
  if (orderData.orderNumber && orderData.createdAt) {
    const year = new Date(orderData.createdAt).getFullYear();
    const paddedOrderNum = String(orderData.orderNumber).padStart(6, '0');
    const invoiceNumber = `${year}${paddedOrderNum}`;
    console.log('📝 Generated from orderNumber and createdAt:', invoiceNumber);
    return invoiceNumber;
  }
  
  // Method 4: Generate from formattedOrderNumber and createdAt
  if (orderData.formattedOrderNumber && orderData.createdAt) {
    const year = new Date(orderData.createdAt).getFullYear();
    const invoiceNumber = `${year}${orderData.formattedOrderNumber}`;
    console.log('📝 Generated from formattedOrderNumber:', invoiceNumber);
    return invoiceNumber;
  }
  
  // Method 5: Generate from createdAt and _id (fallback)
  if (orderData.createdAt && orderData._id) {
    const year = new Date(orderData.createdAt).getFullYear();
    const idSuffix = orderData._id.toString().slice(-6);
    const invoiceNumber = `${year}${idSuffix}`;
    console.log('📝 Generated from createdAt and _id:', invoiceNumber);
    return invoiceNumber;
  }
  
  // Method 6: Absolute fallback
  const year = new Date().getFullYear();
  const fallback = `${year}000001`;
  console.log('⚠️ Using fallback invoice number:', fallback);
  return fallback;
};


// ✅ FIXED: Function to get individual product GST breakdown with correct field names + HSN
const getIndividualProductGST = (item, orderData) => {
    console.log('🧮 Calculating individual product GST for:', {
        productName: item.product?.name,
        quantity: item.quantity,
        price: item.price,
        basePrice: item.basePrice,
        gstRate: item.gst|| 18, // Default to 18% if not available
        gst: item.gst, // ✅ Primary field name used in database
        gstAmount: item.gstAmount, // ✅ Fallback field name
        totalGstAmount: item.totalGstAmount,
        hsn: item.hsn || item.product?.hsn || item.product?.hsnCode // ✅ HSN code support
    });

    // Method 1: Use stored GST information from order item with correct field names + HSN
    if ((item.basePrice !== undefined || item.gst !== undefined) && (item.gst !== undefined || item.gstAmount !== undefined)) {
        
        // ✅ Get GST amount from either 'gst' field (primary) or 'gstAmount' (fallback)
        const gstAmountPerUnit = parseFloat(item.gst || item.gstAmount) || 0;
        
        // Calculate base price if not stored directly
        let basePrice = parseFloat(item.basePrice) || 0;
        if (basePrice === 0 && item.price && gstAmountPerUnit > 0) {
            // Reverse calculate base price from total price and GST amount
            basePrice = item.price - gstAmountPerUnit;
        }
        
        // ✅ Calculate GST rate using the formula: (gstAmt/basePrice)*100
        let gstRate = 0;
        if (basePrice > 0 && gstAmountPerUnit > 0) {
            gstRate = (gstAmountPerUnit / basePrice) * 100;
        } else {
            // Fallback to stored rate if calculation not possible
            gstRate = parseFloat(item.gstRate) || 18;
        }
        
        // ✅ Get HSN code
        const hsn = item.hsn || item.product?.hsn || item.product?.hsnCode || '1234';
        
        // Calculate totals
        const totalGstAmount = gstAmountPerUnit * item.quantity;
        const cgstAmount = totalGstAmount / 2;
        const sgstAmount = totalGstAmount / 2;
        
        console.log('✅ Using stored GST data with calculated GST% + HSN:', {
            basePrice,
            gstAmountPerUnit,
            calculatedGstRate: gstRate,
            totalGstAmount,
            cgstAmount,
            sgstAmount,
            hsn,
            fieldUsed: item.gst !== undefined ? 'gst' : 'gstAmount',
            calculation: `(${gstAmountPerUnit}/${basePrice})*100 = ${gstRate.toFixed(2)}%`,
            rawValues: {
                itemGst: item.gst,
                itemGstAmount: item.gstAmount,
                itemPrice: item.price,
                itemBasePrice: item.basePrice,
                itemHsn: item.hsn
            }
        });
        
        return {
            basePrice: basePrice.toFixed(2),
            gstRate: gstRate.toFixed(1), // ✅ Use calculated GST rate using (gstAmt/basePrice)*100
            gstAmountPerUnit: gstAmountPerUnit.toFixed(2),
            totalGstAmount: totalGstAmount.toFixed(2),
            cgstAmount: cgstAmount.toFixed(2),
            sgstAmount: sgstAmount.toFixed(2),
            totalAmount: (item.price * item.quantity).toFixed(2),
            hsn: hsn // ✅ Include HSN code
        };
    }

    // Method 2: Calculate from price (assuming price includes GST) - Fallback
    const totalItemAmount = (item.price || 0) * (item.quantity || 0);
    const productGstRate = item.gst || item.product?.gstRate || item.product?.gst || 18;
    const hsn = item.hsn || item.product?.hsn || item.product?.hsnCode || '1234';
    
    // Calculate base price and GST from total amount (reverse calculation)
    const basePrice = totalItemAmount / (1 + productGstRate / 100);
    const totalGstAmount = totalItemAmount - basePrice;
    const gstAmountPerUnit = totalGstAmount / (item.quantity || 1);
    const cgstAmount = totalGstAmount / 2;
    const sgstAmount = totalGstAmount / 2;
    
    // ✅ Calculate GST rate using the formula (gstAmt/basePrice)*100 for fallback method too
    const basePricePerUnit = basePrice / (item.quantity || 1);
    let calculatedGstRate = productGstRate; // Default fallback
    if (basePricePerUnit > 0 && gstAmountPerUnit > 0) {
        calculatedGstRate = (gstAmountPerUnit / basePricePerUnit) * 100;
    }
    
    console.log('⚠️ Calculated GST from price (fallback method) with formula-based GST% + HSN:', {
        totalItemAmount,
        productGstRate,
        basePrice,
        basePricePerUnit,
        gstAmountPerUnit,
        totalGstAmount,
        cgstAmount,
        sgstAmount,
        calculatedGstRate,
        calculation: `(${gstAmountPerUnit}/${basePricePerUnit.toFixed(2)})*100 = ${calculatedGstRate.toFixed(2)}%`,
        hsn
    });
    
    return {
        basePrice: basePrice.toFixed(2),
        gstRate: calculatedGstRate.toFixed(1), // ✅ Use calculated GST rate using (gstAmt/basePrice)*100
        gstAmountPerUnit: gstAmountPerUnit.toFixed(2),
        totalGstAmount: totalGstAmount.toFixed(2),
        cgstAmount: cgstAmount.toFixed(2),
        sgstAmount: sgstAmount.toFixed(2),
        totalAmount: totalItemAmount.toFixed(2),
        hsn: hsn // ✅ Include HSN code
    };
};

// Helper function to calculate GST breakdown from order data with corrected individual GST rates
const calculateGSTBreakdown = (orderData, subtotalAfterDiscount) => {
    console.log('🧮 Calculating GST breakdown with formula-based GST%:', { 
        orderData: {
            gstAmount: orderData?.gstAmount,
            discountedSubtotal: orderData?.discountedSubtotal,
            subtotal: orderData?.subtotal,
            discount: orderData?.discount
        }, 
        subtotalAfterDiscount 
    });
    
    // First, try to calculate from individual items using the corrected function
    if (orderData?.items && Array.isArray(orderData.items)) {
        let totalCGST = 0;
        let totalSGST = 0;
        let totalGST = 0;
        let weightedGSTRate = 0;
        let totalBaseAmount = 0;
        
        orderData.items.forEach(item => {
            const itemGstData = getIndividualProductGST(item, orderData);
            const itemCGST = parseFloat(itemGstData.cgstAmount) || 0;
            const itemSGST = parseFloat(itemGstData.sgstAmount) || 0;
            const itemGST = parseFloat(itemGstData.totalGstAmount) || 0;
            const itemBasePrice = parseFloat(itemGstData.basePrice) || 0;
            const gstRate = parseFloat(itemGstData.gstRate) || 0;
            
            totalCGST += itemCGST;
            totalSGST += itemSGST;
            totalGST += itemGST;
            totalBaseAmount += itemBasePrice * (item.quantity || 1);
            
            // Calculate weighted average GST rate
            weightedGSTRate += gstRate * (itemBasePrice * (item.quantity || 1));
        });
        
        // Calculate final weighted GST rate
        const finalGSTRate = totalBaseAmount > 0 ? weightedGSTRate / totalBaseAmount : 0;
        
        console.log('✅ Calculated from individual items with formula-based GST% + HSN:', { 
            totalCGST, 
            totalSGST, 
            totalGST, 
            finalGSTRate: finalGSTRate.toFixed(2) + '%',
            totalBaseAmount
        });
        
        return {
            cgst: Math.round(totalCGST * 100) / 100,
            sgst: Math.round(totalSGST * 100) / 100,
            totalGST: Math.round(totalGST * 100) / 100,
            cgstRate: finalGSTRate / 2,
            sgstRate: finalGSTRate / 2,
            totalRate: finalGSTRate
        };
    }
    
    // Second, try to get from order's total GST amount
    if (orderData?.gstAmount && orderData.gstAmount > 0) {
        const totalGST = orderData.gstAmount;
        const cgst = totalGST / 2;
        const sgst = totalGST / 2;
        
        const taxableAmount = orderData?.discountedSubtotal || subtotalAfterDiscount;
        console.log('🧮 GST Calculation Base:', { taxableAmount, totalGST });
        
        const effectiveRate = taxableAmount > 0 ? (totalGST / taxableAmount) * 100 : 0;
        
        console.log('✅ Using total GST amount:', { 
            totalGST, 
            cgst, 
            sgst, 
            effectiveRate: effectiveRate.toFixed(1),
            taxableAmount 
        });
        
        return {
            cgst: Math.round(cgst * 100) / 100,
            sgst: Math.round(sgst * 100) / 100,
            totalGST: Math.round(totalGST * 100) / 100,
            cgstRate: Math.round((effectiveRate / 2) * 10) / 10,
            sgstRate: Math.round((effectiveRate / 2) * 10) / 10,
            totalRate: Math.round(effectiveRate * 10) / 10
        };
    }
    
    // Fallback: No GST data found
    console.log('❌ No GST data found, using zero values');
    return {
        cgst: 0,
        sgst: 0,
        totalGST: 0,
        cgstRate: 0,
        sgstRate: 0,
        totalRate: 0
    };
};




const Orders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [refreshKey, setRefreshKey] = useState(0);
    const [ordersLoaded, setOrdersLoaded] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState(null);

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await api.get('/orders/my-orders', {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                params: {
                    _t: new Date().getTime()
                }
            });
            
            console.log('Orders response:', response.data);
            
            const ordersData = Array.isArray(response.data) ? response.data :
                             Array.isArray(response.data?.orders) ? response.data.orders :
                             response.data?.data?.orders || [];
            
            if (!Array.isArray(ordersData)) {
                throw new Error('Invalid orders data format received');
            }
            
            setOrders(ordersData);
            setTimeout(() => setOrdersLoaded(true), 100);
        } catch (err) {
            console.error('Error loading orders:', err);
            setError(err.response?.data?.error || err.message || 'Failed to load orders');
            toast.error('Failed to load orders. Please try again.');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders, refreshKey]);

    const getStatusColor = useCallback((status) => {
        if (!status) return STATUS_COLORS.default;
        return STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.default;
    }, []);

    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'Date not available';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error('Invalid date');
            
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    }, []);

    const formatAddress = useCallback((address) => {
        if (!address) return 'Address not available';
        
        const parts = [
            address.address,
            address.city,
            address.state,
            address.pincode && `PIN: ${address.pincode}`,
            address.phone && `Phone: ${address.phone}`
        ].filter(Boolean);
        
        return parts.join(', ') || 'Address details not available';
    }, []);

    const generateInvoicePDF = async (orderId) => {
        try {
            setDownloadingInvoice(orderId);
            toast.loading('Generating invoice...', { id: 'pdf-loading' });
            
            const response = await api.get(`/orders/${orderId}`);
            const orderData = response.data.order;

            let nextFormattedOrderNumber = '';
try {
  const numberResp = await api.get('/orders/next-order-number');
  const formatted = numberResp.data.nextFormattedOrderNumber || '';
  
  const currentYear = new Date().getFullYear();
  nextFormattedOrderNumber = `${currentYear}${formatted}`; // → e.g., "2025000124"
  
} catch (err) {
  console.error('Error fetching formatted order number:', err);
  nextFormattedOrderNumber = '';
}


            

            const itemsSubtotal = (orderData.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const couponDiscount = orderData.discount || 0;
            const couponCode = orderData.couponCode || null;
            const couponDetails = orderData.couponDetails || null;
            const subtotalAfterDiscount = itemsSubtotal - couponDiscount;
            const gstAmount = orderData.gstAmount || 0;
            const gstBreakdown = calculateGSTBreakdown(orderData, subtotalAfterDiscount);
            const shipping = orderData.shippingCharge || (subtotalAfterDiscount >= 500 ? 0 : 50);
            
            console.log('🧾 Invoice GST Details with individual product GST + HSN:', {
                originalGSTAmount: gstAmount,
                calculatedBreakdown: gstBreakdown,
                subtotalAfterDiscount,
                individualItemsGST: orderData.items?.map(item => ({
                    name: item.product?.name,
                    gst: item.gst,
                    hsn: item.hsn || item.product?.hsn || item.product?.hsnCode,
                    gstData: getIndividualProductGST(item, orderData)
                }))
            });

            // ✅ Enhanced invoice with individual product GST from database + HSN codes
            const invoiceContent = `
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Invoice - ${orderData._id}</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body {
                            font-family: 'Arial', sans-serif;
                            line-height: 1.4;
                            color: #333;
                            background: white;
                            font-size: 12px;
                        }
                        
                        .invoice-container {
                            max-width: 210mm;
                            min-height: 297mm;
                            margin: 0 auto;
                            padding: 15mm;
                            background: white;
                            display: flex;
                            flex-direction: column;
                        }
                        
                        .invoice-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            margin-bottom: 20px;
                            padding-bottom: 15px;
                            border-bottom: 2px solid #f59e0b;
                        }
                        
                        .company-section {
                            display: flex;
                            align-items: center;
                            flex: 1;
                        }
                        
                        .company-logo {
                            width: 60px;
                            height: 60px;
                            background: linear-gradient(135deg, #f59e0b, #f97316);
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 15px;
                            flex-shrink: 0;
                        }
                        
                        .company-logo-text {
                            color: white;
                            font-size: 20px;
                            font-weight: bold;
                            text-align: center;
                            line-height: 1;
                        }
                        
                       .company-logo-img {
                          width: 60px;
                          height: 60px;
                          object-fit: cover;
                          border-radius: 8px;
                        }

                        .company-info h1 {
                            color: #f59e0b;
                            font-size: 24px;
                            font-weight: bold;
                            margin-bottom: 3px;
                        }
                        
                        .company-info p {
                            color: #666;
                            font-size: 11px;
                            margin: 1px 0;
                        }
                        
                        .company-info .gst-number {
                            color: #333;
                            font-size: 10px;
                            font-weight: bold;
                            margin-top: 5px;
                        }
                        
                        .invoice-details {
                            text-align: right;
                            min-width: 200px;
                        }
                        
                        .invoice-details h2 {
                            color: #f59e0b;
                            font-size: 20px;
                            margin-bottom: 8px;
                        }
                        
                        .invoice-details p {
                            margin: 3px 0;
                            font-size: 11px;
                        }
                        
                        .invoice-info {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 20px;
                            margin-bottom: 20px;
                        }
                        
                        .section-title {
                            color: #f59e0b;
                            font-size: 13px;
                            font-weight: bold;
                            margin-bottom: 8px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        .info-block {
                            background: #fef3c7;
                            padding: 12px;
                            border-radius: 6px;
                            border-left: 3px solid #f59e0b;
                            font-size: 11px;
                        }
                        
                        .info-block p {
                            margin: 3px 0;
                        }
                        
                        .status-section {
                            margin-bottom: 15px;
                            display: flex;
                            align-items: center;
                            gap: 15px;
                        }
                        
                        .status-badge {
                            display: inline-block;
                            padding: 4px 10px;
                            border-radius: 15px;
                            font-size: 10px;
                            font-weight: bold;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        .status-pending { background: #fef3c7; color: #f59e0b; }
                        .status-processing { background: #dbeafe; color: #3b82f6; }
                        .status-shipped { background: #e0e7ff; color: #7c3aed; }
                        .status-delivered { background: #d1fae5; color: #10b981; }
                        .status-cancelled { background: #fee2e2; color: #ef4444; }
                        
                        .coupon-section {
                            background: linear-gradient(135deg, #ecfdf5, #d1fae5);
                            border: 2px dashed #10b981;
                            border-radius: 8px;
                            padding: 12px;
                            margin-bottom: 15px;
                            position: relative;
                        }
                        
                        .coupon-header {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            margin-bottom: 6px;
                        }
                        
                        .coupon-icon {
                            width: 16px;
                            height: 16px;
                            background: #10b981;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 10px;
                            font-weight: bold;
                        }
                        
                        .coupon-title {
                            color: #065f46;
                            font-weight: bold;
                            font-size: 12px;
                        }
                        
                        .coupon-details {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 8px;
                            font-size: 10px;
                            color: #047857;
                        }
                        
                        /* ✅ Enhanced Items Table with proper individual GST display + HSN */
                        .items-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 15px;
                            font-size: 10px;
                            table-layout: fixed;
                        }
                        
                        .items-table th {
                            background: #f59e0b;
                            color: white;
                            padding: 10px 8px;
                            text-align: center;
                            font-weight: bold;
                            font-size: 9px;
                            text-transform: uppercase;
                            border: 1px solid #f59e0b;
                            white-space: nowrap;
                        }
                        
                        .items-table th:nth-child(1) { width: 25%; } /* Item */
                        .items-table th:nth-child(2) { width: 10%; } /* HSN */
                        .items-table th:nth-child(3) { width: 8%; }  /* Qty */
                        .items-table th:nth-child(4) { width: 12%; } /* Base Rate */
                        .items-table th:nth-child(5) { width: 8%; }  /* GST% */
                        .items-table th:nth-child(6) { width: 12%; } /* GST Amt */
                        .items-table th:nth-child(7) { width: 12%; } /* CGST */
                        .items-table th:nth-child(8) { width: 12%; } /* SGST */
                        .items-table th:nth-child(9) { width: 12%; } /* Total */
                        
                        .items-table td {
                            padding: 8px 6px;
                            border: 1px solid #e5e7eb;
                            font-size: 9px;
                            text-align: center;
                            vertical-align: middle;
                        }
                        
                        .items-table td:first-child {
                            text-align: left;
                            padding-left: 8px;
                        }
                        
                        .items-table td.amount {
                            text-align: right;
                            font-weight: bold;
                            color: #f59e0b;
                        }
                        
                        .items-table tbody tr:nth-child(even) {
                            background: #fef3c7;
                        }
                        
                        .items-table tbody tr:hover {
                            background: #fde68a;
                        }
                        
                        .product-name {
                            font-weight: bold;
                            color: #333;
                            line-height: 1.2;
                        }
                        
                        .product-desc {
                            font-size: 8px;
                            color: #666;
                            margin-top: 2px;
                            line-height: 1.1;
                        }
                        
                        .hsn-code {
                            font-weight: bold;
                            color: #f59e0b;
                            background: #fef3c7;
                            padding: 2px 4px;
                            border-radius: 4px;
                            font-size: 8px;
                        }
                        
                        .totals-section {
                            margin-top: auto;
                            padding-top: 15px;
                        }
                        
                        .totals-grid {
                            display: grid;
                            grid-template-columns: 2fr 1fr;
                            gap: 15px;
                            align-items: start;
                        }
                        
                        .gst-breakdown {
                            background: #fef3c7;
                            padding: 12px;
                            border-radius: 6px;
                            border: 1px solid #f59e0b;
                        }
                        
                        .gst-title {
                            color: #f59e0b;
                            font-size: 12px;
                            font-weight: bold;
                            margin-bottom: 8px;
                            text-align: center;
                        }
                        
                        .gst-row {
                            display: flex;
                            justify-content: space-between;
                            margin: 4px 0;
                            font-size: 10px;
                        }
                        
                        .gst-total {
                            font-weight: bold;
                            color: #f59e0b;
                            border-top: 1px solid #f59e0b;
                            padding-top: 6px;
                            margin-top: 6px;
                        }
                        
                        .total-calculation {
                            background: #f8f9fa;
                            padding: 12px;
                            border-radius: 6px;
                            border: 2px solid #f59e0b;
                        }
                        
                        .total-row {
                            display: flex;
                            justify-content: space-between;
                            margin: 4px 0;
                            font-size: 11px;
                        }
                        
                        .total-row.discount {
                            color: #10b981;
                            font-weight: bold;
                        }
                        
                        .total-row.grand-total {
                            font-size: 14px;
                            font-weight: bold;
                            color: #f59e0b;
                            padding-top: 8px;
                            border-top: 2px solid #f59e0b;
                            margin-top: 8px;
                        }
                        
                        .amount-words {
                            background: #f8f9fa;
                            padding: 10px;
                            border-radius: 6px;
                            margin: 10px 0;
                            font-size: 10px;
                            font-weight: bold;
                        }
                        
                        .payment-info {
                            background: #f0f9ff;
                            padding: 10px;
                            border-radius: 6px;
                            border-left: 3px solid #3b82f6;
                            margin: 10px 0;
                            font-size: 10px;
                        }
                        
                        .payment-info h3 {
                            color: #3b82f6;
                            margin-bottom: 6px;
                            font-size: 11px;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 15px;
                            padding-top: 10px;
                            border-top: 1px solid #e5e7eb;
                            color: #666;
                            font-size: 9px;
                        }
                        
                        .thank-you {
                            background: linear-gradient(135deg, #f59e0b, #f97316);
                            color: white;
                            padding: 12px;
                            border-radius: 6px;
                            text-align: center;
                            margin: 10px 0;
                        }
                        
                        .thank-you h3 {
                            font-size: 13px;
                            margin-bottom: 4px;
                        }
                        
                        .thank-you p {
                            font-size: 10px;
                        }
                        
                        @media print {
                            body { margin: 0; padding: 0; }
                            .invoice-container { 
                                margin: 0; 
                                padding: 15mm;
                                min-height: 297mm;
                            }
                        }
                        
                        @page {
                            size: A4;
                            margin: 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="invoice-container">
                        <!-- Header -->
                        <div class="invoice-header">
                            <div class="company-section">
                                <div class="company-logo">
                                    <img src="/favicon.png" alt="Logo" class="company-logo-img" />
                                </div>
                                <div class="company-info">
                                    <h1>SRI BOGAT</h1>
                                    <p>Premium Quality Products</p>
                                    <p>Email: support@bogat.com</p>
                                    <p>Website: www.bogat.com</p>
                                    <p class="gst-number">GSTIN: 29LWVPS2833P1Z0</p>
                                </div>
                            </div>
                            <div class="invoice-details">
                                <h2>TAX INVOICE</h2>
                                <p><strong>Invoice #:</strong>${nextFormattedOrderNumber}</p>
                                <p><strong>Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString('en-IN')}</p>
                                <p><strong>Order ID:</strong> ${orderData._id}</p>
                            </div>
                        </div>

                        <!-- Invoice Information -->
                        <div class="invoice-info">
                            <div>
                                <h3 class="section-title">Bill To</h3>
                                <div class="info-block">
                                    <p><strong>${orderData.user?.name || 'Customer Name'}</strong></p>
                                    <p>Email: ${orderData.user?.email || 'N/A'}</p>
                                    <p>Phone: ${orderData.user?.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div>
                                <h3 class="section-title">Ship To</h3>
                                <div class="info-block">
                                    <p>${orderData.shippingAddress?.address || 'N/A'}</p>
                                    <p>${orderData.shippingAddress?.city || ''}, ${orderData.shippingAddress?.state || ''}</p>
                                    <p>PIN: ${orderData.shippingAddress?.pincode || 'N/A'}</p>
                                    <p>Phone: ${orderData.shippingAddress?.phone || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Order Status -->
                        <div class="status-section">
                            <span class="status-badge status-${orderData.status || 'pending'}">${orderData.status || 'Pending'}</span>
                            <span style="color: #666; font-size: 10px;">Payment: ${orderData.paymentStatus || 'Pending'}</span>
                            <span style="color: #666; font-size: 10px;">Method: ${orderData.paymentMethod || 'Online'}</span>
                        </div>

                        ${couponCode ? `
                        <!-- Coupon Section -->
                        <div class="coupon-section">
                            <div class="coupon-header">
                                <div class="coupon-icon">🎁</div>
                                <div class="coupon-title">Coupon Applied Successfully!</div>
                            </div>
                            <div class="coupon-details">
                                <div>
                                    <strong>Coupon Code:</strong> ${couponCode}
                                </div>
                                <div>
                                    <strong>Discount Amount:</strong> ₹${couponDiscount.toFixed(2)}
                                </div>
                                ${couponDetails?.title ? `
                                <div style="grid-column: 1 / -1;">
                                    <strong>Offer:</strong> ${couponDetails.title}
                                </div>
                                ` : ''}
                                ${couponDetails?.description ? `
                                <div style="grid-column: 1 / -1;">
                                    <strong>Description:</strong> ${couponDetails.description}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}

                        <!-- ✅ FIXED: Items Table with Individual GST Display + HSN Codes -->
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Item Description</th>
                                    <th>HSN Code</th>
                                    <th>Qty</th>
                                    <th>Base Rate</th>
                                     <th>GST%</th>
                                    <th>GST Amt</th>
                                    <th>CGST</th>
                                    <th>SGST</th>
                                    <th>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderData.items?.map(item => {
                                    const gstData = getIndividualProductGST(item, orderData);
                                    return `
                                    <tr>
                                        <td>
                                            <div class="product-name">${item.product?.name || 'Product Name'}</div>
                                            ${item.product?.description ? `<div class="product-desc">${item.product.description.substring(0, 60)}${item.product.description.length > 60 ? '...' : ''}</div>` : ''}
                                        </td>
                                        <td><span class="hsn-code">${gstData.hsn}</span></td>
                                        <td><strong>${item.quantity || 0}</strong></td>
                                        <td class="amount">₹${gstData.basePrice}</td>
                                        <td><strong>${gstData.gstRate}%</strong></td>
                                        <td class="amount">₹${gstData.totalGstAmount}</td>
                                        <td class="amount">₹${gstData.cgstAmount}</td>
                                        <td class="amount">₹${gstData.sgstAmount}</td>
                                        <td class="amount"><strong>₹${gstData.totalAmount}</strong></td>
                                    </tr>
                                `;}).join('') || '<tr><td colspan="9" style="text-align: center; color: #666;">No items found</td></tr>'}
                            </tbody>
                        </table>

                        <!-- Totals Section -->
                        <div class="totals-section">
                            <div class="totals-grid">
                                <!-- GST Breakdown -->
                                <div class="gst-breakdown">
                                    <div class="gst-title">GST Summary</div>
                                    <div class="gst-row">
                                        <span>Taxable Amount:</span>
                                        <span>₹${subtotalAfterDiscount.toFixed(2)}</span>
                                    </div>
                                    <div class="gst-row">
                                        <span>CGST:</span>
                                        <span>₹${gstBreakdown.cgst.toFixed(2)}</span>
                                    </div>
                                    <div class="gst-row">
                                        <span>SGST:</span>
                                        <span>₹${gstBreakdown.sgst.toFixed(2)}</span>
                                    </div>
                                    <div class="gst-row gst-total">
                                        <span>Total GST:</span>
                                        <span>₹${gstBreakdown.totalGST.toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                <!-- Total Calculation -->
                                <div class="total-calculation">
                                    <div class="total-row">
                                        <span>Subtotal (Including GST):</span>
                                        <span>₹${itemsSubtotal.toFixed(2)}</span>
                                    </div>
                                    ${couponDiscount > 0 ? `
                                    <div class="total-row discount">
                                        <span>Coupon Discount (${couponCode}):</span>
                                        <span>-₹${couponDiscount.toFixed(2)}</span>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="total-row">
                                        <span>Shipping:</span>
                                        <span>${shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span>
                                    </div>
                                    <div class="total-row grand-total">
                                        <span>GRAND TOTAL:</span>
                                        <span>₹${(orderData.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Amount in Words -->
                        <div class="amount-words">
                            <strong>Amount in Words:</strong> ${convertToWords(orderData.totalAmount || 0)} Rupees Only
                        </div>

                        <!-- Payment Information -->
                        <div class="payment-info">
                            <h3>Payment Information</h3>
                            <p><strong>Payment Method:</strong> ${orderData.paymentMethod || 'Online Payment'}</p>
                            <p><strong>Payment Status:</strong> ${orderData.paymentStatus || 'Completed'}</p>
                            ${orderData.razorpayDetails?.paymentId ? `<p><strong>Transaction ID:</strong> ${orderData.razorpayDetails.paymentId}</p>` : ''}
                        </div>
                        
                        <!-- Thank You -->
                        <div class="thank-you">
                            <h3>Thank You for Your Order!</h3>
                            <p>We appreciate your business and hope you enjoy your purchase.</p>
                        </div>

                        <!-- Footer -->
                        <div class="footer">
                            <p>This is a computer-generated invoice. No signature required.</p>
                            <p>For any queries, please contact us at support@bogat.com</p>
                            <p><strong>HSN Codes:</strong> As per Central Board of Indirect Taxes and Customs (CBIC)</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Create and download PDF
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(invoiceContent);
                printWindow.document.close();
                
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                    }, 500);
                };
            } else {
                throw new Error('Unable to open print window. Please allow popups.');
            }
            
            toast.success('Invoice generated successfully with HSN codes!', { id: 'pdf-loading' });
            
        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error('Failed to generate invoice. Please try again.', { id: 'pdf-loading' });
        } finally {
            setDownloadingInvoice(null);
        }
    };

    // Helper function to convert number to words (basic implementation)
    const convertToWords = (amount) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (amount === 0) return 'Zero';
        if (amount < 10) return ones[amount];
        if (amount < 20) return teens[amount - 10];
        if (amount < 100) return tens[Math.floor(amount / 10)] + (amount % 10 !== 0 ? ' ' + ones[amount % 10] : '');
        if (amount < 1000) return ones[Math.floor(amount / 100)] + ' Hundred' + (amount % 100 !== 0 ? ' ' + convertToWords(amount % 100) : '');
        if (amount < 100000) return convertToWords(Math.floor(amount / 1000)) + ' Thousand' + (amount % 1000 !== 0 ? ' ' + convertToWords(amount % 1000) : '');
        
        return 'Amount too large';
    };

    const filteredOrders = useMemo(() => {
        if (!Array.isArray(orders)) return [];
        
        return orders.filter(order => {
            if (!order) return false;

            const searchString = searchQuery.toLowerCase();
            const matchesSearch = 
                (order._id || '').toLowerCase().includes(searchString) ||
                (order.items || []).some(item => 
                    item?.product?.name?.toLowerCase().includes(searchString)
                );

            if (filter === 'all') return matchesSearch;
            return matchesSearch && (order.status || '').toLowerCase() === filter;
        });
    }, [orders, searchQuery, filter]);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        setOrdersLoaded(false);
        toast.success('Refreshing orders...');
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = FALLBACK_IMAGE;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
                <div className="container mx-auto px-4 py-8 pt-32">
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-amber-200 p-12 text-center">
                            <div className="relative">
                                <Loader className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-6" />
                                <div className="absolute inset-0 w-12 h-12 border-4 border-amber-200 rounded-full animate-pulse mx-auto"></div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Orders</h3>
                            <p className="text-gray-600">Please wait while we fetch your orders...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
                <div className="container mx-auto px-4 py-8 pt-32">
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-gradient-to-r from-red-50 to-rose-50 backdrop-blur-sm rounded-3xl shadow-xl border border-red-200 p-8">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="p-3 bg-red-100 rounded-full">
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-red-800">Error Loading Orders</h2>
                                    <p className="text-red-600 mt-1">{error}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleRefresh}
                                className="group bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all duration-300 transform hover:scale-105 flex items-center"
                            >
                                <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
            <div className="container mx-auto px-4 py-8 pt-32">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-amber-200 p-8 hover:shadow-2xl transition-all duration-500">
                        {/* Header Section */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
                            <div className="text-center lg:text-left">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-2">
                                    My Orders
                                </h1>
                                <p className="text-gray-600 text-lg">View and track your orders</p>
                                <div className="w-24 h-1 bg-gradient-to-r from-amber-600 to-orange-700 rounded-full mt-2 mx-auto lg:mx-0"></div>
                            </div>
                            
                            {/* Controls */}
                            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Search orders..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-12 pr-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:border-amber-300"
                                    />
                                    <Search className="w-5 h-5 text-amber-400 absolute left-4 top-4 group-focus-within:text-amber-600 transition-colors" />
                                </div>
                                
                                <div className="relative group">
                                    <select
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="appearance-none pl-10 pr-10 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:border-amber-300 cursor-pointer"
                                    >
                                        <option value="all">All Orders</option>
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                    <Filter className="w-5 h-5 text-amber-400 absolute left-3 top-4 pointer-events-none group-focus-within:text-amber-600 transition-colors" />
                                    <ChevronDown className="w-5 h-5 text-amber-400 absolute right-3 top-4 pointer-events-none group-focus-within:text-amber-600 transition-colors" />
                                </div>
                                
                                <button
                                    onClick={handleRefresh}
                                    className="group p-3 text-amber-600 hover:text-white hover:bg-gradient-to-r hover:from-amber-600 hover:to-orange-700 transition-all duration-300 rounded-xl border-2 border-amber-200 hover:border-amber-600 transform hover:scale-105"
                                    title="Refresh orders"
                                >
                                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                            </div>
                        </div>

                        {filteredOrders.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-12 border border-amber-200 max-w-md mx-auto">
                                    <div className="text-amber-300 mb-6">
                                        <Package className="w-20 h-20 mx-auto animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-3">No orders found</h3>
                                    <p className="text-gray-600 text-lg">
                                        {searchQuery || filter !== 'all'
                                            ? 'Try adjusting your search or filter'
                                            : 'You haven\'t placed any orders yet'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {filteredOrders.map((order, index) => (
                                    <div 
                                        key={order._id} 
                                        className={`group bg-gradient-to-r from-white to-amber-50/30 border-2 border-amber-200 rounded-2xl p-6 hover:border-amber-300 hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] ${ordersLoaded ? 'animate-fade-in-up' : 'opacity-0'}`}
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        {/* Order Header */}
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl">
                                                        <Package className="w-6 h-6 text-amber-600" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-amber-700 transition-colors">
                                                        Order #{order._id.slice(-8).toUpperCase()}
                                                    </h3>
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <div className="flex items-center text-gray-600 bg-white/60 px-3 py-2 rounded-lg">
                                                        <Calendar className="w-4 h-4 mr-2" />
                                                        <span className="text-sm font-medium">{formatDate(order.createdAt)}</span>
                                                    </div>
                                                    <span className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${getStatusColor(order.status)} transform hover:scale-105 transition-all duration-200`}>
                                                        <CheckCircle className="w-4 h-4 inline mr-2" />
                                                        {order.status || 'Processing'}
                                                    </span>
                                                   
                                                    {/* Coupon Badge */}
                                                    {order.couponCode && (
                                                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-2 rounded-lg border border-green-200 flex items-center">
                                                            <Gift className="w-4 h-4 mr-1" />
                                                            <span className="text-xs font-medium">{order.couponCode} (-₹{order.discount?.toFixed(2) || '0.00'})</span>
                                                        </div>
                                                    )}
                                                   
                                                    
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 lg:mt-0 text-center lg:text-right">
                                                <div className="bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                                                    <div className="flex items-center justify-center lg:justify-end text-2xl font-bold">
                                                        <IndianRupee className="w-6 h-6 mr-1 text-amber-600" />
                                                        {order.totalAmount?.toFixed(2) || '0.00'}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1 bg-amber-50 px-3 py-1 rounded-full inline-block">
                                                    {(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'items'}
                                                </div>
                                                <button
                                                    onClick={() => generateInvoicePDF(order._id)}
                                                    disabled={downloadingInvoice === order._id}
                                                    className="group mt-3 bg-gradient-to-r from-amber-600 to-orange-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-amber-700 hover:to-orange-800 transition-all duration-300 transform hover:scale-105 flex items-center justify-center lg:justify-end shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {downloadingInvoice === order._id ? (
                                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Download className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                                                    )}
                                                    {downloadingInvoice === order._id ? 'Generating...' : 'Download Invoice'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Order Details */}
                                        <div className="border-t-2 border-amber-200 pt-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                {/* Items Section */}
                                                <div className="space-y-4">
                                                    <h4 className="text-lg font-bold text-gray-800 flex items-center">
                                                        <Package className="w-5 h-5 text-amber-600 mr-2" />
                                                        Order Items
                                                    </h4>
                                                    <div className="space-y-4">
                                                        {(order.items || []).map((item, itemIndex) => {
                                                            const gstData = getIndividualProductGST(item, order);
                                                            const hsn = item.hsn || item.product?.hsn || item.product?.hsnCode || '1234';
                                                            return (
                                                                <div key={`${order._id}-item-${itemIndex}`} className="group flex items-center space-x-4 bg-white/60 p-4 rounded-xl hover:bg-white transition-all duration-300 hover:shadow-md">
                                                                    <div className="relative w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl overflow-hidden">
                                                                        <img
                                                                            src={getProductImage(item?.product?.image)}
                                                                            alt={item?.product?.name || 'Product'}
                                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                                            onError={handleImageError}
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="font-bold text-gray-800 group-hover:text-amber-700 transition-colors">
                                                                            {item?.product?.name || 'Product Name Not Available'}
                                                                        </div>
                                                                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                                                                                    {item?.quantity || 0} × ₹{gstData.basePrice}
                                                                                </span>
                                                                               
                                                                            </div>
                                                                            
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Address & Price Breakdown Section */}
                                                <div className="space-y-4">
                                                    <h4 className="text-lg font-bold text-gray-800 flex items-center">
                                                        <MapPin className="w-5 h-5 text-amber-600 mr-2" />
                                                        Delivery Address
                                                    </h4>
                                                    <div className="bg-white/60 p-4 rounded-xl">
                                                        <div className="flex items-start space-x-3">
                                                            <div className="p-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg flex-shrink-0 mt-1">
                                                                <MapPin className="w-4 h-4 text-amber-600" />
                                                            </div>
                                                            <div className="text-gray-700 leading-relaxed">
                                                                {formatAddress(order.shippingAddress)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Coupon Details Section */}
                                                    {order.couponCode && (
                                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                                                            <h5 className="font-bold text-green-800 mb-3 flex items-center">
                                                                <Gift className="w-4 h-4 text-green-600 mr-2" />
                                                                Coupon Applied
                                                            </h5>
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex justify-between text-green-700">
                                                                    <span className="flex items-center">
                                                                        <Tag className="w-3 h-3 mr-1" />
                                                                        Coupon Code:
                                                                    </span>
                                                                    <span className="font-bold">{order.couponCode}</span>
                                                                </div>
                                                                <div className="flex justify-between text-green-700">
                                                                    <span>Discount Amount:</span>
                                                                    <span className="font-bold">-₹{order.discount?.toFixed(2) || '0.00'}</span>
                                                                </div>
                                                                {order.couponDetails?.title && (
                                                                    <div className="text-green-600 text-xs italic">
                                                                        {order.couponDetails.title}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                   

                                                    {/* Price Breakdown */}
                                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
                                                        <h5 className="font-bold text-gray-800 mb-3 flex items-center">
                                                            <IndianRupee className="w-4 h-4 text-amber-600 mr-2" />
                                                            Price Breakdown
                                                        </h5>
                                                        <div className="space-y-2 text-sm">
                                                            {(() => {
                                                                const itemsSubtotal = (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                                                const couponDiscount = order.discount || 0;
                                                                const subtotalAfterDiscount = itemsSubtotal - couponDiscount;
                                                                const gstAmount = order.gstAmount || 0;
                                                                const gstBreakdown = calculateGSTBreakdown(order, subtotalAfterDiscount);
                                                                const shipping = order.shippingCharge || 0;
                                                                
                                                                return (
                                                                    <>
                                                                        <div className="flex justify-between text-gray-600">
                                                                            <span>Subtotal:</span>
                                                                            <span>₹{itemsSubtotal.toFixed(2)}</span>
                                                                        </div>
                                                                        {couponDiscount > 0 && (
                                                                            <div className="flex justify-between text-green-600 font-semibold">
                                                                                <span>Coupon Discount ({order.couponCode}):</span>
                                                                                <span>-₹{couponDiscount.toFixed(2)}</span>
                                                                            </div>
                                                                        )}
                                                                       
                                                                        <div className="flex justify-between text-gray-600">
                                                                            <span>Shipping:</span>
                                                                            <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                                                                                {shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between font-bold text-lg text-amber-700 border-t-2 border-amber-300 pt-2 mt-2">
                                                                            <span>Total:</span>
                                                                            <span>₹{order.totalAmount?.toFixed(2) || '0.00'}</span>
                                                                        </div>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Orders;
