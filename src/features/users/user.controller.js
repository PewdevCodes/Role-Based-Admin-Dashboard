// ============================================================================
// User Controller — Thin HTTP Layer
// ============================================================================

const userService = require('./user.service');
const { success, paginated } = require('../../utils/response');

const userController = {
  /**
   * GET /users
   */
  async list(req, res, next) {
    try {
      const { users, pagination } = await userService.listUsers(
        req.tenant.id,
        req.query,
      );
      return paginated(res, users, pagination);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /users/:id
   */
  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id, req.tenant.id);
      return success(res, user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /users
   */
  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body, req.tenant.id);
      return success(res, user, 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /users/:id
   */
  async update(req, res, next) {
    try {
      const user = await userService.updateUser(
        req.params.id,
        req.tenant.id,
        req.body,
      );
      return success(res, user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /users/:id/deactivate
   */
  async deactivate(req, res, next) {
    try {
      const user = await userService.deactivateUser(
        req.params.id,
        req.tenant.id,
        req.user.id,
      );
      return success(res, user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /users/:id/activate
   */
  async activate(req, res, next) {
    try {
      const user = await userService.activateUser(req.params.id, req.tenant.id);
      return success(res, user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /users/:id/roles
   */
  async assignRoles(req, res, next) {
    try {
      const user = await userService.assignRoles(
        req.params.id,
        req.tenant.id,
        req.body.roleIds,
        req.user.id,
      );
      return success(res, user);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userController;
