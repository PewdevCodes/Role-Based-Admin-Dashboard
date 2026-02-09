// ============================================================================
// Global Error Handler
// ============================================================================
// Catches all errors that bubble up through Express's next(err) chain.
//
// Strategy:
//   1. Operational errors (AppError subclasses) → return structured JSON
//   2. Prisma errors → mapped to appropriate HTTP codes
//   3. Unknown errors → 500 with generic message (no info leak)
//
// Every error is logged with correlationId for tracing.
// ============================================================================

const logger = require('../config/logger');
const { AppError } = require('../utils/errors');
const response = require('../utils/response');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const correlationId = req.correlationId || 'unknown';

  // ── Operational Application Errors ───────────────────────────────────
  if (err instanceof AppError) {
    logger.warn(
      {
        err: {
          message: err.message,
          code: err.errorCode,
          statusCode: err.statusCode,
        },
        correlationId,
      },
      'Operational error',
    );
    return response.error(
      res,
      err.statusCode,
      err.errorCode,
      err.message,
      err.details,
    );
  }

  // ── Prisma Known Errors ─────────────────────────────────────────────
  if (err.code === 'P2002') {
    // Unique constraint violation
    const field = err.meta?.target?.join(', ') || 'unknown';
    return response.error(
      res,
      409,
      'CONFLICT',
      `Duplicate value for: ${field}`,
    );
  }
  if (err.code === 'P2025') {
    // Record not found
    return response.error(res, 404, 'NOT_FOUND', 'Record not found');
  }
  if (err.code === 'P2003') {
    // Foreign key constraint failure
    return response.error(
      res,
      400,
      'BAD_REQUEST',
      'Referenced record does not exist',
    );
  }

  // ── JWT Errors (fallback if not caught in middleware) ─────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return response.error(res, 401, 'UNAUTHORIZED', 'Invalid or expired token');
  }

  // ── Unexpected / Programmer Errors ──────────────────────────────────
  logger.error({ err, correlationId, stack: err.stack }, 'Unhandled error');
  return response.error(
    res,
    500,
    'INTERNAL_ERROR',
    'An unexpected error occurred',
  );
}

module.exports = errorHandler;
