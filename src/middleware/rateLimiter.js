// ============================================================================
// Rate Limiting Middleware
// ============================================================================
// Two tiers:
//   1. General API rate limiter — protects all endpoints
//   2. Auth rate limiter — stricter limits on login/register (brute-force defense)
//
// Uses in-memory store by default. For multi-instance deployments,
// swap to a Redis-backed store (express-rate-limit + rate-limit-redis).
// ============================================================================

const rateLimit = require('express-rate-limit');
const config = require('../config');
const { TooManyRequestsError } = require('../utils/errors');

/**
 * General API rate limiter.
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError());
  },
});

/**
 * Stricter rate limiter for authentication endpoints.
 * Protects against brute-force password attacks.
 */
const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new TooManyRequestsError(
        'Too many authentication attempts — please try again later',
      ),
    );
  },
});

module.exports = { apiLimiter, authLimiter };
