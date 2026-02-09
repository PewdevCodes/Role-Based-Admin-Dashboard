// ============================================================================
// Role Repository — Data Access Layer
// ============================================================================

const prisma = require('../../config/database');
const { ForbiddenError } = require('../../utils/errors');

const ROLE_SELECT = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
  isActive: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
};

const ROLE_WITH_PERMISSIONS = {
  ...ROLE_SELECT,
  rolePermissions: {
    include: {
      permission: {
        select: {
          id: true,
          action: true,
          description: true,
          resource: true,
        },
      },
    },
  },
  _count: {
    select: { userRoles: true },
  },
};

class RoleRepository {
  /**
   * List roles for a tenant. Optionally include global roles.
   */
  async findAll(
    organizationId,
    { skip, limit, orderBy, search, includeGlobal },
  ) {
    const where = {
      AND: [
        {
          OR: [
            { organizationId },
            ...(includeGlobal === 'true' ? [{ organizationId: null }] : []),
          ],
        },
        ...(search
          ? [{ name: { contains: search, mode: 'insensitive' } }]
          : []),
      ],
    };

    const [roles, totalCount] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        select: ROLE_WITH_PERMISSIONS,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.role.count({ where }),
    ]);

    return { roles, totalCount };
  }

  async findById(id, organizationId) {
    return prisma.role.findFirst({
      where: {
        id,
        OR: [{ organizationId }, { organizationId: null }],
      },
      select: ROLE_WITH_PERMISSIONS,
    });
  }

  async findByName(name, organizationId) {
    return prisma.role.findFirst({
      where: {
        name,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
  }

  async create(data, organizationId) {
    return prisma.role.create({
      data: { ...data, organizationId },
      select: ROLE_SELECT,
    });
  }

  async update(id, organizationId, data) {
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
    });
    if (!role) return null;

    return prisma.role.update({
      where: { id },
      data,
      select: ROLE_WITH_PERMISSIONS,
    });
  }

  async delete(id, organizationId) {
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
    });
    if (!role) return null;

    // Soft delete
    return prisma.role.update({
      where: { id },
      data: { isActive: false },
      select: ROLE_SELECT,
    });
  }

  /**
   * Replace all permissions for a role.
   */
  async assignPermissions(roleId, organizationId, permissionIds, assignedBy) {
    return prisma.$transaction(async (tx) => {
      // Verify role belongs to this org
      const role = await tx.role.findFirst({
        where: {
          id: roleId,
          OR: [{ organizationId }, { organizationId: null }],
        },
      });
      if (!role) return null;

      // Cannot modify system roles
      if (role.isSystem) {
        throw new ForbiddenError('Cannot modify permissions of a system role');
      }

      // Verify all permissions exist
      const validPermissions = await tx.permission.findMany({
        where: { id: { in: permissionIds }, isActive: true },
        select: { id: true },
      });

      const validIds = validPermissions.map((p) => p.id);

      // Remove old permissions
      await tx.rolePermission.deleteMany({ where: { roleId } });

      // Assign new permissions
      await tx.rolePermission.createMany({
        data: validIds.map((permissionId) => ({
          roleId,
          permissionId,
          assignedBy,
        })),
      });

      return tx.role.findUnique({
        where: { id: roleId },
        select: ROLE_WITH_PERMISSIONS,
      });
    });
  }
}

module.exports = new RoleRepository();
