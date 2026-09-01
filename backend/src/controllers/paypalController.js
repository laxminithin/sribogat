import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { orders } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// PayPal payment scaffold.
//
// This is a STRUCTURE for the teamlead to complete — the DB plumbing, auth,
// validation and response shape are wired; the two calls to PayPal's REST API
// are the only gaps (marked `TODO(teamlead)` + a 501 so nothing silently
// pretends to work).
//
// To finish it:
//   1. Add PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET to backend/.env
//      (PAYPAL_MODE=sandbox|live is already read from config/env.js).
//   2. Install an SDK or just fetch PayPal REST v2 directly:
//        - Auth:    POST {base}/v1/oauth2/token   (basic auth, client creds)
//        - Create:  POST {base}/v2/checkout/orders
//        - Capture: POST {base}/v2/checkout/orders/{id}/capture
//      base = https://api-m.sandbox.paypal.com  (sandbox)
//           | https://api-m.paypal.com          (live)
//   3. Replace each `paypalNotImplemented(...)` with the real call, then set
//      paymentStatus='completed' + paypalCaptureId on capture (already stubbed).
//   4. Wire the frontend PayPal Buttons SDK in CheckoutPage.jsx (see TODO there).
// ─────────────────────────────────────────────────────────────────────────────

const PAYPAL_API_BASE =
  env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

/** Guard the seams the teamlead still has to fill. Remove once implemented. */
function paypalNotImplemented(res, step) {
  return res.status(501).json({
    error: `PayPal ${step} is not implemented yet — see backend/src/controllers/paypalController.js`,
  });
}

// TODO(teamlead): obtain an OAuth2 access token from PayPal using
// env.PAYPAL_CLIENT_ID / env.PAYPAL_CLIENT_SECRET against `${PAYPAL_API_BASE}`.
// async function getPaypalAccessToken() { ... }

const createSchema = z.object({
  orderId: z.string().uuid(),
});

const captureSchema = z.object({
  orderId: z.string().uuid(),
  paypalOrderId: z.string().min(1),
});

/**
 * POST /api/orders/paypal/create
 * Body: { orderId }  — a local order already created via POST /api/orders.
 * Creates the matching PayPal order and returns its id for the PayPal Buttons SDK.
 */
export const createPaypalOrder = asyncHandler(async (req, res) => {
  const { orderId } = createSchema.parse(req.body);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.userId !== req.auth.userId) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // TODO(teamlead): call PayPal "create order" with amount = order.totalAmount
  // (currency INR/USD per your PayPal account), then:
  //   await db.update(orders).set({ paypalOrderId }).where(eq(orders.id, orderId));
  //   return res.json({ paypalOrderId, amount: order.totalAmount });
  void PAYPAL_API_BASE;
  return paypalNotImplemented(res, 'order creation');
});

/**
 * POST /api/orders/paypal/capture
 * Body: { orderId, paypalOrderId }
 * Captures the approved PayPal payment and marks the local order paid.
 */
export const capturePaypalOrder = asyncHandler(async (req, res) => {
  const { orderId, paypalOrderId } = captureSchema.parse(req.body);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.userId !== req.auth.userId) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // TODO(teamlead): call PayPal "capture order" for paypalOrderId, verify the
  // capture status === 'COMPLETED', then persist and respond:
  //   await db.update(orders)
  //     .set({ paymentStatus: 'completed', paypalCaptureId })
  //     .where(eq(orders.id, orderId));
  //   return res.json({ success: true, paymentStatus: 'completed' });
  void paypalOrderId;
  return paypalNotImplemented(res, 'payment capture');
});
