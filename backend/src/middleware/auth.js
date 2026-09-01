import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { verifyAccessToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  try {
    const token = header.slice(7);
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Attaches req.auth when a valid token is present, but never rejects — lets a
// route serve both anonymous and authenticated callers (e.g. public product
// listings that must hide draft/inactive rows from everyone except admins).
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.auth = verifyAccessToken(header.slice(7));
    } catch {
      // Ignore a bad/expired token here — the route treats the caller as anonymous.
    }
  }
  next();
}

export async function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Re-check the live role from the DB so a demoted admin loses access
  // immediately instead of keeping it until their JWT expires.
  // ponytail: one indexed PK lookup per admin request; cache it if admin
  // traffic ever gets hot enough to matter.
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, req.auth.userId) });
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
  } catch (error) {
    return next(error);
  }

  next();
}
