import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
}

export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.flatten(),
    });
  }

  logger.error(error);

  res.status(error.statusCode || 500).json({
    error: error.message || 'Internal server error',
  });
}
