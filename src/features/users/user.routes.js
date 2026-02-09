// ============================================================================
// User Routes
// ============================================================================
// Middleware chain: authenticate → resolveTenant → authorize → auditLog → controller
// This order ensures:
//   1. Identity is verified
//   2. Tenant context is established
//   3. Permission is checked (tenant-aware via cached permissions)
//   4. Action is audited
//   5. Business logic executes
// ============================================================================

const { Router } = require('express');
const userController = require('./user.controller');
const validate = require('../../utils/validate');
const {
  createUserSchema,
  updateUserSchema,
  assignRolesSchema,
  userIdParamSchema,
  userListQuerySchema,
} = require('./user.schema');
const {
  authenticate,
  authorize,
  resolveTenant,
  auditLog,
} = require('../../middleware');

const router = Router();

// All user routes require auth + tenant resolution
router.use(authenticate, resolveTenant);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users in the organization
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, email, firstName, lastName] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: isActive
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200:
 *         description: Paginated list of users
 */
router.get(
  '/',
  authorize('USER_READ'),
  validate({ query: userListQuerySchema }),
  userController.list,
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User details with roles
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  authorize('USER_READ'),
  validate({ params: userIdParamSchema }),
  userController.getById,
);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               roleIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       201:
 *         description: User created
 */
router.post(
  '/',
  authorize('USER_CREATE'),
  validate({ body: createUserSchema }),
  auditLog('USER_CREATED', 'USER'),
  userController.create,
);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user details
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch(
  '/:id',
  authorize('USER_UPDATE'),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  auditLog('USER_UPDATED', 'USER'),
  userController.update,
);

/**
 * @openapi
 * /users/{id}/deactivate:
 *   post:
 *     tags: [Users]
 *     summary: Deactivate a user (soft delete)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.post(
  '/:id/deactivate',
  authorize('USER_DELETE'),
  validate({ params: userIdParamSchema }),
  auditLog('USER_DEACTIVATED', 'USER'),
  userController.deactivate,
);

/**
 * @openapi
 * /users/{id}/activate:
 *   post:
 *     tags: [Users]
 *     summary: Activate a user
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User activated
 */
router.post(
  '/:id/activate',
  authorize('USER_UPDATE'),
  validate({ params: userIdParamSchema }),
  auditLog('USER_ACTIVATED', 'USER'),
  userController.activate,
);

/**
 * @openapi
 * /users/{id}/roles:
 *   put:
 *     tags: [Users]
 *     summary: Assign roles to a user
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleIds]
 *             properties:
 *               roleIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Roles assigned
 */
router.put(
  '/:id/roles',
  authorize('ROLE_ASSIGN'),
  validate({ params: userIdParamSchema, body: assignRolesSchema }),
  auditLog('USER_ROLES_ASSIGNED', 'USER'),
  userController.assignRoles,
);

module.exports = router;
