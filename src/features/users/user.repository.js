// ============================================================================
// User Repository — Data Access Layer
// ============================================================================
// All Prisma queries for the User entity live here. Services call
// repository methods — never Prisma directly. This enables:
//   1. Consistent tenant-scoping (every query filters by organizationId)
//   2. Select only needed fields (no password leaks)
//   3. Eager loading decisions documented in one place
//   4. Easy testing via dependency injection
//
// N+1 prevention: We use `include` for eager loading of roles & permissions
// on single-user fetches, and explicit `select` on list endpoints.
// ============================================================================

const { BadRequestError } = require('../../utils/errors');
// ============================================================================

const prisma = require('../../config/database');

// Fields to return for user objects (never expose passwordHash)
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  emailVerified: true,
  lastLoginAt: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
};

const USER_WITH_ROLES = {
  ...USER_SELECT,
  userRoles: {
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
          isSystem: true,
        },
      },
    },
  },
};

class UserRepository {
  /**
   * Find all users within a tenant with pagination, search, and sorting.
   */
  async findAll(organizationId, { skip, limit, orderBy, search, isActive }) {
    const where = {
      organizationId,
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, totalCount] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: USER_WITH_ROLES,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, totalCount };
  }

  /**
   * Find a single user by ID within the tenant.
   * Eager loads roles to avoid N+1 on role display.
   */
  async findById(id, organizationId) {
    return prisma.user.findFirst({
      where: { id, organizationId },
      select: USER_WITH_ROLES,
    });
  }

  /**
   * Find by email within tenant.
   */
  async findByEmail(email, organizationId) {
    return prisma.user.findUnique({
      where: { email_organizationId: { email, organizationId } },
      select: USER_SELECT,
    });
  }

  /**
   * Create a new user within the tenant.
   */
  async create(data, organizationId) {
    return prisma.user.create({
      data: { ...data, organizationId },
      select: USER_SELECT,
    });
  }

  /**
   * Update user fields. Only whitelisted fields via pick() in the service.
   */
  async update(id, organizationId, data) {
    return prisma.user.updateMany({
      where: { id, organizationId },
      data,
    });
  }

  /**
   * Get updated user after update.
   */
  async findAndUpdate(id, organizationId, data) {
    // First verify the user belongs to this org
    const user = await prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!user) return null;

    return prisma.user.update({
      where: { id },
      data,
      select: USER_WITH_ROLES,
    });
  }

  /**
   * Soft-delete (deactivate) a user.
   */
  async deactivate(id, organizationId) {
    return this.findAndUpdate(id, organizationId, { isActive: false });
  }

  /**
   * Activate a user.
   */
  async activate(id, organizationId) {
    return this.findAndUpdate(id, organizationId, { isActive: true });
  }

  /**
   * Replace all roles for a user (within the tenant).
   * Uses a transaction to atomically delete old + insert new.
   * Prevents privilege escalation: only roles scoped to the tenant
   * (or global roles) can be assigned.
   */
  async assignRoles(userId, organizationId, roleIds, assignedBy) {
    return prisma.$transaction(async (tx) => {
      // Validate that all roles are accessible to this tenant
      const validRoles = await tx.role.findMany({
        where: {
          id: { in: roleIds },
          isActive: true,
          OR: [
            { organizationId }, // Org-scoped roles
            { organizationId: null }, // Global roles
          ],
        },
        select: { id: true },
      });

      const validRoleIds = validRoles.map((r) => r.id);
      const invalidRoleIds = roleIds.filter((id) => !validRoleIds.includes(id));

      if (invalidRoleIds.length > 0) {
        throw new BadRequestError(
          `Invalid or inaccessible role IDs: ${invalidRoleIds.join(', ')}`,
        );
      }

      // Remove existing roles
      await tx.userRole.deleteMany({ where: { userId } });

      // Assign new roles
      await tx.userRole.createMany({
        data: validRoleIds.map((roleId) => ({
          userId,
          roleId,
          assignedBy,
        })),
      });

      return tx.user.findUnique({
        where: { id: userId },
        select: USER_WITH_ROLES,
      });
    });
  }
}

module.exports = new UserRepository();
