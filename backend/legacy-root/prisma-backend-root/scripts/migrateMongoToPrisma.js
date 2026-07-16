require('dotenv').config();
require('../src/shims/node25Compat');

const mongoose = require('mongoose');
const prisma = require('../src/config/sql');

const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Blog = require('../src/models/Blog');
const Coupon = require('../src/models/Coupon');
const Order = require('../src/models/Order');
const Review = require('../src/models/Review');
const RazorpayTransaction = require('../src/models/RazorpayTransaction');
const Counter = require('../src/models/Counter');
const InvoiceCounter = require('../src/models/InvoiceCounter');

const toId = (value) => (value ? value.toString() : null);
const toDate = (value) => (value ? new Date(value) : null);
const toStringArray = (value) => (Array.isArray(value) ? value.filter(Boolean).map(String) : []);
const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

async function resetSqlDatabase() {
  await prisma.reviewHelpful.deleteMany();
  await prisma.review.deleteMany();
  await prisma.razorpayTransaction.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.couponApplicableProduct.deleteMany();
  await prisma.couponExcludedProduct.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.category.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.invoiceCounter.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
}

async function migrateUsers() {
  const users = await User.find({}).lean();

  for (const user of users) {
    await prisma.user.create({
      data: {
        id: toId(user._id),
        name: user.name,
        email: user.email,
        password: user.password,
        phone: user.phone,
        alternatePhone: user.alternatePhone || null,
        gst: user.gst || null,
        addressStreet: user.address?.street || null,
        addressLocality: user.address?.locality || null,
        addressCity: user.address?.city || null,
        addressState: user.address?.state || null,
        addressPincode: user.address?.pincode || null,
        role: user.role || 'user',
        isEmailVerified: !!user.isEmailVerified,
        isPhoneVerified: !!user.isPhoneVerified,
        emailVerificationToken: user.emailVerificationToken || null,
        emailVerificationExpires: toDate(user.emailVerificationExpires),
        passwordResetToken: user.passwordResetToken || null,
        passwordResetExpires: toDate(user.passwordResetExpires),
        lastLogin: toDate(user.lastLogin),
        loginAttempts: toNumber(user.loginAttempts, 0),
        lockUntil: toDate(user.lockUntil),
        createdAt: toDate(user.createdAt) || new Date(),
        updatedAt: toDate(user.updatedAt) || new Date(),
      },
    });
  }

  for (const user of users) {
    const wishlistIds = toStringArray(user.wishlist);
    if (!wishlistIds.length) continue;

    await prisma.user.update({
      where: { id: toId(user._id) },
      data: {
        wishlist: {
          connect: wishlistIds.map((id) => ({ id })),
        },
      },
    });
  }
}

async function migrateProducts() {
  const products = await Product.find({}).lean();

  for (const product of products) {
    const images = toStringArray(product.images);

    await prisma.product.create({
      data: {
        id: toId(product._id),
        name: product.name,
        category: product.category,
        subcategory: product.subcategory || null,
        price: toNumber(product.price),
        originalPrice: product.originalPrice !== undefined ? toNumber(product.originalPrice, null) : null,
        gst: toNumber(product.gst, 0),
        hsn: product.hsn || null,
        unit: product.unit,
        stock: toNumber(product.stock, 0),
        description: product.description,
        images,
        image: product.image || images[0] || '',
        brand: product.brand || null,
        features: toStringArray(product.features),
        specifications: product.specifications || null,
        tags: toStringArray(product.tags),
        rating: toNumber(product.rating, 0),
        reviews: toNumber(product.reviews ?? product.totalReviews, 0),
        averageRating: toNumber(product.averageRating ?? product.rating, 0),
        totalReviews: toNumber(product.totalReviews ?? product.reviews, 0),
        status: product.status || 'active',
        featured: !!product.featured,
        discount: toNumber(product.discount, 0),
        weight: product.weight !== undefined ? toNumber(product.weight, null) : null,
        dimensionLength: product.dimensions?.length !== undefined ? toNumber(product.dimensions.length, null) : null,
        dimensionWidth: product.dimensions?.width !== undefined ? toNumber(product.dimensions.width, null) : null,
        dimensionHeight: product.dimensions?.height !== undefined ? toNumber(product.dimensions.height, null) : null,
        createdAt: toDate(product.createdAt) || new Date(),
        updatedAt: toDate(product.updatedAt) || new Date(),
      },
    });
  }
}

async function migrateCategories() {
  const categories = await Category.find({}).lean();

  for (const category of categories) {
    await prisma.category.create({
      data: {
        id: toId(category._id),
        name: category.name,
        subcategories: toStringArray(category.subcategories),
        createdAt: toDate(category.createdAt) || new Date(),
        updatedAt: toDate(category.updatedAt) || new Date(),
      },
    });
  }
}

async function migrateBlogs() {
  const blogs = await Blog.find({}).lean();

  for (const blog of blogs) {
    await prisma.blog.create({
      data: {
        id: toId(blog._id),
        title: blog.title,
        content: blog.content,
        image: blog.image || null,
        tags: toStringArray(blog.tags),
        author: blog.author || 'Admin',
        status: blog.status || 'draft',
        createdAt: toDate(blog.createdAt) || new Date(),
        updatedAt: toDate(blog.updatedAt) || new Date(),
      },
    });
  }
}

async function migrateCounters() {
  const counters = await Counter.find({}).lean();
  const invoiceCounters = await InvoiceCounter.find({}).lean();

  for (const counter of counters) {
    await prisma.counter.create({
      data: {
        id: counter._id,
        sequence: toNumber(counter.sequence, 0),
      },
    });
  }

  for (const counter of invoiceCounters) {
    await prisma.invoiceCounter.create({
      data: {
        id: toId(counter._id),
        year: toNumber(counter.year),
        currentNumber: toNumber(counter.currentNumber, 0),
        lastInvoiceNumber: counter.lastInvoiceNumber,
        createdAt: toDate(counter.createdAt) || new Date(),
        updatedAt: toDate(counter.updatedAt) || new Date(),
      },
    });
  }
}

async function migrateCoupons() {
  const coupons = await Coupon.find({}).lean();

  for (const coupon of coupons) {
    await prisma.coupon.create({
      data: {
        id: toId(coupon._id),
        title: coupon.title,
        code: coupon.code,
        description: coupon.description || null,
        discountType: coupon.discountType,
        discountValue: toNumber(coupon.discountValue),
        minOrderValue: toNumber(coupon.minOrderValue, 0),
        maxUsageCount: coupon.maxUsageCount ?? null,
        usagePerUser: toNumber(coupon.usagePerUser, 1),
        currentUsage: toNumber(coupon.currentUsage, 0),
        totalSales: toNumber(coupon.totalSales, 0),
        budget: coupon.budget !== undefined && coupon.budget !== null ? toNumber(coupon.budget, null) : null,
        budgetUtilized: toNumber(coupon.budgetUtilized, 0),
        startDate: toDate(coupon.startDate) || new Date(),
        endDate: toDate(coupon.endDate) || new Date(),
        isActive: !!coupon.isActive,
        applicableCategories: toStringArray(coupon.applicableCategories),
        userGroups: coupon.userGroups || 'all',
        createdById: toId(coupon.createdBy),
        updatedById: toId(coupon.updatedBy),
        createdAt: toDate(coupon.createdAt) || new Date(),
        updatedAt: toDate(coupon.updatedAt) || new Date(),
      },
    });

    for (const productId of toStringArray(coupon.applicableProducts)) {
      await prisma.couponApplicableProduct.create({
        data: {
          couponId: toId(coupon._id),
          productId,
        },
      });
    }

    for (const productId of toStringArray(coupon.excludedProducts)) {
      await prisma.couponExcludedProduct.create({
        data: {
          couponId: toId(coupon._id),
          productId,
        },
      });
    }
  }
}

async function migrateOrders() {
  const orders = await Order.find({}).lean();

  for (const order of orders) {
    await prisma.order.create({
      data: {
        id: toId(order._id),
        orderNumber: toNumber(order.orderNumber),
        formattedOrderNumber: order.formattedOrderNumber || String(order.orderNumber).padStart(6, '0'),
        invoiceNumber: order.invoiceNumber || null,
        userId: toId(order.user),
        subtotal: toNumber(order.subtotal),
        discountedSubtotal: toNumber(order.discountedSubtotal, 0),
        discount: toNumber(order.discount, 0),
        couponCode: order.couponCode || null,
        couponId: toId(order.couponId),
        totalAmount: toNumber(order.totalAmount),
        gstAmount: toNumber(order.gstAmount, 0),
        originalGstAmount: toNumber(order.originalGstAmount, 0),
        shippingCharge: toNumber(order.shippingCharge, 0),
        shippingAddress: order.shippingAddress?.address || '',
        shippingCity: order.shippingAddress?.city || '',
        shippingState: order.shippingAddress?.state || '',
        shippingPincode: order.shippingAddress?.pincode || '',
        shippingPhone: order.shippingAddress?.phone || null,
        paymentMethod: order.paymentMethod || 'cod',
        paymentStatus: order.paymentStatus || 'pending',
        status: order.status || 'pending',
        razorpayOrderId: order.razorpayDetails?.orderId || null,
        razorpayPaymentId: order.razorpayDetails?.paymentId || null,
        razorpaySignature: order.razorpayDetails?.signature || null,
        adminNote: order.adminNote || null,
        adminNoteUpdatedAt: toDate(order.adminNoteUpdatedAt),
        adminNoteUpdatedById: toId(order.adminNoteUpdatedBy),
        invoiceGenerated: !!order.invoiceGenerated,
        invoiceGeneratedAt: toDate(order.invoiceGeneratedAt),
        createdAt: toDate(order.createdAt) || new Date(),
        updatedAt: toDate(order.updatedAt) || new Date(),
      },
    });

    for (const item of order.items || []) {
      await prisma.orderItem.create({
        data: {
          orderId: toId(order._id),
          productId: toId(item.product),
          quantity: toNumber(item.quantity, 1),
          price: toNumber(item.price),
          basePrice: toNumber(item.basePrice, 0),
          gst: toNumber(item.gst, 0),
          gstRate: toNumber(item.gstRate, 18),
          gstAmount: toNumber(item.gstAmount, 0),
          totalGstAmount: toNumber(item.totalGstAmount, 0),
          hsn: item.hsn || '1234',
          name: item.name,
        },
      });
    }
  }
}

async function migrateCouponUsage() {
  const coupons = await Coupon.find({}).lean();

  for (const coupon of coupons) {
    for (const usage of coupon.usageHistory || []) {
      await prisma.couponUsage.create({
        data: {
          couponId: toId(coupon._id),
          userId: toId(usage.user),
          orderId: toId(usage.orderId),
          orderValue: toNumber(usage.orderValue),
          discountGiven: toNumber(usage.discountGiven),
          usedAt: toDate(usage.usedAt) || new Date(),
        },
      });
    }
  }
}

async function migrateReviews() {
  const reviews = await Review.find({}).lean();

  for (const review of reviews) {
    await prisma.review.create({
      data: {
        id: toId(review._id),
        userId: toId(review.user),
        productId: toId(review.product),
        rating: toNumber(review.rating, 0),
        title: review.title || null,
        comment: review.comment,
        images: toStringArray(review.images),
        status: review.status || 'pending',
        moderationNotes: review.moderationNotes || null,
        helpful: toNumber(review.helpful, 0),
        replyText: review.reply?.text || null,
        replyAdminId: toId(review.reply?.admin),
        replyDate: toDate(review.reply?.date),
        verified: review.verified !== false,
        createdAt: toDate(review.createdAt) || new Date(),
        updatedAt: toDate(review.updatedAt) || new Date(),
      },
    });

    for (const vote of review.helpfulBy || []) {
      await prisma.reviewHelpful.create({
        data: {
          reviewId: toId(review._id),
          userId: toId(vote.user),
          isHelpful: vote.isHelpful !== false,
        },
      });
    }
  }
}

async function migrateTransactions() {
  const transactions = await RazorpayTransaction.find({}).lean();

  for (const transaction of transactions) {
    await prisma.razorpayTransaction.create({
      data: {
        id: toId(transaction._id),
        orderId: toId(transaction.orderId),
        userId: toId(transaction.userId),
        razorpayOrderId: transaction.razorpayOrderId,
        razorpayPaymentId: transaction.razorpayPaymentId || null,
        razorpaySignature: transaction.razorpaySignature || null,
        amount: toNumber(transaction.amount),
        currency: transaction.currency || 'INR',
        status: transaction.status || 'created',
        paymentMethod: transaction.paymentMethod,
        refundId: transaction.refundId || null,
        refundStatus: transaction.refundStatus || null,
        refundAmount: transaction.refundAmount !== undefined && transaction.refundAmount !== null ? toNumber(transaction.refundAmount, null) : null,
        errorCode: transaction.errorCode || null,
        errorDescription: transaction.errorDescription || null,
        metadata: transaction.metadata || null,
        createdAt: toDate(transaction.createdAt) || new Date(),
        updatedAt: toDate(transaction.updatedAt) || new Date(),
      },
    });
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to read the current MongoDB data');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to write into PostgreSQL');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    family: 4,
  });

  console.log('Resetting SQL tables...');
  await resetSqlDatabase();

  console.log('Migrating users...');
  await migrateUsers();

  console.log('Migrating products...');
  await migrateProducts();

  console.log('Migrating categories...');
  await migrateCategories();

  console.log('Migrating blogs...');
  await migrateBlogs();

  console.log('Migrating counters...');
  await migrateCounters();

  console.log('Migrating coupons...');
  await migrateCoupons();

  console.log('Migrating orders...');
  await migrateOrders();

  console.log('Migrating coupon usage history...');
  await migrateCouponUsage();

  console.log('Migrating reviews...');
  await migrateReviews();

  console.log('Migrating Razorpay transactions...');
  await migrateTransactions();

  console.log('MongoDB to PostgreSQL migration completed successfully.');
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    await prisma.$disconnect();
  });
