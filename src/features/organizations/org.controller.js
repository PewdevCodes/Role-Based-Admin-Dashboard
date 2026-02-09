// ============================================================================
// Organization Controller
// ============================================================================

const orgService = require('./org.service');
const { success } = require('../../utils/response');

const orgController = {
  async list(req, res, next) {
    try {
      const organizations = await orgService.listOrganizations();
      return success(res, organizations);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const org = await orgService.getOrganizationById(req.params.id);
      return success(res, org);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const org = await orgService.createOrganization(req.body);
      return success(res, org, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const org = await orgService.updateOrganization(req.params.id, req.body);
      return success(res, org);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = orgController;
