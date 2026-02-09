// ============================================================================
// Role Controller
// ============================================================================

const roleService = require('./role.service');
const { success, paginated } = require('../../utils/response');

const roleController = {
  async list(req, res, next) {
    try {
      const { roles, pagination } = await roleService.listRoles(
        req.tenant.id,
        req.query,
      );
      return paginated(res, roles, pagination);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const role = await roleService.getRoleById(req.params.id, req.tenant.id);
      return success(res, role);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const role = await roleService.createRole(req.body, req.tenant.id);
      return success(res, role, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const role = await roleService.updateRole(
        req.params.id,
        req.tenant.id,
        req.body,
      );
      return success(res, role);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const role = await roleService.deleteRole(req.params.id, req.tenant.id);
      return success(res, role);
    } catch (err) {
      next(err);
    }
  },

  async assignPermissions(req, res, next) {
    try {
      const role = await roleService.assignPermissions(
        req.params.id,
        req.tenant.id,
        req.body.permissionIds,
        req.user.id,
      );
      return success(res, role);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = roleController;
