import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ordersApi } from '../../services/api';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Download, 
  Filter, 
  RefreshCcw, 
  Loader, 
  AlertCircle, 
  Search,
  Eye,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Phone,
  MapPin,
  Mail,
  Edit3,
  Save,
  MessageSquare,
  AlertTriangle,
  Plus,
  StickyNote,
  FileText
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import OrderDetailsModal from '../../components/modals/OrderDetailsModal';

// Constants
const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [orderStats, setOrderStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Admin notes state
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  
  // New features state
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ✅ Invoice download state
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);

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

  // ✅ Enhanced GST calculation based on actual order data
  const calculateGSTBreakdown = (orderData, subtotalAfterDiscount) => {
    console.log('🧮 Admin: Calculating GST breakdown:', { 
      orderData: {
        gstAmount: orderData?.gstAmount,
        discountedSubtotal: orderData?.discountedSubtotal,
        subtotal: orderData?.subtotal,
        discount: orderData?.discount
      }, 
      subtotalAfterDiscount 
    });
    
    // First, try to get GST breakdown from order data
    if (orderData?.gstBreakdown && Array.isArray(orderData.gstBreakdown)) {
      let totalCGST = 0;
      let totalSGST = 0;
      let totalGST = 0;
      let effectiveRate = 0;
      
      orderData.gstBreakdown.forEach(gst => {
        totalCGST += gst.cgst || 0;
        totalSGST += gst.sgst || 0;
        totalGST += gst.gstAmount || 0;
        
        if (effectiveRate === 0 && gst.rate) {
          effectiveRate = gst.rate;
        }
      });
      
      console.log('✅ Admin: Using order GST breakdown:', { totalCGST, totalSGST, totalGST, effectiveRate });
      
      return {
        cgst: Math.round(totalCGST * 100) / 100,
        sgst: Math.round(totalSGST * 100) / 100,
        totalGST: Math.round(totalGST * 100) / 100,
        cgstRate: effectiveRate / 2,
        sgstRate: effectiveRate / 2,
        totalRate: effectiveRate
      };
    }
    
    // Second, calculate from total GST amount and discounted subtotal (MAIN CASE)
    if (orderData?.gstAmount && orderData.gstAmount > 0) {
      const totalGST = orderData.gstAmount;
      const cgst = totalGST / 2;
      const sgst = totalGST / 2;
      
      // Use discountedSubtotal if available, otherwise calculate it
      const taxableAmount = orderData?.discountedSubtotal || subtotalAfterDiscount;
      console.log('🧮 Admin: GST Calculation Base:', { taxableAmount, totalGST });
      
      // Calculate effective rate from taxable amount
      const effectiveRate = taxableAmount > 0 ? (totalGST / taxableAmount) * 100 : 0;
      
      console.log('✅ Admin: Using total GST amount:', { 
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
    console.log('❌ Admin: No GST data found, using zero values');
    return {
      cgst: 0,
      sgst: 0,
      totalGST: 0,
      cgstRate: 0,
      sgstRate: 0,
      totalRate: 0
    };
  };

  // ✅ Enhanced invoice download function
  const handleDownloadInvoice = async (orderId) => {
    try {
      setDownloadingInvoice(orderId);
      toast.loading('Generating invoice...', { id: 'admin-pdf-loading' });
      
      // Fetch complete order details
      const response = await ordersApi.getOrder(orderId);
      const orderData = response.order || response.data?.order || response;
      
      if (!orderData) {
        throw new Error('Order data not found');
      }

      console.log('🧾 Admin: Order data for invoice:', orderData);

      // Calculate values for invoice
      const itemsSubtotal = (orderData.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const couponDiscount = orderData.discount || 0;
      const couponCode = orderData.couponCode || null;
      const subtotalAfterDiscount = itemsSubtotal - couponDiscount;
      const gstBreakdown = calculateGSTBreakdown(orderData, subtotalAfterDiscount);
      const shipping = orderData.shippingCharge || (orderData.shippingAddress ? (subtotalAfterDiscount >= 500 ? 0 : 50) : 0);

      // ✅ Enhanced single-page invoice with company logo and coupon details
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
                                <p><strong>Invoice #:</strong>${orderData.invoiceOrderNumber}</p>
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
        
        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      } else {
        throw new Error('Unable to open print window. Please allow popups.');
      }
      
      toast.success('Invoice generated successfully!', { id: 'admin-pdf-loading' });
      
    } catch (error) {
      console.error('❌ Admin: Error downloading invoice:', error);
      toast.error('Failed to generate invoice. Please try again.', { id: 'admin-pdf-loading' });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const loadOrders = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching orders with filters:', { startDate, endDate, filterStatus, page, searchTerm, sortField, sortOrder });
      
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        status: filterStatus,
        search: searchTerm,
        sortField,
        sortOrder,
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      };

      const response = await ordersApi.getAllOrders(params);
      console.log('Orders response:', response);

      if (!response || !response.orders) {
        throw new Error('Invalid response format');
      }

      setOrders(response.orders);
      setTotalPages(Math.ceil(response.total / ITEMS_PER_PAGE));
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Failed to load orders');
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterStatus, searchTerm, sortField, sortOrder]);

  const loadOrderStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setError(null);
      console.log('Fetching order stats with date range:', { startDate, endDate });

      const params = {
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      };

      const response = await ordersApi.getOrderStats(params);
      console.log('Order stats response:', response);

      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format from stats API');
      }

      setOrderStats({
        totalOrders: response.totalOrders || 0,
        totalRevenue: response.totalRevenue || 0,
        averageOrderValue: response.averageOrderValue || 0,
        statusBreakdown: response.statusBreakdown || {},
        dailyStats: Array.isArray(response.dailyStats) ? response.dailyStats : []
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load order statistics';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Set minimal stats to prevent UI breaks
      setOrderStats({
        totalOrders: orders.length,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusBreakdown: {},
        dailyStats: []
      });
    } finally {
      setStatsLoading(false);
    }
  }, [startDate, endDate, orders.length]);

  useEffect(() => {
    loadOrders(1); // Reset to first page when filters change
    loadOrderStats();
  }, [startDate, endDate, filterStatus, searchTerm, sortField, sortOrder]);

  // Admin note functions
  const handleEditNote = (orderId, currentNote = '') => {
    setEditingNote(orderId);
    setNoteText(currentNote);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteText('');
  };

  const handleSaveNote = async (orderId) => {
    try {
      setSavingNote(true);
      
      // API call to save admin note
      const response = await ordersApi.updateAdminNote(orderId, {
        adminNote: noteText.trim()
      });

      if (response.success) {
        // Update the order in local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId 
              ? { ...order, adminNote: noteText.trim() }
              : order
          )
        );

        toast.success('Admin note saved successfully');
        setEditingNote(null);
        setNoteText('');
      } else {
        throw new Error(response.message || 'Failed to save note');
      }
    } catch (error) {
      console.error('Error saving admin note:', error);
      toast.error('Failed to save admin note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const toggleNoteExpansion = (orderId) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedNotes(newExpanded);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdatingStatus(orderId);
      await ordersApi.updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated successfully');
      await loadOrders(currentPage);
      await loadOrderStats();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }

    try {
      setBulkActionLoading(true);
      const orderIds = Array.from(selectedOrders);
      
      // Update orders one by one (in a real app, you'd have a bulk API)
      for (const orderId of orderIds) {
        await ordersApi.updateOrderStatus(orderId, newStatus);
      }
      
      toast.success(`${orderIds.length} orders updated successfully`);
      setSelectedOrders(new Set());
      await loadOrders(currentPage);
      await loadOrderStats();
    } catch (err) {
      console.error('Error updating orders:', err);
      toast.error('Failed to update selected orders');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExportOrders = async () => {
    try {
      setExportLoading(true);
      setError(null);
      console.log('Exporting orders with filters:', { startDate, endDate, filterStatus });

      const params = {
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
        ...(filterStatus && { status: filterStatus }),
        ...(searchTerm && { search: searchTerm })
      };

      const response = await ordersApi.exportOrders(params);
      console.log('Export response type:', response?.type);
      
      if (!response) {
        throw new Error('No response received from export API');
      }

      // Create and trigger download
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Orders exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to export orders';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setExportLoading(false);
    }
  };

  const resetFilters = () => {
    setDateRange([null, null]);
    setFilterStatus('');
    setSearchTerm('');
    setSortField('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
    setSelectedOrders(new Set());
    loadOrders(1);
    loadOrderStats();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleOrderSelection = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAllOrders = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(order => order._id)));
    }
  };

  const getStatusBadgeClass = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <TrendingUp className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getNoteTypeConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'cancelled':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          icon: <AlertTriangle className="w-4 h-4" />,
          title: 'Cancellation Note',
          placeholder: 'Add cancellation reason...'
        };
      case 'processing':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
          icon: <Clock className="w-4 h-4" />,
          title: 'Processing Note',
          placeholder: 'Add processing details...'
        };
      case 'shipped':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          icon: <TrendingUp className="w-4 h-4" />,
          title: 'Shipping Note',
          placeholder: 'Add shipping details...'
        };
      case 'delivered':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          icon: <Package className="w-4 h-4" />,
          title: 'Delivery Note',
          placeholder: 'Add delivery details...'
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600',
          buttonColor: 'bg-gray-600 hover:bg-gray-700',
          icon: <StickyNote className="w-4 h-4" />,
          title: 'Admin Note',
          placeholder: 'Add admin note...'
        };
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <SortAsc className="w-4 h-4 opacity-30" />;
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  const renderAdminNote = (order) => {
    const isExpanded = expandedNotes.has(order._id);
    const isEditing = editingNote === order._id;
    const noteConfig = getNoteTypeConfig(order.status);

    return (
      <div className={`mt-2 p-3 ${noteConfig.bgColor} border ${noteConfig.borderColor} rounded-lg`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={noteConfig.iconColor}>{noteConfig.icon}</span>
            <span className={`text-sm font-medium ${noteConfig.textColor}`}>{noteConfig.title}</span>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => handleEditNote(order._id, order.adminNote)}
                className={`${noteConfig.iconColor} hover:opacity-80 transition-colors`}
                title="Edit note"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {order.adminNote && (
              <button
                onClick={() => toggleNoteExpansion(order._id)}
                className={`${noteConfig.iconColor} hover:opacity-80 transition-colors`}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={noteConfig.placeholder}
              className={`w-full p-2 text-sm border ${noteConfig.borderColor} rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none`}
              rows="3"
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSaveNote(order._id)}
                disabled={savingNote}
                className={`px-3 py-1 text-xs text-white rounded ${noteConfig.buttonColor} transition-colors flex items-center space-x-1 disabled:opacity-50`}
              >
                {savingNote ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>{savingNote ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`text-sm ${noteConfig.textColor}`}>
            {order.adminNote ? (
              <div>
                <p className={isExpanded ? '' : 'line-clamp-2'}>
                  {order.adminNote}
                </p>
                {!isExpanded && order.adminNote.length > 100 && (
                  <button
                    onClick={() => toggleNoteExpansion(order._id)}
                    className={`${noteConfig.iconColor} hover:opacity-80 text-xs mt-1`}
                  >
                    Show more...
                  </button>
                )}
              </div>
            ) : (
              <div className={`flex items-center space-x-2 ${noteConfig.iconColor}`}>
                <MessageSquare className="w-4 h-4" />
                <span className="italic">No {noteConfig.title.toLowerCase()} added yet</span>
                <button
                  onClick={() => handleEditNote(order._id, '')}
                  className={`${noteConfig.iconColor} hover:opacity-80`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= Math.min(5, totalPages); i++) {
      pages.push(i);
    }

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 px-4 sm:px-6 py-3 bg-amber-50 border-t border-amber-100">
        <div className="text-sm text-gray-700 mb-2 sm:mb-0">
          Showing page {currentPage} of {totalPages} ({orders.length} orders)
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => loadOrders(1)}
            disabled={currentPage === 1 || loading}
            className="px-2 py-1 text-sm rounded bg-white text-gray-700 hover:bg-amber-50 disabled:bg-gray-100 disabled:text-gray-400 border border-amber-200"
          >
            First
          </button>
          <button
            onClick={() => loadOrders(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="px-3 py-1 text-sm rounded bg-white text-gray-700 hover:bg-amber-50 disabled:bg-gray-100 disabled:text-gray-400 border border-amber-200"
          >
            Previous
          </button>
          {pages.map(page => (
            <button
              key={page}
              onClick={() => loadOrders(page)}
              className={`px-3 py-1 text-sm rounded border ${
                currentPage === page 
                  ? 'bg-amber-600 text-white border-amber-600' 
                  : 'bg-white text-gray-700 hover:bg-amber-50 border-amber-200'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => loadOrders(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="px-3 py-1 text-sm rounded bg-white text-gray-700 hover:bg-amber-50 disabled:bg-gray-100 disabled:text-gray-400 border border-amber-200"
          >
            Next
          </button>
          <button
            onClick={() => loadOrders(totalPages)}
            disabled={currentPage === totalPages || loading}
            className="px-2 py-1 text-sm rounded bg-white text-gray-700 hover:bg-amber-50 disabled:bg-gray-100 disabled:text-gray-400 border border-amber-200"
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const renderCardView = () => {
    if (!Array.isArray(orders)) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => (
          <div key={order._id} className="bg-white rounded-lg shadow-md border border-amber-100 hover:shadow-lg transition-shadow">
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order._id)}
                    onChange={() => toggleOrderSelection(order._id)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <h3 className="font-medium text-gray-900 text-sm">#{order._id.slice(-8)}</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusBadgeClass(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{order.status || 'pending'}</span>
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{order.user?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">₹{(order.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                {order.user?.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{order.user.phone}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-1">Items ({order.items?.length || 0})</div>
                <div className="text-sm text-gray-700 max-h-16 overflow-y-auto">
                  {order.items?.slice(0, 2).map((item, index) => (
                    <div key={index} className="truncate">
                      {item.product?.name || 'Unknown Product'} × {item.quantity}
                    </div>
                  ))}
                  {order.items?.length > 2 && (
                    <div className="text-xs text-gray-500">+{order.items.length - 2} more items</div>
                  )}
                </div>
              </div>

              {/* Admin Note in Card View */}
              {renderAdminNote(order)}

              <div className="flex space-x-1 mt-4">
                <button
                  onClick={() => handleViewDetails(order)}
                  className="flex-1 px-2 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center space-x-1"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
                
                {/* ✅ Download Invoice Button in Card View */}
                <button
                  onClick={() => handleDownloadInvoice(order._id)}
                  disabled={downloadingInvoice === order._id}
                  className="px-2 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Download Invoice"
                >
                  {downloadingInvoice === order._id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </button>
                
                <select
                  value={order.status || 'pending'}
                  onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                  disabled={updatingStatus === order._id}
                  className="px-1 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ✅ FIXED: Responsive table without horizontal scroll
  const renderTableView = () => {
    if (!Array.isArray(orders)) {
      return null;
    }

    return (
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="bg-white border border-amber-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            {/* ✅ Main Order Info - Always visible */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order._id)}
                    onChange={() => toggleOrderSelection(order._id)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">#{order._id.slice(-8)}</h3>
                    <div className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusBadgeClass(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="capitalize">{order.status || 'pending'}</span>
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{(order.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ✅ Customer & Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Customer</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{order.user?.name || 'N/A'}</span>
                    </div>
                    {order.user?.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{order.user.phone}</span>
                      </div>
                    )}
                    {order.user?.email && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{order.user.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Items ({order.items?.length || 0})</h4>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {order.items?.slice(0, 3).map((item, index) => (
                      <div key={index} className="text-sm text-gray-600 truncate">
                        {item.product?.name || 'Unknown Product'} × {item.quantity}
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <div className="text-xs text-gray-500">+{order.items.length - 3} more items</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ Shipping Address */}
              {order.shippingAddress && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Shipping Address</h4>
                  <div className="flex items-start space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                    </span>
                  </div>
                </div>
              )}

              {/* ✅ Actions Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className="px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                  
                  <button
                    onClick={() => handleDownloadInvoice(order._id)}
                    disabled={downloadingInvoice === order._id}
                    className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title="Download Invoice"
                  >
                    {downloadingInvoice === order._id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {downloadingInvoice === order._id ? 'Generating...' : 'Invoice'}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => handleEditNote(order._id, order.adminNote)}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                    title="Add/Edit Note"
                  >
                    <StickyNote className="w-4 h-4" />
                    <span className="hidden sm:inline">Note</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  {updatingStatus === order._id ? (
                    <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg">
                      <Loader className="w-4 h-4 animate-spin mr-2 text-amber-600" />
                      <span className="text-sm text-gray-500">Updating...</span>
                    </div>
                  ) : (
                    <select
                      value={order.status || 'pending'}
                      onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                      className="px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white min-w-[120px]"
                      disabled={updatingStatus === order._id}
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ Admin Note Section */}
            <div className={`border-t ${getNoteTypeConfig(order.status).borderColor} ${getNoteTypeConfig(order.status).bgColor}`}>
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <span className={getNoteTypeConfig(order.status).iconColor}>
                      {getNoteTypeConfig(order.status).icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-sm font-medium ${getNoteTypeConfig(order.status).textColor}`}>
                        {getNoteTypeConfig(order.status).title}
                      </h4>
                      {editingNote !== order._id && (
                        <button
                          onClick={() => handleEditNote(order._id, order.adminNote)}
                          className={`${getNoteTypeConfig(order.status).iconColor} hover:opacity-80 transition-colors flex items-center space-x-1`}
                          title={`Edit ${getNoteTypeConfig(order.status).title.toLowerCase()}`}
                        >
                          <Edit3 className="w-4 h-4" />
                          <span className="text-xs hidden sm:inline">Edit Note</span>
                        </button>
                      )}
                    </div>
                    
                    {editingNote === order._id ? (
                      <div className="space-y-3">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder={getNoteTypeConfig(order.status).placeholder}
                          className={`w-full p-3 text-sm border ${getNoteTypeConfig(order.status).borderColor} rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none`}
                          rows="3"
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSaveNote(order._id)}
                            disabled={savingNote}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1 disabled:opacity-50"
                          >
                            {savingNote ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            <span>{savingNote ? 'Saving...' : 'Save Note'}</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-1"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/60 p-3 rounded-lg border border-gray-200">
                        {order.adminNote ? (
                          <div className="text-sm text-black">
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="leading-relaxed">{order.adminNote}</p>
                                <p className="text-xs text-gray-600 mt-1 opacity-75">
                                  Added by admin
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className={`flex items-center space-x-2 ${getNoteTypeConfig(order.status).iconColor}`}>
                              <MessageSquare className="w-4 h-4" />
                              <span className="text-sm italic">No {getNoteTypeConfig(order.status).title.toLowerCase()} added yet</span>
                            </div>
                            <button
                              onClick={() => handleEditNote(order._id, '')}
                              className={`px-3 py-1 text-xs text-white rounded hover:opacity-80 transition-colors flex items-center space-x-1 ${getNoteTypeConfig(order.status).buttonColor}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Note</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading && !orders.length) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-amber-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-lg">
          <Loader className="w-8 h-8 animate-spin text-amber-600 mb-4" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error && !orders.length) {
    return (
      <div className="p-4 sm:p-6 bg-amber-50 min-h-screen">
        <div className="max-w-2xl mx-auto bg-white rounded-xl p-6 shadow-lg border border-red-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-medium text-red-800">Error Loading Orders</h2>
          </div>
          <p className="mt-2 text-red-600">{error}</p>
          <button 
            onClick={() => loadOrders(1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 mb-2 sm:mb-0">Orders Management</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
              >
                {viewMode === 'table' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors sm:hidden"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className={`space-y-4 ${showFilters ? 'block' : 'hidden sm:block'}`}>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders by ID, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setDateRange(update);
                  setCurrentPage(1);
                }}
                isClearable={true}
                placeholderText="Select date range"
                className="w-full sm:w-auto px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm text-amber-600 hover:text-amber-800 hover:bg-amber-100 flex items-center space-x-2 rounded-lg transition-colors border border-amber-300"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleExportOrders}
                  disabled={exportLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exportLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden mt-4 w-full py-2 text-center text-amber-600 hover:bg-amber-100 rounded-lg transition-colors border border-amber-300"
          >
            {showFilters ? (
              <div className="flex items-center justify-center space-x-2">
                <ChevronUp className="w-4 h-4" />
                <span>Hide Filters</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <ChevronDown className="w-4 h-4" />
                <span>Show Filters</span>
              </div>
            )}
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <div className="mb-6 p-4 bg-amber-100 rounded-lg border border-amber-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-amber-800">
                {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(status => (
                  <button
                    key={status}
                    onClick={() => handleBulkStatusUpdate(status)}
                    disabled={bulkActionLoading}
                    className="px-3 py-1 text-xs bg-white text-amber-700 rounded-lg hover:bg-amber-50 border border-amber-300 disabled:opacity-50 transition-colors"
                  >
                    {bulkActionLoading ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      `Mark as ${status.charAt(0).toUpperCase() + status.slice(1)}`
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedOrders(new Set())}
                  className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-300 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Statistics */}
        {orderStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md border border-amber-100 relative">
              {statsLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                  <Loader className="w-4 h-4 animate-spin text-amber-600" />
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Package className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-500">Total Orders</h3>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{orderStats.totalOrders}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md border border-amber-100 relative">
              {statsLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                  <Loader className="w-4 h-4 animate-spin text-amber-600" />
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-500">Total Revenue</h3>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{orderStats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md border border-amber-100 relative">
              {statsLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                  <Loader className="w-4 h-4 animate-spin text-amber-600" />
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-500">Avg. Order Value</h3>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{orderStats.averageOrderValue.toFixed(0)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md border border-amber-100 relative col-span-2 lg:col-span-1">
              {statsLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                  <Loader className="w-4 h-4 animate-spin text-amber-600" />
                </div>
              )}
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm text-gray-500 mb-2">Status Breakdown</h3>
                  <div className="space-y-1">
                    {Object.entries(orderStats.statusBreakdown).slice(0, 3).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center text-xs">
                        <span className="capitalize text-gray-600">{status}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Display */}
        <div className="bg-white rounded-lg shadow-md border border-amber-100 overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-amber-900">
                Orders ({orders.length})
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortField(field);
                    setSortOrder(order);
                  }}
                  className="px-3 py-1 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="totalAmount-desc">Highest Amount</option>
                  <option value="totalAmount-asc">Lowest Amount</option>
                  <option value="user.name-asc">Customer A-Z</option>
                  <option value="user.name-desc">Customer Z-A</option>
                </select>
              </div>
            </div>
          </div>

          <div className="relative">
            {loading && orders.length > 0 && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
                  <Loader className="w-6 h-6 animate-spin text-amber-600" />
                  <span className="text-gray-600">Updating orders...</span>
                </div>
              </div>
            )}

            {orders.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="p-4">
                {viewMode === 'table' ? renderTableView() : renderCardView()}
              </div>
            )}
          </div>

          {orders.length > 0 && renderPagination()}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={handleCloseModal}
          />
        )}
      </div>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default AdminOrders;