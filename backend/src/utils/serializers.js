import { toArray } from './requestParsing.js';

export function serializeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    alternatePhone: user.alternatePhone,
    role: user.role,
    isPremium: user.isPremium,
    isActive: true,
    isEmailVerified: user.isEmailVerified,
    address: {
      street: user.addressStreet || '',
      locality: user.addressLocality || '',
      city: user.addressCity || '',
      state: user.addressState || '',
      pincode: user.addressPincode || '',
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function serializeProduct(product) {
  if (!product) return null;

  const imageUrls = (Array.isArray(product.imageUrls) ? product.imageUrls : toArray(product.imageUrls)).filter(Boolean);

  const price = Number(product.price);
  const gstRate = product.gstRate == null ? 0 : Number(product.gstRate);
  const gstAmount = Math.round(price * gstRate) / 100;
  const totalPrice = Math.round((price + gstAmount) * 100) / 100;

  return {
    id: product.id,
    _id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    category: product.categoryName || product.category || '',
    categoryName: product.categoryName || product.category || '',
    subcategory: product.subcategory || '',
    description: product.description,
    unit: product.unit,
    price,
    originalPrice: product.originalPrice == null ? null : Number(product.originalPrice),
    gst: gstRate,
    gstRate,
    gstAmount,
    totalPrice,
    hsn: product.hsn || '',
    stock: product.stock,
    status: product.status,
    image: product.imageUrl,
    imageUrl: product.imageUrl,
    images: imageUrls,
    brand: product.brand || '',
    tags: Array.isArray(product.tags) ? product.tags : toArray(product.tags),
    features: Array.isArray(product.features) ? product.features : toArray(product.features),
    featured: product.isFeatured,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function serializeCoupon(coupon) {
  if (!coupon) return null;

  return {
    id: coupon.id,
    _id: coupon.id,
    title: coupon.title,
    code: coupon.code,
    description: coupon.description || '',
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    maxDiscountAmount: coupon.maxDiscountAmount == null ? null : Number(coupon.maxDiscountAmount),
    minOrderValue: Number(coupon.minOrderValue ?? 0),
    maxUsageCount: coupon.maxUsageCount,
    usagePerUser: coupon.usagePerUser,
    currentUsage: coupon.currentUsage,
    budget: coupon.budget == null ? null : Number(coupon.budget),
    budgetUtilized: Number(coupon.budgetUtilized ?? 0),
    totalSales: Number(coupon.totalSales ?? 0),
    startDate: coupon.startDate,
    endDate: coupon.endDate,
    isActive: coupon.isActive,
    userGroups: coupon.userGroups,
    allowedUserEmails: toArray(coupon.allowedUserEmails),
    applicableProducts: toArray(coupon.applicableProducts),
    excludedProducts: toArray(coupon.excludedProducts),
    applicableCategories: toArray(coupon.applicableCategories),
    createdBy: coupon.createdBy,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

export function serializeOrder(order, items = []) {
  if (!order) return null;

  // Human-facing identifiers derived from the stored per-order sequence
  // (orderNumber is "ORD-000001" style) so they stay stable per order and
  // strictly increasing. Invoice #: year + 7-digit sequence (YYYY0000001).
  // Order ID: order date + 4-digit sequence (YYYYMMDD0001).
  // ponytail: seq is the global order counter, not a per-day reset — the
  // date changes daily but the tail keeps counting; switch to a per-day
  // count if a daily-reset sequence is ever required.
  const seq = parseInt(String(order.orderNumber ?? '').replace(/\D/g, ''), 10) || 0;
  const created = order.createdAt ? new Date(order.createdAt) : new Date();
  const yyyy = created.getFullYear();
  const mm = String(created.getMonth() + 1).padStart(2, '0');
  const dd = String(created.getDate()).padStart(2, '0');

  return {
    id: order.id,
    _id: order.id,
    orderNumber: order.orderNumber,
    invoiceNumber: `${yyyy}${String(seq).padStart(7, '0')}`,
    formattedOrderId: `${yyyy}${mm}${dd}${String(seq).padStart(4, '0')}`,
    subtotal: Number(order.subtotal),
    discountedSubtotal: Number(order.discountedSubtotal ?? 0),
    discount: Number(order.discount ?? 0),
    totalAmount: Number(order.totalAmount),
    shippingCharge: Number(order.shippingCharge ?? 0),
    couponCode: order.couponCode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    customerName: order.shippingName,
    shippingAddress: {
      address: order.shippingAddress,
      city: order.shippingCity,
      state: order.shippingState,
      pincode: order.shippingPincode,
      phone: order.shippingPhone,
    },
    adminNote: order.adminNote,
    razorpayDetails: {
      orderId: order.razorpayOrderId,
      paymentId: order.razorpayPaymentId,
      signature: order.razorpaySignature,
    },
    paypalDetails: {
      orderId: order.paypalOrderId,
      captureId: order.paypalCaptureId,
    },
    items,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
