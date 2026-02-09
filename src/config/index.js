// ============================================================================
// Centralized Configuration
// ============================================================================
// All environment variables are validated and coerced here. The app fails fast
// if required config is missing — never silently use defaults in production.
// ============================================================================

require('dotenv/config');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  db: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authWindowMs:
      parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    authMaxRequests:
      parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // Cache TTLs (seconds)
  cache: {
    permissionsTTL: 300, // 5 minutes
    dashboardTTL: 60, // 1 minute
    featureFlagsTTL: 300, // 5 minutes
  },
};

// Fail-fast validation for critical config
const requiredConfigs = [
  ['DATABASE_URL', config.db.url],
  ['JWT_ACCESS_SECRET', config.jwt.accessSecret],
  ['JWT_REFRESH_SECRET', config.jwt.refreshSecret],
];

for (const [name, value] of requiredConfigs) {
  if (!value) {
    console.error(`FATAL: Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

module.exports = config;
