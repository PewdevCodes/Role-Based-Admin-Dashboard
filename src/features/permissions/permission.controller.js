// ============================================================================
// Permission Controller
// ============================================================================

const permissionService = require('./permission.service');
const { success, paginated } = require('../../utils/response');

const permissionController = {
  async list(req, res, next) {
    try {
      const { permissions, pagination } =
        await permissionService.listPermissions(req.query);
      return paginated(res, permissions, pagination);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const permission = await permissionService.getPermissionById(
        req.params.id,
      );
      return success(res, permission);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const permission = await permissionService.createPermission(req.body);
      return success(res, permission, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const permission = await permissionService.updatePermission(
        req.params.id,
        req.body,
      );
      return success(res, permission);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = permissionController;
