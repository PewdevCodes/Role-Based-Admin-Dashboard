// ============================================================================
// User Service — Business Logic
// ============================================================================
// Orchestrates user operations. This layer:
//   1. Enforces business rules (e.g., can't deactivate yourself)
//   2. Prevents mass-assignment by picking only allowed fields
//   3. Handles password hashing for creates
//   4. Invalidates Redis permission cache on role changes
//   5. Delegates data access to the repository
// ============================================================================

const bcrypt = require('bcrypt');
const config = require('../../config');
const userRepository = require('./user.repository');
const { cache } = require('../../config/redis');
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require('../../utils/errors');
const { pick, parsePagination, parseSorting } = require('../../utils/helpers');

class UserService {
  async listUsers(organizationId, query) {
    const { page, limit, skip } = parsePagination(query);
    const orderBy = parseSorting(query, [
      'createdAt',
      'email',
      'firstName',
      'lastName',
    ]);

    const { users, totalCount } = await userRepository.findAll(organizationId, {
      skip,
      limit,
      orderBy,
      search: query.search,
      isActive: query.isActive,
    });

    return { users, pagination: { page, limit, totalCount } };
  }

  async getUserById(id, organizationId) {
    const user = await userRepository.findById(id, organizationId);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async createUser(data, organizationId) {
    // Check for duplicate email within tenant
    const existing = await userRepository.findByEmail(
      data.email,
      organizationId,
    );
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(
      data.password,
      config.bcrypt.saltRounds,
    );

    // Prevent mass-assignment — only allow whitelisted fields
    const userData = {
      ...pick(data, ['email', 'firstName', 'lastName']),
      passwordHash,
    };

    const user = await userRepository.create(userData, organizationId);

    // Assign roles if provided
    if (data.roleIds && data.roleIds.length > 0) {
      return userRepository.assignRoles(
        user.id,
        organizationId,
        data.roleIds,
        null,
      );
    }

    return user;
  }

  async updateUser(id, organizationId, data) {
    const user = await userRepository.findById(id, organizationId);
    if (!user) throw new NotFoundError('User');

    // Only allow specific fields to be updated (prevent mass-assignment)
    const updateData = pick(data, [
      'firstName',
      'lastName',
      'email',
      'isActive',
    ]);

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    // If email is being changed, check for conflicts
    if (updateData.email && updateData.email !== user.email) {
      const existing = await userRepository.findByEmail(
        updateData.email,
        organizationId,
      );
      if (existing) throw new ConflictError('Email already in use');
    }

    const updated = await userRepository.findAndUpdate(
      id,
      organizationId,
      updateData,
    );
    return updated;
  }

  async deactivateUser(id, organizationId, requestingUserId) {
    if (id === requestingUserId) {
      throw new BadRequestError('Cannot deactivate your own account');
    }

    const user = await userRepository.findById(id, organizationId);
    if (!user) throw new NotFoundError('User');

    const deactivated = await userRepository.deactivate(id, organizationId);

    // Invalidate permission cache for this user
    await cache.delPattern(`permissions:${id}:*`);

    return deactivated;
  }

  async activateUser(id, organizationId) {
    const user = await userRepository.findById(id, organizationId);
    if (!user) throw new NotFoundError('User');

    return userRepository.activate(id, organizationId);
  }

  async assignRoles(userId, organizationId, roleIds, assignedBy) {
    const user = await userRepository.findById(userId, organizationId);
    if (!user) throw new NotFoundError('User');

    const updated = await userRepository.assignRoles(
      userId,
      organizationId,
      roleIds,
      assignedBy,
    );

    // Invalidate permission cache — roles have changed
    await cache.delPattern(`permissions:${userId}:*`);

    return updated;
  }
}

module.exports = new UserService();
