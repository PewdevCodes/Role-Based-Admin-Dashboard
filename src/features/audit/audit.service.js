// ============================================================================
// Audit Log Service
// ============================================================================
// Read-only service. Audit logs are immutable — no update/delete operations.
// Created automatically by the auditLog middleware.
// ============================================================================

const prisma = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');

class AuditService {
  async listAuditLogs(organizationId, query) {
    const { page, limit, skip } = parsePagination(query);

    const where = {
      organizationId,
      ...(query.action && { action: query.action }),
      ...(query.resource && { resource: query.resource }),
      ...(query.userId && { userId: query.userId }),
      ...((query.startDate || query.endDate) && {
        createdAt: {
          ...(query.startDate && { gte: query.startDate }),
          ...(query.endDate && { lte: query.endDate }),
        },
      }),
    };

    const [logs, totalCount] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          ipAddress: true,
          metadata: true,
          correlationId: true,
          createdAt: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder || 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, pagination: { page, limit, totalCount } };
  }
}

module.exports = new AuditService();
