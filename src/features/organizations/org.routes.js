// ============================================================================
// Organization Routes
// ============================================================================

const { Router } = require('express');
const orgController = require('./org.controller');
const validate = require('../../utils/validate');
const {
  createOrgSchema,
  updateOrgSchema,
  orgIdParamSchema,
} = require('./org.schema');
const {
  authenticate,
  authorize,
  resolveTenant,
  auditLog,
} = require('../../middleware');

const router = Router();

router.use(authenticate, resolveTenant);

/**
 * @openapi
 * /organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: List all organizations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', authorize('ORG_READ'), orgController.list);

/**
 * @openapi
 * /organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by ID
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Organization details
 */
router.get(
  '/:id',
  authorize('ORG_READ'),
  validate({ params: orgIdParamSchema }),
  orgController.getById,
);

/**
 * @openapi
 * /organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create a new organization
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Organization created
 */
router.post(
  '/',
  authorize('ORG_CREATE'),
  validate({ body: createOrgSchema }),
  auditLog('ORG_CREATED', 'ORGANIZATION'),
  orgController.create,
);

/**
 * @openapi
 * /organizations/{id}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update an organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Organization updated
 */
router.patch(
  '/:id',
  authorize('ORG_UPDATE'),
  validate({ params: orgIdParamSchema, body: updateOrgSchema }),
  auditLog('ORG_UPDATED', 'ORGANIZATION'),
  orgController.update,
);

module.exports = router;
