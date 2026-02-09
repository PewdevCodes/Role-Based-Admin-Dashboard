// ============================================================================
// Role Service — Business Logic
// ============================================================================

const roleRepository = require('./role.repository');
const { cache } = require('../../config/redis');
const {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('../../utils/errors');
const { parsePagination, parseSorting, pick } = require('../../utils/helpers');

class RoleService {
  async listRoles(organizationId, query) {
    const { page, limit, skip } = parsePagination(query);
    const orderBy = parseSorting(query, ['createdAt', 'name']);

    const { roles, totalCount } = await roleRepository.findAll(organizationId, {
      skip,
      limit,
      orderBy,
      search: query.search,
      includeGlobal: query.includeGlobal,
    });

    return { roles, pagination: { page, limit, totalCount } };
  }

  async getRoleById(id, organizationId) {
    const role = await roleRepository.findById(id, organizationId);
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async createRole(data, organizationId) {
    // Check for duplicate name within this org scope
    const existing = await roleRepository.findByName(data.name, organizationId);
    if (existing) {
      throw new ConflictError(`Role "${data.name}" already exists`);
    }

    return roleRepository.create(
      pick(data, ['name', 'description']),
      organizationId,
    );
  }

  async updateRole(id, organizationId, data) {
    const role = await roleRepository.findById(id, organizationId);
    if (!role) throw new NotFoundError('Role');

    if (role.isSystem) {
      throw new ForbiddenError('Cannot modify a system role');
    }

    // Only allow org-scoped roles to be edited (not global roles by tenant admins)
    if (role.organizationId === null) {
      throw new ForbiddenError('Cannot modify a global role');
    }

    const updateData = pick(data, ['name', 'description', 'isActive']);
    const updated = await roleRepository.update(id, organizationId, updateData);

    // Invalidate all permission caches for users with this role
    await cache.delPattern('permissions:*');

    return updated;
  }

  async deleteRole(id, organizationId) {
    const role = await roleRepository.findById(id, organizationId);
    if (!role) throw new NotFoundError('Role');

    if (role.isSystem) {
      throw new ForbiddenError('Cannot delete a system role');
    }
    if (role.organizationId === null) {
      throw new ForbiddenError('Cannot delete a global role');
    }

    const deleted = await roleRepository.delete(id, organizationId);

    // Invalidate all permission caches
    await cache.delPattern('permissions:*');

    return deleted;
  }

  async assignPermissions(roleId, organizationId, permissionIds, assignedBy) {
    const result = await roleRepository.assignPermissions(
      roleId,
      organizationId,
      permissionIds,
      assignedBy,
    );

    if (!result) throw new NotFoundError('Role');

    // Invalidate all permission caches (role change affects all users with this role)
    await cache.delPattern('permissions:*');

    return result;
  }
}

module.exports = new RoleService();
