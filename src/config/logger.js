// ============================================================================
// Structured Logger (Pino)
// ============================================================================
// JSON structured logging in production, pretty-printed in development.
// Every log entry includes a correlationId when available (set by middleware).
// ============================================================================

const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.logging.level,
  ...(config.env === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      correlationId: req.correlationId,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

module.exports = logger;
