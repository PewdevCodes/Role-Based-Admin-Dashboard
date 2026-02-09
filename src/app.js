// ============================================================================
// Express Application Bootstrap
// ============================================================================
// This file assembles the Express app but does NOT start listening.
// The server.js file handles the actual listen() call. This separation
// enables testing the app without binding to a port.
//
// Middleware ordering is intentional and security-critical:
//   1. Helmet (security headers)
//   2. CORS
//   3. Compression
//   4. Body parsing
//   5. Correlation ID (first custom middleware — tracing)
//   6. Rate limiting
//   7. Routes
//   8. 404 handler
//   9. Global error handler (MUST be last)
// ============================================================================

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const swaggerSpec = require('./config/swagger');
const { correlationId, errorHandler } = require('./middleware');
const { apiLimiter } = require('./middleware/rateLimiter');
const { NotFoundError } = require('./utils/errors');

// ─── Feature Routes ─────────────────────────────────────────────────────────
const authRoutes = require('./features/auth/auth.routes');
const userRoutes = require('./features/users/user.routes');
const roleRoutes = require('./features/roles/role.routes');
const permissionRoutes = require('./features/permissions/permission.routes');
const orgRoutes = require('./features/organizations/org.routes');
const dashboardRoutes = require('./features/dashboard/dashboard.routes');
const auditRoutes = require('./features/audit/audit.routes');
const featureFlagRoutes = require('./features/feature-flags/featureFlag.routes');

const app = express();

// ─── Global Middleware (order matters) ──────────────────────────────────────

// Security headers — relaxed CSP for SPA + Google Fonts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  }),
);

// CORS — restricts origins in production
app.use(
  cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 86400, // 24h preflight cache
  }),
);

// Response compression
app.use(compression());

// Body parsing with size limits (prevents payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Correlation ID for distributed tracing
app.use(correlationId);

// Global rate limiter
app.use(config.apiPrefix, apiLimiter);

// ─── Health Check (no auth required) ────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ─── Swagger Documentation ──────────────────────────────────────────────────

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'RBAC Admin Dashboard API Docs',
  }),
);

// Serve raw OpenAPI spec
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// ─── API Routes ─────────────────────────────────────────────────────────────

const prefix = config.apiPrefix;

app.use(`${prefix}/auth`, authRoutes);
app.use(`${prefix}/users`, userRoutes);
app.use(`${prefix}/roles`, roleRoutes);
app.use(`${prefix}/permissions`, permissionRoutes);
app.use(`${prefix}/organizations`, orgRoutes);
app.use(`${prefix}/dashboard`, dashboardRoutes);
app.use(`${prefix}/audit-logs`, auditRoutes);
app.use(`${prefix}/feature-flags`, featureFlagRoutes);

// ─── Serve Frontend (SPA) ───────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, '..', 'client')));

// SPA fallback — serve index.html for any non-API route
app.get(/^(?!\/api\/).*$/, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ─── 404 Handler (API routes only) ─────────────────────────────────────────

app.use(`${prefix}`, (_req, _res, next) => {
  next(new NotFoundError('Route'));
});

// ─── Global Error Handler (MUST be last) ────────────────────────────────────

app.use(errorHandler);

module.exports = app;
