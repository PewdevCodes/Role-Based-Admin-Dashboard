// ============================================================================
// Prisma Client Singleton
// ============================================================================
// Single PrismaClient instance reused across the app to avoid connection
// exhaustion. Logging is enabled in development for query debugging.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const config = require('../config');
const logger = require('../config/logger');

const prisma = new PrismaClient({
  log:
    config.env === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
});

if (config.env === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(
      { query: e.query, duration: `${e.duration}ms` },
      'Prisma query',
    );
  });
}

prisma.$on('error', (e) => {
  logger.error({ message: e.message }, 'Prisma error');
});

module.exports = prisma;
