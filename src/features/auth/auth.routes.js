// ============================================================================
// Auth Routes
// ============================================================================
// Middleware order for each route:
//   1. Rate limiter (brute-force protection on auth endpoints)
//   2. Validation (Zod schema)
//   3. Authentication (only for protected routes like logout)
//   4. Authorization (only for admin routes like force-logout)
//   5. Audit logging
//   6. Controller
// ============================================================================

const { Router } = require('express');
const authController = require('./auth.controller');
const {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} = require('./auth.schema');
const validate = require('../../utils/validate');
const { authenticate, authorize, auditLog } = require('../../middleware');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, organizationSlug]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               organizationSlug: { type: string }
 *     responses:
 *       200:
 *         description: Login successful — returns access + refresh tokens
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, organizationSlug]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               organizationSlug: { type: string }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: User already exists
 */
router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refresh,
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout — revoke tokens
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post(
  '/logout',
  authenticate,
  auditLog('USER_LOGOUT', 'AUTH'),
  authController.logout,
);

/**
 * @openapi
 * /auth/force-logout/{userId}:
 *   post:
 *     tags: [Authentication]
 *     summary: Force logout a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: All sessions revoked
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/force-logout/:userId',
  authenticate,
  authorize('USER_FORCE_LOGOUT'),
  auditLog('USER_FORCE_LOGOUT', 'AUTH'),
  authController.forceLogout,
);

module.exports = router;
