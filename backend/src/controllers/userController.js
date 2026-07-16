import crypto from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { me, login, register } from './authController.js';
import { db } from '../db/client.js';
import { orders, products, users, wishlistItems } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { serializeProduct, serializeUser } from '../utils/serializers.js';

export { login, me, register };

export const adminLogin = async (req, res, next) => {
  try {
    await login(
      req,
      {
        json(payload) {
          if (payload?.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
          }

          return res.json(payload);
        },
        status(code) {
          return res.status(code);
        },
      },
      next
    );
  } catch (error) {
    next(error);
  }
};

const updateProfileSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(10).max(20),
  alternatePhone: z.string().max(20).optional().or(z.literal('')),
  address: z.object({
    street: z.string().min(1),
    locality: z.string().optional().or(z.literal('')),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(6).max(10),
  }),
});

const adminUpdateCustomerSchema = updateProfileSchema.partial().extend({
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin', 'business']).optional(),
});

export const updateProfile = asyncHandler(async (req, res) => {
  const input = updateProfileSchema.parse(req.body);

  const existing = await db.query.users.findFirst({
    where: eq(users.id, req.auth.userId),
  });

  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  await db
    .update(users)
    .set({
      name: input.name,
      phone: input.phone,
      alternatePhone: input.alternatePhone || null,
      addressStreet: input.address.street,
      addressLocality: input.address.locality || null,
      addressCity: input.address.city,
      addressState: input.address.state,
      addressPincode: input.address.pincode,
      updatedAt: new Date(),
    })
    .where(eq(users.id, req.auth.userId));

  const updated = await db.query.users.findFirst({
    where: eq(users.id, req.auth.userId),
  });

  res.json(serializeUser(updated));
});

export const listUsers = asyncHandler(async (req, res) => {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  res.json(rows.map(serializeUser));
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.params.id),
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(serializeUser(user));
});

export const updateCustomerByAdmin = asyncHandler(async (req, res) => {
  const input = adminUpdateCustomerSchema.parse(req.body);
  const existing = await db.query.users.findFirst({
    where: eq(users.id, req.params.userId),
  });

  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  await db
    .update(users)
    .set({
      name: input.name,
      email: input.email?.toLowerCase(),
      phone: input.phone,
      alternatePhone: input.alternatePhone || null,
      role: input.role,
      addressStreet: input.address?.street,
      addressLocality: input.address?.locality || null,
      addressCity: input.address?.city,
      addressState: input.address?.state,
      addressPincode: input.address?.pincode,
      updatedAt: new Date(),
    })
    .where(eq(users.id, req.params.userId));

  const updated = await db.query.users.findFirst({
    where: eq(users.id, req.params.userId),
  });

  res.json(serializeUser(updated));
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const rows = await db.select().from(orders).where(eq(orders.userId, req.params.id)).orderBy(desc(orders.createdAt));
  res.json(rows);
});

export const getUserAnalytics = asyncHandler(async (req, res) => {
  const orderRows = await db.select().from(orders).where(eq(orders.userId, req.params.id)).orderBy(desc(orders.createdAt));
  const wishlistRows = await db.select().from(wishlistItems).where(eq(wishlistItems.userId, req.params.id));

  const monthlySpending = {};
  for (const order of orderRows) {
    const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
    monthlySpending[month] = (monthlySpending[month] ?? 0) + Number(order.totalAmount);
  }

  const totalSpent = orderRows.reduce((sum, order) => sum + Number(order.totalAmount), 0);

  res.json({
    totalOrders: orderRows.length,
    totalSpent,
    lastOrderDate: orderRows[0]?.createdAt ?? null,
    wishlistCount: wishlistRows.length,
    monthlySpending,
  });
});

export const getWishlist = asyncHandler(async (req, res) => {
  const rows = await db.select().from(wishlistItems).where(eq(wishlistItems.userId, req.auth.userId));
  const productIds = rows.map((row) => row.productId);
  const productRows = productIds.length
    ? await db.select().from(products).where(inArray(products.id, productIds))
    : [];

  res.json(productRows.map(serializeProduct));
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const product = await db.query.products.findFirst({
    where: eq(products.id, req.params.productId),
  });

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const existing = await db.query.wishlistItems.findFirst({
    where: and(eq(wishlistItems.userId, req.auth.userId), eq(wishlistItems.productId, req.params.productId)),
  });

  if (!existing) {
    await db.insert(wishlistItems).values({
      id: crypto.randomUUID(),
      userId: req.auth.userId,
      productId: req.params.productId,
    });
  }

  res.status(201).json({ success: true });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, req.auth.userId), eq(wishlistItems.productId, req.params.productId)));

  res.json({ success: true });
});
