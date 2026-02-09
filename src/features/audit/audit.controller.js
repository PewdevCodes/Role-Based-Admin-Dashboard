// ============================================================================
// Audit Log Controller
// ============================================================================

const auditService = require('./audit.service');
const { paginated } = require('../../utils/response');

const auditController = {
  async list(req, res, next) {
    try {
      const { logs, pagination } = await auditService.listAuditLogs(
        req.tenant.id,
        req.query,
      );
      return paginated(res, logs, pagination);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = auditController;
