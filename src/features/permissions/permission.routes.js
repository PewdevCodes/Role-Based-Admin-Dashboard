// ============================================================================
// Permission Routes
// ============================================================================

const { Router } = require('express');
const permissionController = require('./permission.controller');
const validate = require('../../utils/validate');
const {
  createPermissionSchema,
  updatePermissionSchema,
  permissionIdParamSchema,
  permissionListQuerySchema,
} = require('./permission.schema');
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
 * /permissions:
 *   get:
 *     tags: [Permissions]
 *     summary: List all permissions
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: resource
 *         schema: { type: string }
 *         description: Filter by resource type (e.g., USER, ROLE)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get(
  '/',
  authorize('PERMISSION_READ'),
  validate({ query: permissionListQuerySchema }),
  permissionController.list,
);

/**
 * @openapi
 * /permissions/{id}:
 *   get:
 *     tags: [Permissions]
 *     summary: Get permission details
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Permission with associated roles
 */
router.get(
  '/:id',
  authorize('PERMISSION_READ'),
  validate({ params: permissionIdParamSchema }),
  permissionController.getById,
);

/**
 * @openapi
 * /permissions:
 *   post:
 *     tags: [Permissions]
 *     summary: Create a new permission
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, resource]
 *             properties:
 *               action: { type: string, example: USER_EXPORT }
 *               resource: { type: string, example: USER }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Permission created
 */
router.post(
  '/',
  authorize('PERMISSION_CREATE'),
  validate({ body: createPermissionSchema }),
  auditLog('PERMISSION_CREATED', 'PERMISSION'),
  permissionController.create,
);

/**
 * @openapi
 * /permissions/{id}:
 *   patch:
 *     tags: [Permissions]
 *     summary: Update a permission
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Permission updated
 */
router.patch(
  '/:id',
  authorize('PERMISSION_UPDATE'),
  validate({ params: permissionIdParamSchema, body: updatePermissionSchema }),
  auditLog('PERMISSION_UPDATED', 'PERMISSION'),
  permissionController.update,
);

module.exports = router;
