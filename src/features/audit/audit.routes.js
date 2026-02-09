// ============================================================================
// Audit Log Routes (Read-Only)
// ============================================================================
// Audit logs are immutable. This module only exposes list + filter.
// Write operations happen via the auditLog middleware.
// ============================================================================

const { Router } = require('express');
const auditController = require('./audit.controller');
const validate = require('../../utils/validate');
const { auditLogQuerySchema } = require('./audit.schema');
const { authenticate, authorize, resolveTenant } = require('../../middleware');

const router = Router();

router.use(authenticate, resolveTenant);

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: List audit logs
 *     security: [{ bearerAuth: [] }]
 *     description: |
 *       Retrieve immutable audit logs for the organization.
 *       Supports filtering by action, resource, user, and date range.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Filter by action (e.g., USER_CREATED)
 *       - in: query
 *         name: resource
 *         schema: { type: string }
 *         description: Filter by resource (e.g., USER)
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated audit logs
 */
router.get(
  '/',
  authorize('AUDIT_READ'),
  validate({ query: auditLogQuerySchema }),
  auditController.list,
);

module.exports = router;
