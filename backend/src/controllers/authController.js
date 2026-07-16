import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { createId } from '../utils/ids.js';
import { serializeUser } from '../utils/serializers.js';

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(10).max(20).optional(),
  alternatePhone: z.string().min(10).max(20).optional(),
  role: z.enum(['user', 'business']).optional(),
  address: z
    .object({
      street: z.string().optional(),
      locality: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const userId = createId();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });

  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  await db
    .insert(users)
    .values({
      id: userId,
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      phone: input.phone ?? null,
      alternatePhone: input.alternatePhone ?? null,
      role: input.role ?? 'user',
      addressStreet: input.address?.street ?? null,
      addressLocality: input.address?.locality ?? null,
      addressCity: input.address?.city ?? null,
      addressState: input.address?.state ?? null,
      addressPincode: input.address?.pincode ?? null,
    });

  const createdUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!createdUser) {
    throw new Error('Failed to create user');
  }

  const token = signAccessToken({
    userId: createdUser.id,
    role: createdUser.role,
  });

  res.status(201).json({
    token,
    user: serializeUser(createdUser),
  });
});

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);

  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await comparePassword(input.password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signAccessToken({
    userId: user.id,
    role: user.role,
  });

  res.json({
    token,
    user: serializeUser(user),
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.auth.userId),
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(serializeUser(user));
});

export const refreshToken = asyncHandler(async (req, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.auth.userId),
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const token = signAccessToken({
    userId: user.id,
    role: user.role,
  });

  res.json({
    token,
    user: serializeUser(user),
  });
});
