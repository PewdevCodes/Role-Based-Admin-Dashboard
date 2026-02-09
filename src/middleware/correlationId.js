// ============================================================================
// Correlation ID Middleware
// ============================================================================
// Assigns a unique correlationId to every request for distributed tracing.
// Downstream middleware, services, and loggers can reference req.correlationId.
// ============================================================================

const { generateCorrelationId } = require('../utils/helpers');

function correlationId(req, _res, next) {
  req.correlationId =
    req.headers['x-correlation-id'] || generateCorrelationId();
  next();
}

module.exports = correlationId;
