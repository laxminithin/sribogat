import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { orderItems, orders, products, users } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CouponError, recordCouponUsage, validateCouponForCart } from '../utils/coupons.js';
import { createId } from '../utils/ids.js';
import { serializeOrder, serializeProduct } from '../utils/serializers.js';

const orderItemSchema = z.object({
  product: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1),
  price: z.coerce.number().nonnegative(),
  name: z.string().min(1).optional(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  subtotal: z.coerce.number().nonnegative(),
  discountedSubtotal: z.coerce.number().nonnegative().optional(),
  discount: z.coerce.number().nonnegative().optional(),
  totalAmount: z.coerce.number().nonnegative().optional(),
  total: z.coerce.number().nonnegative().optional(),
  shippingCharge: z.coerce.number().nonnegative().optional(),
  shipping: z.coerce.number().nonnegative().optional(),
  couponCode: z.string().nullable().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.enum(['pending', 'initiated', 'completed', 'failed', 'refunded']).optional(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  shippingAddress: z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(1),
    phone: z.string().optional().nullable(),
  }),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

const adminNoteSchema = z.object({
  note: z.string().trim().min(1).max(1000),
});

function toMoney(value) {
  return Number(value ?? 0).toFixed(2);
}

function round2(value) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_CHARGE = 50;

function buildOrderNumber(sequence) {
  return `ORD-${String(sequence).padStart(6, '0')}`;
}

async function fetchOrderWithItems(orderId, userId = null) {
  const order = await db.query.orders.findFirst({
    where: userId
      ? and(eq(orders.id, orderId), eq(orders.userId, userId))
      : eq(orders.id, orderId),
  });

  if (!order) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, order.userId),
  });
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.name));
  const productIds = items.map((item) => item.productId);
  const productRows = productIds.length
    ? await db.select().from(products).where(inArray(products.id, productIds))
    : [];
  const productMap = new Map(productRows.map((product) => [product.id, product]));

  const serializedItems = items.map((item) => ({
    id: item.id,
    _id: item.id,
    quantity: item.quantity,
    price: Number(item.unitPrice),
    basePrice: item.basePrice == null ? null : Number(item.basePrice),
    gst: item.gstAmount == null ? 0 : Number(item.gstAmount),
    gstAmount: item.gstAmount == null ? 0 : Number(item.gstAmount),
    gstRate: item.gstRate == null ? 0 : Number(item.gstRate),
    hsn: item.hsn,
    lineTotal: Number(item.lineTotal),
    name: item.name,
    product: serializeProduct(productMap.get(item.productId)),
  }));

  return {
    ...serializeOrder(order, serializedItems),
    user: user ? { id: user.id, _id: user.id, name: user.name, email: user.email, phone: user.phone } : null,
  };
}

function normalizeOrderSearch(order, query) {
  const q = query.toLowerCase();
  return [
    order.orderNumber,
    order.shippingName,
    order.shippingPhone,
    order.couponCode,
  ]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(q));
}

export const listMyOrders = asyncHandler(async (req, res) => {
  const rows = await db.select().from(orders).where(eq(orders.userId, req.auth.userId)).orderBy(desc(orders.createdAt));

  const fullOrders = await Promise.all(rows.map((row) => fetchOrderWithItems(row.id, req.auth.userId)));
  res.json(fullOrders.filter(Boolean));
});

export const getOrderById = asyncHandler(async (req, res) => {
  const isAdmin = req.auth.role === 'admin';
  const order = await fetchOrderWithItems(req.params.id, isAdmin ? null : req.auth.userId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  res.json({
    order,
  });
});

export const createOrder = asyncHandler(async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const currentCount = await db.select().from(orders);
  const nextSequence = currentCount.length + 1;
  const orderId = createId();
  const orderNumber = buildOrderNumber(nextSequence);
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.auth.userId),
  });

  // Price everything server-side from the DB so GST is applied exactly once,
  // regardless of what the client sends.
  const itemRows = [];
  let subtotal = 0;

  for (const item of input.items) {
    const productId = item.productId ?? item.product;
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return res.status(400).json({ error: `Product not found: ${productId}` });
    }

    const basePrice = Number(product.price);
    const gstRate = Number(product.gstRate ?? 0);
    const gstAmount = round2((basePrice * gstRate) / 100);
    const unitPrice = round2(basePrice + gstAmount);
    const lineTotal = round2(unitPrice * item.quantity);
    subtotal = round2(subtotal + lineTotal);

    itemRows.push({
      id: createId(),
      orderId,
      productId,
      name: item.name ?? product.name,
      quantity: item.quantity,
      basePrice: toMoney(basePrice),
      unitPrice: toMoney(unitPrice),
      gstRate: toMoney(gstRate),
      gstAmount: toMoney(gstAmount),
      hsn: product.hsn,
      lineTotal: toMoney(lineTotal),
    });
  }

  // The discount comes only from a server-validated coupon — never from the
  // client, which could otherwise name any amount.
  let discount = 0;
  let appliedCoupon = null;

  if (input.couponCode) {
    try {
      const result = await validateCouponForCart({
        code: input.couponCode,
        userId: req.auth.userId,
        cartTotal: subtotal,
        items: itemRows.map((row) => ({ productId: row.productId, lineTotal: Number(row.lineTotal) })),
      });
      appliedCoupon = result.coupon;
      discount = result.discount;
    } catch (error) {
      if (error instanceof CouponError) {
        return res.status(error.status).json({ error: error.message });
      }
      throw error;
    }
  }

  const discountedSubtotal = round2(subtotal - discount);
  const shippingCharge = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
  const totalAmount = round2(discountedSubtotal + shippingCharge);

  await db
    .insert(orders)
    .values({
      id: orderId,
      orderNumber,
      userId: req.auth.userId,
      subtotal: toMoney(subtotal),
      discountedSubtotal: toMoney(discountedSubtotal),
      discount: toMoney(discount),
      totalAmount: toMoney(totalAmount),
      shippingCharge: toMoney(shippingCharge),
      couponCode: appliedCoupon?.code ?? null,
      paymentMethod: input.paymentMethod ?? 'paypal',
      paymentStatus: input.paymentStatus ?? 'pending',
      status: input.status ?? 'pending',
      shippingName: user?.name || 'Customer',
      shippingPhone: input.shippingAddress.phone ?? user?.phone ?? null,
      shippingAddress: input.shippingAddress.address,
      shippingCity: input.shippingAddress.city,
      shippingState: input.shippingAddress.state,
      shippingPincode: input.shippingAddress.pincode,
    });

  await db.insert(orderItems).values(itemRows);

  if (appliedCoupon) {
    try {
      await recordCouponUsage({
        coupon: appliedCoupon,
        userId: req.auth.userId,
        orderId,
        orderValue: totalAmount,
        discount,
      });
    } catch (error) {
      // A concurrent order exhausted the coupon between validation and here —
      // undo this order (cascade removes its items) instead of honoring a
      // discount that no longer exists.
      await db.delete(orders).where(eq(orders.id, orderId));
      if (error instanceof CouponError) {
        return res.status(error.status).json({ error: error.message });
      }
      throw error;
    }
  }

  const order = await fetchOrderWithItems(orderId, req.auth.userId);

  res.status(201).json({
    success: true,
    order,
  });
});

export const nextOrderNumber = asyncHandler(async (req, res) => {
  const count = (await db.select().from(orders)).length + 1;
  res.json({
    nextFormattedOrderNumber: String(count).padStart(6, '0'),
  });
});

export const listAdminOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const statusFilter = req.query.status?.toString();
  const search = req.query.search?.toString().trim();

  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  let fullOrders = await Promise.all(rows.map((row) => fetchOrderWithItems(row.id)));
  fullOrders = fullOrders.filter(Boolean);

  if (statusFilter) {
    fullOrders = fullOrders.filter((order) => order.status === statusFilter);
  }

  if (search) {
    fullOrders = fullOrders.filter((order) => normalizeOrderSearch(order, search));
  }

  const total = fullOrders.length;
  const start = (page - 1) * limit;
  const paginatedOrders = fullOrders.slice(start, start + limit);

  res.json({
    orders: paginatedOrders,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const getOrdersByDateRange = asyncHandler(async (req, res) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate.toString()) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate.toString()) : null;

  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const filtered = rows.filter((order) => {
    const createdAt = new Date(order.createdAt);
    if (startDate && createdAt < startDate) return false;
    if (endDate && createdAt > endDate) return false;
    return true;
  });

  const fullOrders = await Promise.all(filtered.map((row) => fetchOrderWithItems(row.id)));
  res.json(fullOrders.filter(Boolean));
});

export const getAdminOrderStats = asyncHandler(async (req, res) => {
  const rows = await db.select().from(orders);
  const totalOrders = rows.length;
  const totalRevenue = rows.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const pendingOrders = rows.filter((order) => order.status === 'pending').length;
  const completedOrders = rows.filter((order) => ['delivered', 'completed'].includes(order.status)).length;
  const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const statusBreakdown = rows.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    totalOrders,
    totalRevenue,
    pendingOrders,
    completedOrders,
    averageOrderValue,
    statusBreakdown,
    dailyStats: [],
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const input = updateOrderStatusSchema.parse(req.body);

  const existing = await db.query.orders.findFirst({
    where: eq(orders.id, req.params.id),
  });

  if (!existing) {
    return res.status(404).json({ error: 'Order not found' });
  }

  await db
    .update(orders)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, req.params.id));

  const order = await fetchOrderWithItems(req.params.id);
  res.json(order);
});

export const exportOrders = asyncHandler(async (req, res) => {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const lines = [
    ['orderNumber', 'customerName', 'status', 'paymentStatus', 'totalAmount', 'createdAt'].join(','),
    ...rows.map((row) =>
      [
        row.orderNumber,
        `"${row.shippingName}"`,
        row.status,
        row.paymentStatus,
        Number(row.totalAmount).toFixed(2),
        new Date(row.createdAt).toISOString(),
      ].join(',')
    ),
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.send(lines.join('\n'));
});

export const updateAdminNote = asyncHandler(async (req, res) => {
  const input = adminNoteSchema.parse({
    note: req.body.note ?? req.body.adminNote,
  });

  const existing = await db.query.orders.findFirst({
    where: eq(orders.id, req.params.id),
  });

  if (!existing) {
    return res.status(404).json({ error: 'Order not found' });
  }

  await db
    .update(orders)
    .set({
      adminNote: input.note,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, req.params.id));

  res.json({ success: true, adminNote: input.note });
});

export const getAdminNote = asyncHandler(async (req, res) => {
  const row = await db.query.orders.findFirst({
    where: eq(orders.id, req.params.id),
  });

  if (!row) {
    return res.status(404).json({ error: 'Order not found' });
  }

  res.json({
    adminNote: row.adminNote ?? '',
  });
});

export const bulkUpdateAdminNotes = asyncHandler(async (req, res) => {
  const updates = z
    .array(
      z.object({
        orderId: z.string().uuid(),
        note: z.string().min(1).max(1000),
      })
    )
    .parse(req.body.updates);

  for (const update of updates) {
    await db
      .update(orders)
      .set({
        adminNote: update.note,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, update.orderId));
  }

  res.json({ success: true });
});
