// ============================================================================
// Audit Logging Middleware
// ============================================================================
// Automatically records admin actions as immutable audit log entries.
// Hooks into the response `finish` event to capture the final status code.
//
// Usage:
//   router.post('/users', authenticate, authorize('USER_CREATE'),
//     auditLog('USER_CREATED', 'USER'), controller)
//
// Design: Audit logging is fire-and-forget (async, non-blocking).
// A failed audit write must NOT block the user's request.
// ============================================================================

const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * @param {string} action - e.g., 'USER_CREATED', 'ROLE_UPDATED'
 * @param {string} resource - e.g., 'USER', 'ROLE'
 */
function auditLog(action, resource) {
  return (req, res, next) => {
    // Capture after response is sent
    res.on('finish', async () => {
      // Only log successful mutations (2xx)
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user?.id || null,
            action,
            resource,
            resourceId: req.params?.id || req.body?.id || null,
            organizationId: req.user?.organizationId || null,
            ipAddress:
              req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
              req.socket?.remoteAddress ||
              null,
            userAgent: req.headers['user-agent'] || null,
            metadata: {
              method: req.method,
              path: req.originalUrl,
              statusCode: res.statusCode,
              body: sanitizeBody(req.body),
            },
            correlationId: req.correlationId || null,
          },
        });
      } catch (err) {
        // Fire-and-forget: log the failure but don't crash the request
        logger.error(
          { err, action, resource, correlationId: req.correlationId },
          'Audit log write failed',
        );
      }
    });

    next();
  };
}

/**
 * Remove sensitive fields from the request body before logging.
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'refreshToken',
    'secret',
  ];
  for (const field of sensitiveFields) {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  }
  return sanitized;
}

module.exports = auditLog;
