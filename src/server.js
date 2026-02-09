// ============================================================================
// Server Entry Point
// ============================================================================
// Handles:
//   1. Starting the HTTP server
//   2. Connecting to PostgreSQL (via Prisma) and Redis
//   3. Graceful shutdown on SIGTERM/SIGINT
//
// Graceful shutdown ensures:
//   - No new connections accepted
//   - In-flight requests complete
//   - DB and Redis connections close cleanly
// ============================================================================

const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const prisma = require('./config/database');
const { redis } = require('./config/redis');

async function main() {
  // ── 1. Connect to databases ─────────────────────────────────────────
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected via Prisma');
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to PostgreSQL');
    process.exit(1);
  }

  // ── 2. Start HTTP server ────────────────────────────────────────────
  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.env,
        prefix: config.apiPrefix,
        docs: `http://localhost:${config.port}/api-docs`,
      },
      `🚀 Server listening on port ${config.port}`,
    );
  });

  // ── 3. Graceful shutdown ────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutdown signal received — closing gracefully');

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await prisma.$disconnect();
        logger.info('PostgreSQL disconnected');
      } catch (err) {
        logger.error({ err }, 'Error disconnecting PostgreSQL');
      }

      process.exit(0);
    });

    // Force shutdown after 10s if graceful fails
    setTimeout(() => {
      logger.error('Forced shutdown — graceful shutdown timed out');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled errors
  process.on('unhandledRejection', (err) => {
    logger.fatal({ err }, 'Unhandled Promise Rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception');
    process.exit(1);
  });
}

main();
