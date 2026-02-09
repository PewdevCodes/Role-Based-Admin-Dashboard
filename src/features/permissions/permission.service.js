// ============================================================================
// Permission Service
// ============================================================================
// Permissions are global (not tenant-scoped). They represent atomic actions.
// Only super-admins should create/modify permissions.
// ============================================================================

const prisma = require('../../config/database');
const { cache } = require('../../config/redis');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { parsePagination, pick } = require('../../utils/helpers');

class PermissionService {
  async listPermissions(query) {
    const { page, limit, skip } = parsePagination(query);

    const where = {
      ...(query.resource && { resource: query.resource }),
      ...(query.search && {
        OR: [
          { action: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [permissions, totalCount] = await prisma.$transaction([
      prisma.permission.findMany({
        where,
        select: {
          id: true,
          action: true,
          description: true,
          resource: true,
          isActive: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { resource: 'asc' },
      }),
      prisma.permission.count({ where }),
    ]);

    return { permissions, pagination: { page, limit, totalCount } };
  }

  async getPermissionById(id) {
    const permission = await prisma.permission.findUnique({
      where: { id },
      select: {
        id: true,
        action: true,
        description: true,
        resource: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!permission) throw new NotFoundError('Permission');
    return permission;
  }

  async createPermission(data) {
    const existing = await prisma.permission.findUnique({
      where: { action: data.action },
    });
    if (existing) {
      throw new ConflictError(`Permission "${data.action}" already exists`);
    }

    return prisma.permission.create({
      data: pick(data, ['action', 'description', 'resource']),
      select: {
        id: true,
        action: true,
        description: true,
        resource: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updatePermission(id, data) {
    const permission = await prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundError('Permission');

    const updated = await prisma.permission.update({
      where: { id },
      data: pick(data, ['description', 'isActive']),
    });

    // Invalidate all permission caches
    await cache.delPattern('permissions:*');

    return updated;
  }
}

module.exports = new PermissionService();
