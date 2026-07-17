import { and, count, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { couponUsages, coupons, orders, products, users } from '../db/schema.js';
import { createId } from './ids.js';
import { toArray } from './requestParsing.js';

export class CouponError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function round2(value) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

export function couponStatusReason(coupon, now = new Date()) {
  if (!coupon.isActive) return 'Coupon is inactive';
  if (now < coupon.startDate) return 'Coupon is not yet active';
  if (now > coupon.endDate) return 'Coupon has expired';
  if (coupon.maxUsageCount != null && coupon.currentUsage >= coupon.maxUsageCount) {
    return 'Coupon usage limit reached';
  }
  if (coupon.budget != null && Number(coupon.budgetUtilized) >= Number(coupon.budget)) {
    return 'Coupon budget exhausted';
  }
  return null;
}

export async function getUserGroup(userId) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return { user: null, group: 'all' };

  // ponytail: no membership tier in the SQL schema — 'premium' maps to business accounts
  if (user.role === 'business') return { user, group: 'premium' };

  const [existingOrder] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.userId, userId))
    .limit(1);

  return { user, group: existingOrder ? 'all' : 'new' };
}

// Normalizes cart items from the various shapes the frontend sends.
export function normalizeCartItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const productId =
        item.productId ||
        item.product?._id ||
        item.product?.id ||
        (typeof item.product === 'string' ? item.product : null) ||
        item._id ||
        item.id ||
        null;
      const quantity = Number(item.quantity ?? 1) || 1;
      const price = Number(item.price ?? item.product?.price ?? 0) || 0;
      return { productId, lineTotal: round2(price * quantity) };
    })
    .filter((item) => item.productId);
}

// Portion of the cart the coupon applies to, honoring product/category restrictions.
async function eligibleAmount(coupon, cartTotal, items) {
  const applicableProducts = toArray(coupon.applicableProducts);
  const excludedProducts = toArray(coupon.excludedProducts);
  const applicableCategories = toArray(coupon.applicableCategories);

  if (!applicableProducts.length && !excludedProducts.length && !applicableCategories.length) {
    return round2(cartTotal);
  }

  if (!items.length) {
    throw new CouponError('This coupon applies to specific products; cart items are required');
  }

  let categoryByProduct = new Map();
  if (applicableCategories.length) {
    const rows = await db
      .select({ id: products.id, categoryId: products.categoryId })
      .from(products)
      .where(inArray(products.id, items.map((item) => item.productId)));
    categoryByProduct = new Map(rows.map((row) => [row.id, row.categoryId]));
  }

  let total = 0;
  for (const item of items) {
    if (excludedProducts.includes(item.productId)) continue;
    if (applicableProducts.length || applicableCategories.length) {
      const matchesProduct = applicableProducts.includes(item.productId);
      const matchesCategory = applicableCategories.includes(categoryByProduct.get(item.productId));
      if (!matchesProduct && !matchesCategory) continue;
    }
    total += item.lineTotal;
  }

  return round2(total);
}

export function computeDiscount(coupon, amount) {
  let discount =
    coupon.discountType === 'percentage'
      ? (amount * Number(coupon.discountValue)) / 100
      : Number(coupon.discountValue);

  if (coupon.maxDiscountAmount != null) {
    discount = Math.min(discount, Number(coupon.maxDiscountAmount));
  }

  if (coupon.budget != null) {
    // ponytail: cap at remaining budget instead of rejecting, so the last order still succeeds
    discount = Math.min(discount, Number(coupon.budget) - Number(coupon.budgetUtilized));
  }

  return round2(Math.max(0, Math.min(discount, amount)));
}

// Full business-rule validation. Throws CouponError with a user-facing reason.
export async function validateCouponForCart({ code, userId, cartTotal, items = [] }) {
  const coupon = await db.query.coupons.findFirst({
    where: eq(coupons.code, String(code).trim().toUpperCase()),
  });
  if (!coupon) throw new CouponError('Invalid coupon code', 404);

  const reason = couponStatusReason(coupon);
  if (reason) throw new CouponError(reason);

  const { user, group } = await getUserGroup(userId);
  if (!user) throw new CouponError('User not found', 404);

  const allowedEmails = toArray(coupon.allowedUserEmails).map((email) => email.toLowerCase());
  if (allowedEmails.length && !allowedEmails.includes(user.email.toLowerCase())) {
    throw new CouponError('This coupon is not available for your account', 403);
  }

  if (coupon.userGroups !== 'all' && coupon.userGroups !== group) {
    throw new CouponError(
      coupon.userGroups === 'new'
        ? 'This coupon is only for new customers'
        : 'This coupon is only for premium members'
    );
  }

  const [{ value: userUsage }] = await db
    .select({ value: count() })
    .from(couponUsages)
    .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, userId)));
  if (userUsage >= coupon.usagePerUser) {
    throw new CouponError('You have already used this coupon the maximum number of times');
  }

  if (Number(cartTotal) < Number(coupon.minOrderValue)) {
    throw new CouponError(`Minimum order value of ₹${Number(coupon.minOrderValue)} required`);
  }

  const applicableAmount = await eligibleAmount(coupon, cartTotal, items);
  if (applicableAmount <= 0) {
    throw new CouponError('No items in your cart are eligible for this coupon');
  }

  const discount = computeDiscount(coupon, applicableAmount);
  if (discount <= 0) throw new CouponError('Coupon budget exhausted');

  return { coupon, discount, applicableAmount };
}

// Records usage atomically; the conditional update guards against concurrent
// orders exceeding maxUsageCount. Duplicate (coupon, order) pairs are rejected
// by the unique index.
export async function recordCouponUsage({ coupon, userId, orderId, orderValue, discount }) {
  const [result] = await db
    .update(coupons)
    .set({
      currentUsage: sql`${coupons.currentUsage} + 1`,
      budgetUtilized: sql`${coupons.budgetUtilized} + ${Number(discount).toFixed(2)}`,
      totalSales: sql`${coupons.totalSales} + ${Number(orderValue).toFixed(2)}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(coupons.id, coupon.id),
        or(isNull(coupons.maxUsageCount), lt(coupons.currentUsage, coupons.maxUsageCount))
      )
    );

  if (!result.affectedRows) {
    throw new CouponError('Coupon usage limit reached');
  }

  await db.insert(couponUsages).values({
    id: createId(),
    couponId: coupon.id,
    userId,
    orderId,
    orderValue: Number(orderValue).toFixed(2),
    discountGiven: Number(discount).toFixed(2),
  });
}
