// ============================================================================
// Role Routes
// ============================================================================

const { Router } = require('express');
const roleController = require('./role.controller');
const validate = require('../../utils/validate');
const {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  roleIdParamSchema,
  roleListQuerySchema,
} = require('./role.schema');
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
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: List all roles (org-scoped + global)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: includeGlobal
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200:
 *         description: Paginated list of roles
 */
router.get(
  '/',
  authorize('ROLE_READ'),
  validate({ query: roleListQuerySchema }),
  roleController.list,
);

/**
 * @openapi
 * /roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get role by ID with permissions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Role details
 */
router.get(
  '/:id',
  authorize('ROLE_READ'),
  validate({ params: roleIdParamSchema }),
  roleController.getById,
);

/**
 * @openapi
 * /roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create a new role
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Role created
 */
router.post(
  '/',
  authorize('ROLE_CREATE'),
  validate({ body: createRoleSchema }),
  auditLog('ROLE_CREATED', 'ROLE'),
  roleController.create,
);

/**
 * @openapi
 * /roles/{id}:
 *   patch:
 *     tags: [Roles]
 *     summary: Update a role
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch(
  '/:id',
  authorize('ROLE_UPDATE'),
  validate({ params: roleIdParamSchema, body: updateRoleSchema }),
  auditLog('ROLE_UPDATED', 'ROLE'),
  roleController.update,
);

/**
 * @openapi
 * /roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete (deactivate) a role
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Role deactivated
 */
router.delete(
  '/:id',
  authorize('ROLE_DELETE'),
  validate({ params: roleIdParamSchema }),
  auditLog('ROLE_DELETED', 'ROLE'),
  roleController.delete,
);

/**
 * @openapi
 * /roles/{id}/permissions:
 *   put:
 *     tags: [Roles]
 *     summary: Assign permissions to a role
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissionIds]
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Permissions assigned to role
 */
router.put(
  '/:id/permissions',
  authorize('PERMISSION_ASSIGN'),
  validate({ params: roleIdParamSchema, body: assignPermissionsSchema }),
  auditLog('ROLE_PERMISSIONS_ASSIGNED', 'ROLE'),
  roleController.assignPermissions,
);

module.exports = router;
