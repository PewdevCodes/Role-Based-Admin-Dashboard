// ============================================================================
// Authorization Middleware (Permission-Based RBAC)
// ============================================================================
// Checks if the authenticated user has ONE of the required permissions.
//
// Flow:
//   1. Try Redis cache for user's permissions.
//   2. Cache miss → query DB for all permissions via user→roles→permissions.
//   3. Cache the result with TTL.
//   4. Check if required permission(s) are present.
//
// This middleware is composable:
//   router.get('/users', authenticate, authorize('USER_READ'), controller)
//   router.delete('/users/:id', authenticate, authorize('USER_DELETE'), controller)
//
// Design decision: permissions are cached per user (not per role) because
// a user may have multiple roles, and we need the flattened permission set.
// ============================================================================

const prisma = require('../config/database');
const { cache } = require('../config/redis');
const config = require('../config');
const { ForbiddenError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * Returns middleware that checks if req.user has ANY of the required permissions.
 * @param  {...string} requiredPermissions - Permission action strings
 */
function authorize(...requiredPermissions) {
  return async (req, _res, next) => {
    try {
      const userId = req.user.id;
      const orgId = req.user.organizationId;

      // ── 1. Check Redis cache ─────────────────────────────────────────
      const cacheKey = `permissions:${userId}:${orgId}`;
      let userPermissions = await cache.get(cacheKey);

      // ── 2. Cache miss → DB lookup ────────────────────────────────────
      if (!userPermissions) {
        const userRoles = await prisma.userRole.findMany({
          where: { userId },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        // Flatten: user → roles → permissions → action strings
        userPermissions = [
          ...new Set(
            userRoles
              .filter((ur) => ur.role && ur.role.isActive) // Filter inactive roles
              .flatMap((ur) =>
                ur.role.rolePermissions
                  .filter((rp) => rp.permission && rp.permission.isActive) // Filter inactive permissions
                  .map((rp) => rp.permission.action),
              ),
          ),
        ];

        // ── 3. Cache with TTL ──────────────────────────────────────────
        await cache.set(cacheKey, userPermissions, config.cache.permissionsTTL);

        logger.debug(
          { userId, permissionCount: userPermissions.length },
          'Permissions loaded from DB and cached',
        );
      }

      // Attach to request for downstream use (e.g., feature flags)
      req.userPermissions = userPermissions;

      // ── 4. Check authorization ───────────────────────────────────────
      const hasPermission = requiredPermissions.some((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasPermission) {
        logger.warn(
          {
            userId,
            required: requiredPermissions,
            actual: userPermissions,
            correlationId: req.correlationId,
          },
          'Authorization denied',
        );
        return next(new ForbiddenError());
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = authorize;
