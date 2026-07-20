import path from 'node:path';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { siteSettings } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const SETTINGS_ID = 'site';

// multipart form fields arrive with CRLF line endings — normalize to \n
const textField = (max) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((value) => value.replace(/\r\n/g, '\n'));

const slideSchema = z.object({
  badge: z.string().trim().max(60).default(''),
  name: z.string().trim().min(1).max(180),
  tagline: z.string().trim().max(255).default(''),
  description: z.string().trim().max(2000).default(''),
  features: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  weight: z.string().trim().max(30).default(''),
  // '' = use the built-in cycled accent gradient
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .or(z.literal(''))
    .default(''),
  // stored /uploads paths of previously saved images; new files override by index
  image: z.string().trim().max(500).default(''),
  backgroundImage: z.string().trim().max(500).default(''),
});

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/);

const updateSettingsSchema = z.object({
  brandName: z.string().trim().min(1).max(120).optional(),
  brandColorStart: hexColor.optional(),
  brandColorEnd: hexColor.optional(),
  heroTagline: textField(160).optional(),
  heroHeading: textField(255).optional(),
  heroSubheading: textField(2000).optional(),
  badges: z.array(z.string().trim().min(1).max(60)).max(6).optional(),
  heroSlides: z.array(slideSchema).max(6).optional(),
  fontFamily: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  contactEmail: z.string().trim().max(255).optional(),
  footerDescription: textField(2000).optional(),
  footerCopyright: textField(255).optional(),
});

const JSON_FIELDS = ['badges', 'heroSlides'];

function serializeSettings(row) {
  return {
    brandName: row?.brandName ?? null,
    brandColorStart: row?.brandColorStart ?? null,
    brandColorEnd: row?.brandColorEnd ?? null,
    heroTagline: row?.heroTagline ?? null,
    heroHeading: row?.heroHeading ?? null,
    heroSubheading: row?.heroSubheading ?? null,
    badges: row?.badges ?? null,
    heroSlides: row?.heroSlides ?? null,
    logoUrl: row?.logoUrl ?? null,
    fontFamily: row?.fontFamily ?? null,
    fontFileUrl: row?.fontFileUrl ?? null,
    contactPhone: row?.contactPhone ?? null,
    contactEmail: row?.contactEmail ?? null,
    footerDescription: row?.footerDescription ?? null,
    footerCopyright: row?.footerCopyright ?? null,
  };
}

async function fetchSettings() {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.id, SETTINGS_ID)).limit(1);
  return rows[0] ?? null;
}

export const getSettings = asyncHandler(async (req, res) => {
  res.json(serializeSettings(await fetchSettings()));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const body = { ...req.body };

  for (const field of JSON_FIELDS) {
    if (typeof body[field] === 'string') {
      try {
        body[field] = JSON.parse(body[field]);
      } catch {
        return res.status(400).json({ error: `${field} must be valid JSON` });
      }
    }
  }

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid settings payload', details: parsed.error.flatten().fieldErrors });
  }

  const values = { ...parsed.data };

  // settingsUpload.any() → req.files is an array; index by field name
  const filesByField = {};
  for (const file of req.files ?? []) {
    filesByField[file.fieldname] = file;
  }
  const toUrl = (file) => `/uploads/settings/${path.basename(file.filename)}`;

  if (filesByField.logo) {
    values.logoUrl = toUrl(filesByField.logo);
  }

  if (filesByField.font) {
    values.fontFileUrl = toUrl(filesByField.font);
    // custom font file wins over any preset
    values.fontFamily = '';
  } else if (values.fontFamily !== undefined) {
    // preset (or default) picked without a new file: drop any previously uploaded font
    values.fontFileUrl = null;
  }

  if (values.heroSlides) {
    values.heroSlides = values.heroSlides.map((slide, index) => ({
      ...slide,
      image: filesByField[`slideImage_${index}`] ? toUrl(filesByField[`slideImage_${index}`]) : slide.image,
      backgroundImage: filesByField[`slideBg_${index}`] ? toUrl(filesByField[`slideBg_${index}`]) : slide.backgroundImage,
    }));
  }

  values.updatedAt = new Date();

  await db
    .insert(siteSettings)
    .values({ id: SETTINGS_ID, ...values })
    .onDuplicateKeyUpdate({ set: values });

  res.json(serializeSettings(await fetchSettings()));
});

// Deleting the row restores defaults: null fields fall back to the frontend's
// built-in DEFAULT_SETTINGS. Uploaded files are left on disk (still referenced
// until reset; harmless afterwards).
export const resetSettings = asyncHandler(async (req, res) => {
  await db.delete(siteSettings).where(eq(siteSettings.id, SETTINGS_ID));
  res.json(serializeSettings(null));
});
