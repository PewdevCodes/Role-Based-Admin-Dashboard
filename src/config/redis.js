// ============================================================================
// Redis Client — Disabled (no local Redis)
// ============================================================================
// Redis is not available in this environment. All cache operations are no-ops.
// The app runs fully without Redis — just no caching / token blacklisting.
// ============================================================================

const logger = require('../config/logger');

logger.info('Redis disabled — running without cache');

const redis = null;

// ─── No-op Cache Helper Methods ─────────────────────────────────────────────

const cache = {
  async get(_key) {
    return null;
  },
  async set(_key, _value, _ttl) {},
  async del(..._keys) {},
  async delPattern(_pattern) {
    return 0;
  },
};

module.exports = { redis, cache };
