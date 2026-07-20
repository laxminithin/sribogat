import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { orderItems, orders, products, users } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function parseDate(value, fallback = null) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

// A date-only endDate ("2026-07-18") parses to UTC midnight, which would exclude
// that whole day from an inclusive range. Roll a UTC-midnight endDate to the end
// of the day (in UTC, matching how startDate is parsed) so the selected end date
// is included; leave a time-bearing value as-is. Checked in UTC so it works
// regardless of the server's timezone.
function parseEndDate(value, fallback = null) {
  const parsed = parseDate(value, fallback);
  if (
    parsed &&
    parsed.getUTCHours() === 0 &&
    parsed.getUTCMinutes() === 0 &&
    parsed.getUTCSeconds() === 0 &&
    parsed.getUTCMilliseconds() === 0
  ) {
    parsed.setUTCHours(23, 59, 59, 999);
  }
  return parsed;
}

function inRange(dateValue, startDate, endDate) {
  const value = new Date(dateValue);
  if (startDate && value < startDate) return false;
  if (endDate && value > endDate) return false;
  return true;
}

function toCsv(rows) {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const stringValue = value == null ? '' : String(value);
    if (/[\",\n]/.test(stringValue)) {
      return `\"${stringValue.replace(/\"/g, '\"\"')}\"`;
    }
    return stringValue;
  };

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
  ].join('\n');
}

export const getDashboardStats = asyncHandler(async (req, res) => {
  const startDate = parseDate(req.query.startDate);
  const endDate = parseEndDate(req.query.endDate);

  const orderRows = (await db.select().from(orders).orderBy(desc(orders.createdAt))).filter((order) =>
    inRange(order.createdAt, startDate, endDate)
  );
  const userRows = await db.select().from(users).orderBy(desc(users.createdAt));
  const orderItemRows = await db.select().from(orderItems).orderBy(asc(orderItems.name));
  const productRows = await db.select().from(products);
  const productMap = new Map(productRows.map((product) => [product.id, product]));

  const totalRevenue = orderRows.reduce((sum, order) => sum + Number(order.totalAmount), 0);

  const orderStats = {
    pending: { count: 0, revenue: 0 },
    processing: { count: 0, revenue: 0 },
    shipped: { count: 0, revenue: 0 },
    delivered: { count: 0, revenue: 0 },
    cancelled: { count: 0, revenue: 0 },
  };

  const dailyRevenueMap = new Map();
  for (const order of orderRows) {
    const bucket = orderStats[order.status] ?? (orderStats[order.status] = { count: 0, revenue: 0 });
    bucket.count += 1;
    bucket.revenue += Number(order.totalAmount);

    const dayKey = new Date(order.createdAt).toISOString().slice(0, 10);
    const dayBucket = dailyRevenueMap.get(dayKey) ?? { _id: dayKey, revenue: 0, orders: 0 };
    dayBucket.revenue += Number(order.totalAmount);
    dayBucket.orders += 1;
    dailyRevenueMap.set(dayKey, dayBucket);
  }

  const filteredOrderIds = new Set(orderRows.map((order) => order.id));
  const filteredOrderItems = orderItemRows.filter((item) => filteredOrderIds.has(item.orderId));
  const productStatsMap = new Map();
  for (const item of filteredOrderItems) {
    const bucket = productStatsMap.get(item.productId) ?? {
      _id: item.productId,
      product: {
        id: item.productId,
        _id: item.productId,
        name: productMap.get(item.productId)?.name ?? item.name ?? 'Unknown product',
      },
      totalSold: 0,
      revenue: 0,
    };
    bucket.totalSold += Number(item.quantity);
    bucket.revenue += Number(item.lineTotal);
    productStatsMap.set(item.productId, bucket);
  }

  const customerTotals = new Map();
  for (const order of orderRows) {
    const user = userRows.find((entry) => entry.id === order.userId);
    const bucket = customerTotals.get(order.userId) ?? {
      _id: order.userId,
      name: user?.name ?? 'Customer',
      email: user?.email ?? '',
      totalSpent: 0,
      orderCount: 0,
    };
    bucket.totalSpent += Number(order.totalAmount);
    bucket.orderCount += 1;
    customerTotals.set(order.userId, bucket);
  }

  res.json({
    totalRevenue,
    orderStats,
    dailyRevenue: Array.from(dailyRevenueMap.values()).sort((a, b) => a._id.localeCompare(b._id)),
    topProducts: Array.from(productStatsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    topCustomers: Array.from(customerTotals.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10),
  });
});

export const exportAnalyticsData = asyncHandler(async (req, res) => {
  const type = req.query.type?.toString() ?? 'orders';
  const startDate = parseDate(req.query.startDate);
  const endDate = parseEndDate(req.query.endDate);

  if (type === 'customers') {
    const userRows = await db.select().from(users).orderBy(desc(users.createdAt));
    const orderRows = (await db.select().from(orders)).filter((order) => inRange(order.createdAt, startDate, endDate));

    const totals = new Map();
    for (const order of orderRows) {
      const bucket = totals.get(order.userId) ?? { totalSpent: 0, orderCount: 0 };
      bucket.totalSpent += Number(order.totalAmount);
      bucket.orderCount += 1;
      totals.set(order.userId, bucket);
    }

    const rows = userRows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      totalSpent: totals.get(user.id)?.totalSpent ?? 0,
      orderCount: totals.get(user.id)?.orderCount ?? 0,
      createdAt: user.createdAt?.toISOString?.() ?? '',
    }));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"customers-export.csv\"');
    return res.send(toCsv(rows));
  }

  const orderRows = (await db.select().from(orders).orderBy(desc(orders.createdAt))).filter((order) =>
    inRange(order.createdAt, startDate, endDate)
  );
  const userIds = Array.from(new Set(orderRows.map((order) => order.userId)));
  const userRows = userIds.length ? await db.select().from(users).where(inArray(users.id, userIds)) : [];
  const userMap = new Map(userRows.map((user) => [user.id, user]));

  const rows = orderRows.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: userMap.get(order.userId)?.name ?? order.shippingName,
    customerEmail: userMap.get(order.userId)?.email ?? '',
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    totalAmount: Number(order.totalAmount),
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    createdAt: order.createdAt?.toISOString?.() ?? '',
  }));

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=\"orders-export.csv\"');
  res.send(toCsv(rows));
});
