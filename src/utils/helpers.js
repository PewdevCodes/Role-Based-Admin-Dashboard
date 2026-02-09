// ============================================================================
// Shared Utility Helpers
// ============================================================================

const { v4: uuidv4 } = require('uuid');

/**
 * Parse pagination params from query string with sane defaults.
 * Clamps values to prevent abuse (e.g., ?limit=999999).
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Parse sorting params.  Whitelist approach prevents SQL injection via sort fields.
 * @param {object} query - Express query object
 * @param {string[]} allowedFields - Whitelist of sortable column names
 * @param {string} defaultField - Default sort column
 */
function parseSorting(query, allowedFields, defaultField = 'createdAt') {
  const sortBy = allowedFields.includes(query.sortBy)
    ? query.sortBy
    : defaultField;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { [sortBy]: sortOrder };
}

/**
 * Generate a correlation ID for request tracing.
 */
function generateCorrelationId() {
  return uuidv4();
}

/**
 * Pick only allowed keys from an object — prevents mass-assignment.
 */
function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
}

/**
 * Convert milliseconds string like "7d" to epoch timestamp.
 */
function expiryToDate(expiryString) {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = expiryString.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiryString}`);
  return new Date(Date.now() + parseInt(match[1], 10) * units[match[2]]);
}

module.exports = {
  parsePagination,
  parseSorting,
  generateCorrelationId,
  pick,
  expiryToDate,
};
