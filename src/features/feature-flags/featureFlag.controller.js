// ============================================================================
// Feature Flag Controller
// ============================================================================

const featureFlagService = require('./featureFlag.service');
const { success } = require('../../utils/response');

const featureFlagController = {
  async list(req, res, next) {
    try {
      const flags = await featureFlagService.listFlags(req.tenant.id);
      return success(res, flags);
    } catch (err) {
      next(err);
    }
  },

  async upsert(req, res, next) {
    try {
      const flag = await featureFlagService.upsertFlag({
        ...req.body,
        organizationId: req.body.organizationId || req.tenant.id,
      });
      return success(res, flag, 200);
    } catch (err) {
      next(err);
    }
  },

  async getUserFeatures(req, res, next) {
    try {
      // Get user's role IDs from their userRoles
      const prisma = require('../../config/database');
      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        select: { roleId: true },
      });
      const roleIds = userRoles.map((ur) => ur.roleId);

      const features = await featureFlagService.getUserFeatures(
        req.tenant.id,
        roleIds,
      );
      return success(res, features);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = featureFlagController;
