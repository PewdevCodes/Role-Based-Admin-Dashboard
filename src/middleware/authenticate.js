// ============================================================================
// Authentication Middleware
// ============================================================================
// Stateless JWT verification. Extracts the Bearer token from the Authorization
// header, verifies it, and attaches `req.user` with the decoded payload.
//
// Design decision: NO database lookup here for performance. The JWT payload
// contains userId, organizationId, and email — enough to proceed.
// Permission checks happen in the authorization middleware.
// ============================================================================

const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');
const { cache } = require('../config/redis');

/**
 * Verifies the access token and populates req.user.
 */
function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new UnauthorizedError('Missing or malformed authorization header'),
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Check if token has been blacklisted (forced logout)
    cache
      .get(`blacklist:${token}`)
      .then((blacklisted) => {
        if (blacklisted) {
          return next(new UnauthorizedError('Token has been revoked'));
        }

        // Attach user context to request
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          organizationId: decoded.organizationId,
        };

        next();
      })
      .catch(() => {
        // Redis failure — degrade gracefully, allow the request
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          organizationId: decoded.organizationId,
        };
        next();
      });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid access token'));
    }
    return next(new UnauthorizedError('Authentication failed'));
  }
}

module.exports = authenticate;
