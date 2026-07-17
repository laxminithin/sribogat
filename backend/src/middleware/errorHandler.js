import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
}

// Friendly 409 messages per unique constraint, so a duplicate insert reads like a
// product rule ("name already exists") instead of a raw SQL dump. Add a line here
// when a new unique index is created.
const DUPLICATE_MESSAGES = {
  products_slug_unique: 'A product with this name already exists. Please use a different name.',
  categories_name_unique: 'A category with this name already exists.',
  categories_slug_unique: 'A category with this name already exists.',
  coupons_code_unique: 'A coupon with this code already exists.',
  users_email_unique: 'An account with this email already exists.',
};

// Drizzle wraps the mysql2 error, so the ER_DUP_ENTRY code can be on the error or its cause.
function findDbError(error) {
  let current = error;
  while (current) {
    if (current.code || current.sqlMessage) return current;
    current = current.cause;
  }
  return null;
}

export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.flatten(),
    });
  }

  const dbError = findDbError(error);
  if (dbError?.code === 'ER_DUP_ENTRY') {
    const constraint = dbError.sqlMessage?.match(/for key '(?:.*\.)?(.+?)'/)?.[1];
    return res.status(409).json({
      error: DUPLICATE_MESSAGES[constraint] || 'This record already exists.',
    });
  }

  logger.error(error);

  // Intentional app errors carry a statusCode and a message meant for the user.
  // Everything else is unexpected — log the detail above, but never leak SQL/stack to the client.
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
