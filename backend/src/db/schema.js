import {
  boolean,
  datetime,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const userRoleValues = ['user', 'admin', 'business'];
export const productStatusValues = ['draft', 'active', 'inactive'];
export const orderStatusValues = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
export const paymentStatusValues = ['pending', 'initiated', 'completed', 'failed', 'refunded'];
export const discountTypeValues = ['percentage', 'fixed'];
export const couponUserGroupValues = ['all', 'new', 'premium'];

const timestamps = {
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
};

export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    phone: varchar('phone', { length: 20 }),
    alternatePhone: varchar('alternate_phone', { length: 20 }),
    addressStreet: text('address_street'),
    addressLocality: text('address_locality'),
    addressCity: varchar('address_city', { length: 120 }),
    addressState: varchar('address_state', { length: 120 }),
    addressPincode: varchar('address_pincode', { length: 20 }),
    role: mysqlEnum('role', userRoleValues).notNull().default('user'),
    isPremium: boolean('is_premium').notNull().default(false),
    isEmailVerified: boolean('is_email_verified').notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_unique').on(table.email),
  })
);

export const categories = mysqlTable(
  'categories',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 140 }).notNull(),
    subcategories: json('subcategories'),
    ...timestamps,
  },
  (table) => ({
    nameIdx: uniqueIndex('categories_name_unique').on(table.name),
    slugIdx: uniqueIndex('categories_slug_unique').on(table.slug),
  })
);

export const products = mysqlTable(
  'products',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 180 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull(),
    categoryId: varchar('category_id', { length: 36 }).references(() => categories.id, { onDelete: 'set null' }),
    subcategory: varchar('subcategory', { length: 120 }),
    description: text('description').notNull(),
    unit: varchar('unit', { length: 30 }).notNull().default('kg'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
    gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    hsn: varchar('hsn', { length: 20 }),
    stock: int('stock').notNull().default(0),
    status: mysqlEnum('status', productStatusValues).notNull().default('draft'),
    imageUrl: text('image_url'),
    imageUrls: json('image_urls'),
    brand: varchar('brand', { length: 120 }),
    tags: json('tags'),
    features: json('features'),
    isFeatured: boolean('is_featured').notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex('products_slug_unique').on(table.slug),
  })
);

export const orders = mysqlTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  orderNumber: varchar('order_number', { length: 24 }).notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountedSubtotal: decimal('discounted_subtotal', { precision: 10, scale: 2 }).notNull().default('0.00'),
  discount: decimal('discount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  shippingCharge: decimal('shipping_charge', { precision: 10, scale: 2 }).notNull().default('0.00'),
  couponCode: varchar('coupon_code', { length: 64 }),
  status: mysqlEnum('status', orderStatusValues).notNull().default('pending'),
  paymentStatus: mysqlEnum('payment_status', paymentStatusValues).notNull().default('pending'),
  paymentMethod: varchar('payment_method', { length: 30 }).notNull().default('paypal'),
  shippingName: varchar('shipping_name', { length: 120 }).notNull(),
  shippingPhone: varchar('shipping_phone', { length: 20 }),
  shippingAddress: text('shipping_address').notNull(),
  shippingCity: varchar('shipping_city', { length: 120 }).notNull(),
  shippingState: varchar('shipping_state', { length: 120 }).notNull(),
  shippingPincode: varchar('shipping_pincode', { length: 20 }).notNull(),
  adminNote: text('admin_note'),
  razorpayOrderId: varchar('razorpay_order_id', { length: 120 }),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 120 }),
  razorpaySignature: text('razorpay_signature'),
  // PayPal — populated by the paypal create/capture flow. See paypalController.js.
  paypalOrderId: varchar('paypal_order_id', { length: 120 }),
  paypalCaptureId: varchar('paypal_capture_id', { length: 120 }),
  ...timestamps,
});

export const orderItems = mysqlTable('order_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  orderId: varchar('order_id', { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 36 })
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 180 }),
  quantity: int('quantity').notNull(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }),
  gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }),
  hsn: varchar('hsn', { length: 20 }),
  lineTotal: decimal('line_total', { precision: 10, scale: 2 }).notNull(),
});

export const coupons = mysqlTable(
  'coupons',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    title: varchar('title', { length: 180 }).notNull(),
    code: varchar('code', { length: 64 }).notNull(),
    description: text('description'),
    discountType: mysqlEnum('discount_type', discountTypeValues).notNull().default('percentage'),
    discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
    maxDiscountAmount: decimal('max_discount_amount', { precision: 10, scale: 2 }),
    minOrderValue: decimal('min_order_value', { precision: 10, scale: 2 }).notNull().default('0.00'),
    maxUsageCount: int('max_usage_count'),
    usagePerUser: int('usage_per_user').notNull().default(1),
    currentUsage: int('current_usage').notNull().default(0),
    budget: decimal('budget', { precision: 12, scale: 2 }),
    budgetUtilized: decimal('budget_utilized', { precision: 12, scale: 2 }).notNull().default('0.00'),
    totalSales: decimal('total_sales', { precision: 12, scale: 2 }).notNull().default('0.00'),
    // datetime, not timestamp: coupon end dates can exceed MySQL's 2038 TIMESTAMP limit
    startDate: datetime('start_date', { mode: 'date' }).notNull(),
    endDate: datetime('end_date', { mode: 'date' }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    userGroups: mysqlEnum('user_groups', couponUserGroupValues).notNull().default('all'),
    allowedUserEmails: json('allowed_user_emails'),
    applicableProducts: json('applicable_products'),
    excludedProducts: json('excluded_products'),
    applicableCategories: json('applicable_categories'),
    createdBy: varchar('created_by', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => ({
    codeIdx: uniqueIndex('coupons_code_unique').on(table.code),
  })
);

export const couponUsages = mysqlTable(
  'coupon_usages',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    couponId: varchar('coupon_id', { length: 36 })
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: varchar('order_id', { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    orderValue: decimal('order_value', { precision: 10, scale: 2 }).notNull(),
    discountGiven: decimal('discount_given', { precision: 10, scale: 2 }).notNull(),
    usedAt: timestamp('used_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    couponOrderIdx: uniqueIndex('coupon_usages_coupon_order_unique').on(table.couponId, table.orderId),
  })
);

// Single-row table (id is always 'site') holding admin-editable branding/content.
export const siteSettings = mysqlTable('site_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  brandName: varchar('brand_name', { length: 120 }),
  // hex colours for the wordmark text gradient beside the logo
  brandColorStart: varchar('brand_color_start', { length: 7 }),
  brandColorEnd: varchar('brand_color_end', { length: 7 }),
  heroTagline: varchar('hero_tagline', { length: 160 }),
  heroHeading: varchar('hero_heading', { length: 255 }),
  heroSubheading: text('hero_subheading'),
  badges: json('badges'),
  // [{ badge, name, tagline, description, features[], weight, image, backgroundImage }]
  heroSlides: json('hero_slides'),
  logoUrl: text('logo_url'),
  fontFamily: varchar('font_family', { length: 120 }),
  fontFileUrl: text('font_file_url'),
  contactPhone: varchar('contact_phone', { length: 30 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  footerDescription: text('footer_description'),
  footerCopyright: varchar('footer_copyright', { length: 255 }),
  ...timestamps,
});

export const wishlistItems = mysqlTable(
  'wishlist_items',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    userProductIdx: uniqueIndex('wishlist_user_product_unique').on(table.userId, table.productId),
  })
);
