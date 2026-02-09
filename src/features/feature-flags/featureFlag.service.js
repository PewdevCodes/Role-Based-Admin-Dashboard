// ============================================================================
// Feature Flag Service
// ============================================================================
// Feature flags are backend-enforced, scoped to roles and/or organizations.
// They control access to features without code deployments.
//
// Resolution order:
//   1. Check org+role specific flag
//   2. Check role-level flag (any org)
//   3. Check org-level flag (any role)
//   4. Default: disabled
// ============================================================================

const prisma = require('../../config/database');
const { cache } = require('../../config/redis');
const config = require('../../config');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { pick } = require('../../utils/helpers');

class FeatureFlagService {
  /**
   * Check if a feature flag is enabled for a user's roles in their org.
   */
  async isEnabled(key, organizationId, roleIds) {
    const cacheKey = `featureflags:${key}:${organizationId}`;
    const cached = await cache.get(cacheKey);
    if (cached !== null) return cached;

    // Find the most specific matching flag
    const flags = await prisma.featureFlag.findMany({
      where: {
        key,
        OR: [
          // Org + role specific
          { organizationId, roleId: { in: roleIds } },
          // Role-level (any org)
          { organizationId: null, roleId: { in: roleIds } },
          // Org-level (any role)
          { organizationId, roleId: null },
          // Global
          { organizationId: null, roleId: null },
        ],
      },
      orderBy: [
        { organizationId: { sort: 'desc', nulls: 'last' } },
        { roleId: { sort: 'desc', nulls: 'last' } },
      ],
    });

    // Most specific flag wins
    const isEnabled = flags.length > 0 ? flags[0].isEnabled : false;

    await cache.set(cacheKey, isEnabled, config.cache.featureFlagsTTL);

    return isEnabled;
  }

  /**
   * List all feature flags for an organization.
   */
  async listFlags(organizationId) {
    return prisma.featureFlag.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
      },
      include: {
        role: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Create or update a feature flag.
   */
  async upsertFlag(data) {
    const flagData = pick(data, [
      'key',
      'description',
      'isEnabled',
      'roleId',
      'organizationId',
    ]);

    return prisma.featureFlag.upsert({
      where: {
        key_roleId_organizationId: {
          key: flagData.key,
          roleId: flagData.roleId || null,
          organizationId: flagData.organizationId || null,
        },
      },
      update: {
        isEnabled: flagData.isEnabled,
        description: flagData.description,
      },
      create: flagData,
    });
  }

  /**
   * Get all enabled features for the current user's context.
   */
  async getUserFeatures(organizationId, roleIds) {
    const flags = await prisma.featureFlag.findMany({
      where: {
        isEnabled: true,
        OR: [
          { organizationId, roleId: { in: roleIds } },
          { organizationId: null, roleId: { in: roleIds } },
          { organizationId, roleId: null },
          { organizationId: null, roleId: null },
        ],
      },
      select: { key: true, description: true },
      distinct: ['key'],
    });

    return flags;
  }
}

module.exports = new FeatureFlagService();
