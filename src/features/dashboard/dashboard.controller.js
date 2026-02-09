// ============================================================================
// Dashboard Controller
// ============================================================================

const dashboardService = require('./dashboard.service');
const { success } = require('../../utils/response');

const dashboardController = {
  async getMetrics(req, res, next) {
    try {
      const metrics = await dashboardService.getMetrics(req.tenant.id);
      return success(res, metrics);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;
