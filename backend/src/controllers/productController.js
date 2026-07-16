import path from 'node:path';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { categories, orderItems, products } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createId } from '../utils/ids.js';
import { serializeProduct } from '../utils/serializers.js';
import { slugify } from '../utils/slug.js';
import { toArray, toBoolean } from '../utils/requestParsing.js';

const productStatusSchema = z.enum(['draft', 'active', 'inactive']);

const createCategorySchema = z.object({
  name: z.string().min(2).max(120),
  subcategories: z.array(z.string().min(1).max(120)).optional(),
});

function toMoney(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric) || numeric < 0) return Number(fallback).toFixed(2);
  return numeric.toFixed(2);
}

function toImagePath(file) {
  return `/uploads/products/${path.basename(file.filename)}`;
}

async function getCategoryMap() {
  const rows = await db.select().from(categories);
  return new Map(
    rows.map((row) => [
      row.id,
      {
        ...row,
        subcategories: toArray(row.subcategories),
      },
    ])
  );
}

async function attachCategoryMetadata(productRows) {
  const categoryMap = await getCategoryMap();
  return productRows.map((product) => {
    const category = categoryMap.get(product.categoryId);

    return serializeProduct({
      ...product,
      categoryName: category?.name ?? '',
    });
  });
}

async function getCategoryById(id) {
  const row = await db.query.categories.findFirst({
    where: eq(categories.id, id),
  });

  return row
    ? {
        ...row,
        subcategories: toArray(row.subcategories),
      }
    : null;
}

async function getProductByIdRecord(id) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
  });
}

async function resolveCategory({ categoryId, categoryName, subcategory }) {
  if (categoryId) {
    const category = await getCategoryById(categoryId);

    if (!category) {
      throw Object.assign(new Error('Invalid categoryId'), { statusCode: 400 });
    }

    if (subcategory && !category.subcategories?.includes(subcategory)) {
      await db
        .update(categories)
        .set({
          subcategories: [...(category.subcategories ?? []), subcategory],
          updatedAt: new Date(),
        })
        .where(eq(categories.id, category.id));
    }

    return category;
  }

  if (!categoryName) {
    return null;
  }

  const normalizedName = categoryName.trim();
  const existingRow = await db.query.categories.findFirst({
    where: eq(categories.name, normalizedName),
  });
  const existing = existingRow
    ? {
        ...existingRow,
        subcategories: toArray(existingRow.subcategories),
      }
    : null;

  if (existing) {
    if (subcategory && !existing.subcategories?.includes(subcategory)) {
      await db
        .update(categories)
        .set({
          subcategories: [...(existing.subcategories ?? []), subcategory],
          updatedAt: new Date(),
        })
        .where(eq(categories.id, existing.id));
    }

    return existing;
  }

  const createdId = createId();

  await db
    .insert(categories)
    .values({
      id: createdId,
      name: normalizedName,
      slug: slugify(normalizedName),
      subcategories: subcategory ? [subcategory] : [],
    });

  const created = await getCategoryById(createdId);

  return created;
}

function parseProductPayload(body, files = []) {
  const parsed = z
    .object({
      name: z.string().min(2).max(180),
      description: z.string().min(10),
      unit: z.string().min(1).max(30).default('piece'),
      price: z.coerce.number().positive(),
      originalPrice: z.union([z.coerce.number().positive(), z.literal(''), z.undefined()]).optional(),
      stock: z.coerce.number().int().min(0).default(0),
      categoryId: z.string().uuid().optional(),
      category: z.string().optional(),
      subcategory: z.string().optional(),
      imageUrl: z.string().optional(),
      status: productStatusSchema.optional(),
      isFeatured: z.union([z.coerce.boolean(), z.string()]).optional(),
      featured: z.union([z.coerce.boolean(), z.string()]).optional(),
      gst: z.coerce.number().min(0).max(100).optional(),
      gstRate: z.coerce.number().min(0).max(100).optional(),
      hsn: z.string().max(20).optional(),
      brand: z.string().max(120).optional(),
      tags: z.any().optional(),
      features: z.any().optional(),
      images: z.any().optional(),
    })
    .parse(body);

  const existingImages = toArray(parsed.images);
  const uploadedImages = files.map(toImagePath);

  return {
    name: parsed.name.trim(),
    description: parsed.description.trim(),
    unit: parsed.unit,
    price: parsed.price,
    originalPrice:
      parsed.originalPrice === '' || parsed.originalPrice == null ? null : Number(parsed.originalPrice),
    stock: parsed.stock,
    categoryId: parsed.categoryId,
    categoryName: parsed.category?.trim(),
    subcategory: parsed.subcategory?.trim() || null,
    status: parsed.status ?? 'active',
    isFeatured: toBoolean(parsed.isFeatured ?? parsed.featured, false),
    gstRate: parsed.gstRate ?? parsed.gst ?? 0,
    hsn: parsed.hsn?.trim().toUpperCase() || null,
    brand: parsed.brand?.trim() || null,
    tags: toArray(parsed.tags),
    features: toArray(parsed.features),
    imageUrls: [...existingImages, ...uploadedImages],
    imageUrl: [...existingImages, ...uploadedImages, parsed.imageUrl].find(Boolean) ?? null,
  };
}

function serializeCategory(row) {
  return {
    ...row,
    _id: row.id,
    subcategories: toArray(row.subcategories),
  };
}

async function fetchProductOr404(id, res) {
  const existing = await db.query.products.findFirst({
    where: eq(products.id, id),
  });

  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return null;
  }

  return existing;
}

export const listCategories = asyncHandler(async (req, res) => {
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  res.json(rows.map(serializeCategory));
});

export const listBrands = asyncHandler(async (req, res) => {
  const rows = await db.select().from(products).orderBy(asc(products.brand));
  const brands = Array.from(
    new Set(
      rows
        .map((row) => row.brand?.trim())
        .filter(Boolean)
    )
  );

  res.json(brands);
});

export const createCategory = asyncHandler(async (req, res) => {
  const input = createCategorySchema.parse({
    ...req.body,
    subcategories: toArray(req.body.subcategories),
  });

  const categoryId = createId();

  await db
    .insert(categories)
    .values({
      id: categoryId,
      name: input.name,
      slug: slugify(input.name),
      subcategories: input.subcategories ?? [],
    });

  const row = await getCategoryById(categoryId);

  res.status(201).json(serializeCategory(row));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const input = createCategorySchema.parse({
    ...req.body,
    subcategories: toArray(req.body.subcategories),
  });

  const existing = await getCategoryById(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Category not found' });
  }

  await db
    .update(categories)
    .set({
      name: input.name,
      slug: slugify(input.name),
      subcategories: input.subcategories ?? [],
      updatedAt: new Date(),
    })
    .where(eq(categories.id, req.params.id));

  const updated = await getCategoryById(req.params.id);

  res.json(serializeCategory(updated));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const existing = await getCategoryById(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const linkedProduct = await db.query.products.findFirst({
    where: eq(products.categoryId, req.params.id),
  });

  if (linkedProduct) {
    return res.status(409).json({
      error: 'Category cannot be deleted while products still reference it',
    });
  }

  await db.delete(categories).where(eq(categories.id, req.params.id));

  res.json({ success: true });
});

export const addSubcategory = asyncHandler(async (req, res) => {
  const subcategory = z.string().min(1).max(120).parse(req.body.subcategory);
  const category = await getCategoryById(req.params.id);

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const nextSubcategories = Array.from(new Set([...(category.subcategories ?? []), subcategory]));

  await db
    .update(categories)
    .set({
      subcategories: nextSubcategories,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, req.params.id));

  const updated = await getCategoryById(req.params.id);

  res.json(serializeCategory(updated));
});

export const removeSubcategory = asyncHandler(async (req, res) => {
  const subcategory = z.string().min(1).max(120).parse(req.body.subcategory);
  const category = await getCategoryById(req.params.id);

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  await db
    .update(categories)
    .set({
      subcategories: (category.subcategories ?? []).filter((value) => value !== subcategory),
      updatedAt: new Date(),
    })
    .where(eq(categories.id, req.params.id));

  const updated = await getCategoryById(req.params.id);

  res.json(serializeCategory(updated));
});

export const listProducts = asyncHandler(async (req, res) => {
  const baseRows = await db.select().from(products).orderBy(desc(products.createdAt));
  const rows = await attachCategoryMetadata(baseRows);

  const q = req.query.q?.toString().trim().toLowerCase();
  const categoryFilter = req.query.category?.toString().trim().toLowerCase();
  const subcategoryFilter = req.query.subcategory?.toString().trim().toLowerCase();
  const featuredOnly = req.query.featured === 'true';

  const filtered = rows.filter((row) => {
    if (featuredOnly && !row.isFeatured) return false;
    if (categoryFilter && row.category?.toLowerCase() !== categoryFilter) return false;
    if (subcategoryFilter && row.subcategory?.toLowerCase() !== subcategoryFilter) return false;
    if (!q) return true;

    return [row.name, row.description, row.category, row.subcategory, row.brand]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(q));
  });

  res.json(filtered);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await db.query.products.findFirst({
    where: eq(products.id, req.params.id),
  });

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const [serialized] = await attachCategoryMetadata([product]);
  res.json(serialized);
});

export const createProduct = asyncHandler(async (req, res) => {
  const payload = parseProductPayload(req.body, req.files ?? []);
  const category = await resolveCategory({
    categoryId: payload.categoryId,
    categoryName: payload.categoryName,
    subcategory: payload.subcategory,
  });
  const slug = slugify(payload.name);
  const productId = createId();

  await db
    .insert(products)
    .values({
      id: productId,
      name: payload.name,
      slug,
      categoryId: category?.id ?? null,
      subcategory: payload.subcategory,
      description: payload.description,
      unit: payload.unit,
      price: toMoney(payload.price),
      originalPrice: payload.originalPrice == null ? null : toMoney(payload.originalPrice),
      gstRate: toMoney(payload.gstRate),
      hsn: payload.hsn,
      stock: payload.stock,
      status: payload.status,
      imageUrl: payload.imageUrl,
      imageUrls: payload.imageUrls,
      brand: payload.brand,
      tags: payload.tags,
      features: payload.features,
      isFeatured: payload.isFeatured,
    });

  const row = await getProductByIdRecord(productId);

  const [serialized] = await attachCategoryMetadata([{ ...row, categoryName: category?.name ?? '' }]);
  res.status(201).json(serialized);
});

export const createProductWithImages = createProduct;

export const updateProduct = asyncHandler(async (req, res) => {
  const bodyKeys = Object.entries(req.body ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key]) => key);

  if ((req.files?.length ?? 0) === 0 && bodyKeys.length === 1 && bodyKeys[0] === 'status') {
    return updateProductStatus(req, res);
  }

  if ((req.files?.length ?? 0) === 0 && bodyKeys.length === 1 && bodyKeys[0] === 'stock') {
    return updateProductStock(req, res);
  }

  const existing = await fetchProductOr404(req.params.id, res);
  if (!existing) return;

  const payload = parseProductPayload(req.body, req.files ?? []);
  const category = await resolveCategory({
    categoryId: payload.categoryId,
    categoryName: payload.categoryName,
    subcategory: payload.subcategory,
  });

  await db
    .update(products)
    .set({
      name: payload.name,
      slug: slugify(payload.name),
      categoryId: category?.id ?? existing.categoryId ?? null,
      subcategory: payload.subcategory,
      description: payload.description,
      unit: payload.unit,
      price: toMoney(payload.price),
      originalPrice: payload.originalPrice == null ? null : toMoney(payload.originalPrice),
      gstRate: toMoney(payload.gstRate),
      hsn: payload.hsn,
      stock: payload.stock,
      status: payload.status,
      imageUrl: payload.imageUrl,
      imageUrls: payload.imageUrls,
      brand: payload.brand,
      tags: payload.tags,
      features: payload.features,
      isFeatured: payload.isFeatured,
      updatedAt: new Date(),
    })
    .where(eq(products.id, req.params.id));

  const updated = await getProductByIdRecord(req.params.id);

  const [serialized] = await attachCategoryMetadata([{ ...updated, categoryName: category?.name ?? '' }]);
  res.json(serialized);
});

export const updateProductStatus = asyncHandler(async (req, res) => {
  const existing = await fetchProductOr404(req.params.id, res);
  if (!existing) return;

  const input = z
    .object({
      status: productStatusSchema,
    })
    .parse(req.body);

  await db
    .update(products)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(products.id, req.params.id));

  const updated = await getProductByIdRecord(req.params.id);
  const [serialized] = await attachCategoryMetadata([updated]);
  res.json(serialized);
});

export const updateProductStock = asyncHandler(async (req, res) => {
  const existing = await fetchProductOr404(req.params.id, res);
  if (!existing) return;

  const input = z
    .object({
      stock: z.coerce.number().int().min(0),
    })
    .parse(req.body);

  await db
    .update(products)
    .set({
      stock: input.stock,
      updatedAt: new Date(),
    })
    .where(eq(products.id, req.params.id));

  const updated = await getProductByIdRecord(req.params.id);
  const [serialized] = await attachCategoryMetadata([updated]);
  res.json(serialized);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const existing = await getProductByIdRecord(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const linkedOrderItem = await db.query.orderItems.findFirst({
    where: eq(orderItems.productId, req.params.id),
  });

  if (linkedOrderItem) {
    return res.status(409).json({
      error: 'Product cannot be deleted because it is referenced by existing orders',
    });
  }

  await db.delete(products).where(eq(products.id, req.params.id));

  res.json({ success: true });
});

export const getFeaturedProducts = asyncHandler(async (req, res) => {
  req.query.featured = 'true';
  return listProducts(req, res);
});

export const searchProducts = asyncHandler(async (req, res) => {
  return listProducts(req, res);
});

export const getStorageInfo = asyncHandler(async (req, res) => {
  res.json({
    storageType: 'local-disk',
    maxFileSize: '10MB',
    maxFilesPerProduct: 10,
  });
});

export const getUploadHealth = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    message: 'Uploads configured',
  });
});
