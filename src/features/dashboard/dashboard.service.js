// ============================================================================
// Dashboard Service — Analytics & Metrics
// ============================================================================
// Provides aggregated metrics for the admin dashboard.
// All queries are tenant-scoped. Results are Redis-cached with short TTL
// to avoid hammering the DB on dashboard page loads.
//
// Performance note: We run multiple aggregate queries in a single $transaction
// to ensure consistency and reduce round trips.
// ============================================================================

const prisma = require('../../config/database');
const { cache } = require('../../config/redis');
const config = require('../../config');

class DashboardService {
  /**
   * Get all dashboard metrics in one call.
   * Cached for 60 seconds to prevent DB thrashing.
   */
  async getMetrics(organizationId) {
    const cacheKey = `dashboard:${organizationId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalRoles,
      roleDistribution,
      recentActivity,
      recentLogins,
    ] = await prisma.$transaction([
      // Total users in this org
      prisma.user.count({
        where: { organizationId },
      }),

      // Active users
      prisma.user.count({
        where: { organizationId, isActive: true },
      }),

      // Inactive users
      prisma.user.count({
        where: { organizationId, isActive: false },
      }),

      // Total roles (org-scoped + global)
      prisma.role.count({
        where: {
          OR: [{ organizationId }, { organizationId: null }],
          isActive: true,
        },
      }),

      // Role distribution — how many users per role
      prisma.$queryRaw`
        SELECT r.name AS role_name, COUNT(ur.id)::int AS user_count
        FROM roles r
        LEFT JOIN user_roles ur ON ur."roleId" = r.id
        LEFT JOIN users u ON u.id = ur."userId" AND u."organizationId" = ${organizationId}::uuid
        WHERE (r."organizationId" = ${organizationId}::uuid OR r."organizationId" IS NULL)
          AND r."isActive" = true
        GROUP BY r.id, r.name
        ORDER BY user_count DESC
      `,

      // Recent admin activity (last 20 audit log entries)
      prisma.auditLog.findMany({
        where: { organizationId },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
          ipAddress: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Users who logged in within last 24 hours
      prisma.user.count({
        where: {
          organizationId,
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const metrics = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        recentLogins,
      },
      roles: {
        total: totalRoles,
        distribution: roleDistribution,
      },
      recentActivity,
      generatedAt: new Date().toISOString(),
    };

    await cache.set(cacheKey, metrics, config.cache.dashboardTTL);

    return metrics;
  }
}

module.exports = new DashboardService();
