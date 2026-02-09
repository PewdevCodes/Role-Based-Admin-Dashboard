// ============================================================================
// Middleware Barrel Export
// ============================================================================

module.exports = {
  authenticate: require('./authenticate'),
  authorize: require('./authorize'),
  resolveTenant: require('./resolveTenant'),
  auditLog: require('./auditLog'),
  correlationId: require('./correlationId'),
  errorHandler: require('./errorHandler'),
  rateLimiter: require('./rateLimiter'),
};
