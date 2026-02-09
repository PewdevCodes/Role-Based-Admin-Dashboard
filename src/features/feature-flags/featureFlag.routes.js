// ============================================================================
// Feature Flag Routes
// ============================================================================

const { Router } = require('express');
const featureFlagController = require('./featureFlag.controller');
const validate = require('../../utils/validate');
const { upsertFlagSchema } = require('./featureFlag.schema');
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
 * /feature-flags:
 *   get:
 *     tags: [Feature Flags]
 *     summary: List all feature flags for the organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of feature flags
 */
router.get('/', authorize('FEATURE_FLAG_READ'), featureFlagController.list);

/**
 * @openapi
 * /feature-flags:
 *   put:
 *     tags: [Feature Flags]
 *     summary: Create or update a feature flag
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, isEnabled]
 *             properties:
 *               key: { type: string, example: ADVANCED_ANALYTICS }
 *               description: { type: string }
 *               isEnabled: { type: boolean }
 *               roleId: { type: string, format: uuid, nullable: true }
 *     responses:
 *       200:
 *         description: Feature flag upserted
 */
router.put(
  '/',
  authorize('FEATURE_FLAG_MANAGE'),
  validate({ body: upsertFlagSchema }),
  auditLog('FEATURE_FLAG_UPSERTED', 'FEATURE_FLAG'),
  featureFlagController.upsert,
);

/**
 * @openapi
 * /feature-flags/my-features:
 *   get:
 *     tags: [Feature Flags]
 *     summary: Get enabled features for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of enabled feature keys
 */
router.get('/my-features', featureFlagController.getUserFeatures);

module.exports = router;
