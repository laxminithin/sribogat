import { and, count, desc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { couponUsages, coupons, orders } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  CouponError,
  couponStatusReason,
  getUserGroup,
  normalizeCartItems,
  recordCouponUsage,
  validateCouponForCart,
} from '../utils/coupons.js';
import { createId } from '../utils/ids.js';
import { serializeCoupon } from '../utils/serializers.js';

const couponBaseSchema = z.object({
  title: z.string().trim().min(1).max(180),
  code: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code may only contain letters, numbers, hyphens and underscores')
    .transform((value) => value.toUpperCase()),
  description: z.string().trim().max(2000).optional().default(''),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().positive(),
  maxDiscountAmount: z.coerce.number().positive().nullish(),
  minOrderValue: z.coerce.number().nonnegative().optional().default(0),
  maxUsageCount: z.coerce.number().int().positive().nullish(),
  usagePerUser: z.coerce.number().int().positive().optional().default(1),
  budget: z.coerce.number().positive().nullish(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().optional().default(true),
  userGroups: z.enum(['all', 'new', 'premium']).optional().default('all'),
  allowedUserEmails: z.array(z.string().trim().toLowerCase().pipe(z.string().email())).optional().default([]),
  applicableProducts: z.array(z.string()).optional().default([]),
  excludedProducts: z.array(z.string()).optional().default([]),
  applicableCategories: z.array(z.string()).optional().default([]),
});

function checkCouponRules(data, ctx) {
  if (data.discountType === 'percentage' && data.discountValue > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Percentage cannot exceed 100' });
  }
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date must be after start date' });
  }
}

const createCouponSchema = couponBaseSchema.superRefine(checkCouponRules);
const updateCouponSchema = couponBaseSchema.partial().superRefine(checkCouponRules);

function couponFail(res, error) {
  if (error instanceof CouponError) {
    return res.status(error.status).json({ success: false, error: error.message });
  }
  throw error;
}

// Customer-facing coupon shape: same as serializeCoupon minus allowedUserEmails,
// which would otherwise leak other customers' emails to any authenticated user.
function toPublicCoupon(coupon) {
  const serialized = serializeCoupon(coupon);
  if (!serialized) return serialized;
  const { allowedUserEmails, ...rest } = serialized;
  return rest;
}

async function findCouponOr404(id, res) {
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
  if (!coupon) {
    res.status(404).json({ success: false, error: 'Coupon not found' });
    return null;
  }
  return coupon;
}

// ---------- Admin ----------

export const listCoupons = asyncHandler(async (req, res) => {
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  const now = new Date();

  res.json({
    success: true,
    data: rows.map(serializeCoupon),
    summary: {
      totalCoupons: rows.length,
      activeCoupons: rows.filter((coupon) => !couponStatusReason(coupon, now)).length,
      totalUsage: rows.reduce((sum, coupon) => sum + coupon.currentUsage, 0),
      totalBudgetUtilized: rows.reduce((sum, coupon) => sum + Number(coupon.budgetUtilized), 0),
    },
  });
});

export const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await findCouponOr404(req.params.id, res);
  if (!coupon) return;
  res.json({ success: true, data: serializeCoupon(coupon) });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const input = createCouponSchema.parse(req.body);

  const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, input.code) });
  if (existing) {
    return res.status(400).json({ success: false, error: 'Coupon code already exists' });
  }

  const id = createId();
  await db.insert(coupons).values({
    id,
    title: input.title,
    code: input.code,
    description: input.description,
    discountType: input.discountType,
    discountValue: input.discountValue.toFixed(2),
    maxDiscountAmount: input.maxDiscountAmount == null ? null : input.maxDiscountAmount.toFixed(2),
    minOrderValue: input.minOrderValue.toFixed(2),
    maxUsageCount: input.maxUsageCount ?? null,
    usagePerUser: input.usagePerUser,
    budget: input.budget == null ? null : input.budget.toFixed(2),
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: input.isActive,
    userGroups: input.userGroups,
    allowedUserEmails: input.allowedUserEmails,
    applicableProducts: input.applicableProducts,
    excludedProducts: input.excludedProducts,
    applicableCategories: input.applicableCategories,
    createdBy: req.auth.userId,
  });

  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
  res.status(201).json({ success: true, message: 'Coupon created successfully', data: serializeCoupon(coupon) });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await findCouponOr404(req.params.id, res);
  if (!coupon) return;

  const input = updateCouponSchema.parse(req.body);

  if (input.code && input.code !== coupon.code) {
    const conflict = await db.query.coupons.findFirst({
      where: and(eq(coupons.code, input.code), ne(coupons.id, coupon.id)),
    });
    if (conflict) {
      return res.status(400).json({ success: false, error: 'Coupon code already exists' });
    }
  }

  const startDate = input.startDate ?? coupon.startDate;
  const endDate = input.endDate ?? coupon.endDate;
  if (endDate <= startDate) {
    return res.status(400).json({ success: false, error: 'End date must be after start date' });
  }

  const updates = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.code !== undefined) updates.code = input.code;
  if (input.description !== undefined) updates.description = input.description;
  if (input.discountType !== undefined) updates.discountType = input.discountType;
  if (input.discountValue !== undefined) updates.discountValue = input.discountValue.toFixed(2);
  if (input.maxDiscountAmount !== undefined) {
    updates.maxDiscountAmount = input.maxDiscountAmount == null ? null : input.maxDiscountAmount.toFixed(2);
  }
  if (input.minOrderValue !== undefined) updates.minOrderValue = input.minOrderValue.toFixed(2);
  if (input.maxUsageCount !== undefined) updates.maxUsageCount = input.maxUsageCount ?? null;
  if (input.usagePerUser !== undefined) updates.usagePerUser = input.usagePerUser;
  if (input.budget !== undefined) updates.budget = input.budget == null ? null : input.budget.toFixed(2);
  if (input.startDate !== undefined) updates.startDate = input.startDate;
  if (input.endDate !== undefined) updates.endDate = input.endDate;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.userGroups !== undefined) updates.userGroups = input.userGroups;
  if (input.allowedUserEmails !== undefined) updates.allowedUserEmails = input.allowedUserEmails;
  if (input.applicableProducts !== undefined) updates.applicableProducts = input.applicableProducts;
  if (input.excludedProducts !== undefined) updates.excludedProducts = input.excludedProducts;
  if (input.applicableCategories !== undefined) updates.applicableCategories = input.applicableCategories;

  await db.update(coupons).set(updates).where(eq(coupons.id, coupon.id));

  const updated = await db.query.coupons.findFirst({ where: eq(coupons.id, coupon.id) });
  res.json({ success: true, message: 'Coupon updated successfully', data: serializeCoupon(updated) });
});

export const toggleCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await findCouponOr404(req.params.id, res);
  if (!coupon) return;

  const isActive = !coupon.isActive;
  await db.update(coupons).set({ isActive, updatedAt: new Date() }).where(eq(coupons.id, coupon.id));

  res.json({
    success: true,
    message: `Coupon ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: { isActive },
  });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await findCouponOr404(req.params.id, res);
  if (!coupon) return;

  if (coupon.currentUsage > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete coupon that has been used. Consider deactivating it instead.',
    });
  }

  await db.delete(coupons).where(eq(coupons.id, coupon.id));
  res.json({ success: true, message: 'Coupon deleted successfully' });
});

export const getCouponAnalytics = asyncHandler(async (req, res) => {
  const coupon = await findCouponOr404(req.params.id, res);
  if (!coupon) return;

  const usages = await db
    .select()
    .from(couponUsages)
    .where(eq(couponUsages.couponId, coupon.id))
    .orderBy(desc(couponUsages.usedAt));

  res.json({
    success: true,
    data: {
      totalUsage: coupon.currentUsage,
      totalSales: Number(coupon.totalSales),
      budgetUtilized: Number(coupon.budgetUtilized),
      uniqueUsers: new Set(usages.map((usage) => usage.userId)).size,
      recentUsage: usages.slice(0, 10).map((usage) => ({
        orderId: usage.orderId,
        userId: usage.userId,
        orderValue: Number(usage.orderValue),
        discountGiven: Number(usage.discountGiven),
        usedAt: usage.usedAt,
      })),
    },
  });
});

// ---------- Customer ----------

export const getAvailableCoupons = asyncHandler(async (req, res) => {
  const cartTotal = Number(req.query.cartTotal ?? 0);
  const { user, group } = await getUserGroup(req.auth.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const rows = await db.select().from(coupons).orderBy(desc(coupons.discountValue));
  const now = new Date();
  const email = user.email.toLowerCase();

  // How many times this user has already redeemed each coupon, so we can hide
  // ones they've exhausted (they'd otherwise show as usable then fail at checkout).
  const usageRows = await db
    .select({ couponId: couponUsages.couponId, value: count() })
    .from(couponUsages)
    .where(eq(couponUsages.userId, user.id))
    .groupBy(couponUsages.couponId);
  const usageByCoupon = new Map(usageRows.map((row) => [row.couponId, Number(row.value)]));

  const available = rows
    .filter((coupon) => {
      if (couponStatusReason(coupon, now)) return false;
      if (coupon.userGroups !== 'all' && coupon.userGroups !== group) return false;
      const allowed = (coupon.allowedUserEmails ?? []).map((value) => String(value).toLowerCase());
      if (allowed.length && !allowed.includes(email)) return false;
      if ((usageByCoupon.get(coupon.id) ?? 0) >= coupon.usagePerUser) return false;
      return true;
    })
    .map((coupon) => {
      const meetsMinOrder = cartTotal >= Number(coupon.minOrderValue);
      return {
        ...toPublicCoupon(coupon),
        canUse: meetsMinOrder,
        reason: meetsMinOrder ? null : `Minimum order value: ₹${Number(coupon.minOrderValue)}`,
      };
    });

  res.json({ success: true, data: available, userGroup: group });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal, cartItems } = req.body;

  if (!code || cartTotal == null) {
    return res.status(400).json({ success: false, error: 'Coupon code and cart total are required' });
  }

  try {
    // Preview only — final discount is recomputed from DB prices at order creation.
    const { coupon, discount, applicableAmount } = await validateCouponForCart({
      code,
      userId: req.auth.userId,
      cartTotal: Number(cartTotal),
      items: normalizeCartItems(cartItems),
    });

    res.json({
      success: true,
      message: 'Coupon is valid',
      data: {
        coupon: toPublicCoupon(coupon),
        discount,
        applicableAmount,
        finalAmount: Math.max(0, Number(cartTotal) - discount),
      },
    });
  } catch (error) {
    couponFail(res, error);
  }
});

export const getCouponSuggestions = asyncHandler(async (req, res) => {
  const { cartTotal, cartItems } = req.body;

  if (cartTotal == null) {
    return res.status(400).json({ success: false, error: 'Cart total is required' });
  }

  const rows = await db.select().from(coupons);
  const items = normalizeCartItems(cartItems);
  const suggestions = [];

  for (const coupon of rows) {
    try {
      const { discount } = await validateCouponForCart({
        code: coupon.code,
        userId: req.auth.userId,
        cartTotal: Number(cartTotal),
        items,
      });
      suggestions.push({
        ...toPublicCoupon(coupon),
        discount,
        newTotal: Math.max(0, Number(cartTotal) - discount),
        savings: discount,
        canApply: true,
      });
    } catch (error) {
      if (!(error instanceof CouponError)) throw error;
    }
  }

  suggestions.sort((a, b) => b.discount - a.discount);

  res.json({
    success: true,
    data: {
      suggestions: suggestions.slice(0, 3),
      bestCoupon: suggestions[0] || null,
      totalSuggestions: suggestions.length,
    },
  });
});

// Kept for the existing checkout flow, but usage is now recorded server-side
// during order creation — this endpoint just confirms it (idempotent).
export const updateCouponUsage = asyncHandler(async (req, res) => {
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, req.params.couponId) });
  if (!coupon) {
    return res.status(404).json({ success: false, error: 'Coupon not found' });
  }

  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'orderId is required' });
  }

  const existing = await db.query.couponUsages.findFirst({
    where: and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.orderId, orderId)),
  });
  if (existing) {
    return res.json({ success: true, message: 'Coupon usage already recorded' });
  }

  // Only record if this order really belongs to the caller and used this coupon.
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, req.auth.userId)),
  });
  if (!order || order.couponCode !== coupon.code) {
    return res.status(400).json({ success: false, error: 'Order does not match this coupon' });
  }

  try {
    await recordCouponUsage({
      coupon,
      userId: req.auth.userId,
      orderId,
      orderValue: Number(order.totalAmount),
      discount: Number(order.discount),
    });
  } catch (error) {
    return couponFail(res, error);
  }

  res.json({ success: true, message: 'Coupon usage updated successfully' });
});
