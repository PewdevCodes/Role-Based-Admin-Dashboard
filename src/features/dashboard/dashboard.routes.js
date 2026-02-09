// ============================================================================
// Dashboard Routes
// ============================================================================

const { Router } = require('express');
const dashboardController = require('./dashboard.controller');
const { authenticate, authorize, resolveTenant } = require('../../middleware');

const router = Router();

router.use(authenticate, resolveTenant);

/**
 * @openapi
 * /dashboard/metrics:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard analytics metrics
 *     security: [{ bearerAuth: [] }]
 *     description: |
 *       Returns aggregated metrics including total users, active users,
 *       role distribution, and recent admin activity. Results are cached
 *       for 60 seconds.
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     active: { type: integer }
 *                     inactive: { type: integer }
 *                     recentLogins: { type: integer }
 *                 roles:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           role_name: { type: string }
 *                           user_count: { type: integer }
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get(
  '/metrics',
  authorize('DASHBOARD_READ'),
  dashboardController.getMetrics,
);

module.exports = router;
