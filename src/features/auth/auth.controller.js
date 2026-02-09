// ============================================================================
// Auth Controller — Thin HTTP Layer
// ============================================================================
// Controllers do ONE thing: parse the HTTP request, call the service, and
// format the HTTP response. Zero business logic lives here.
// ============================================================================

const authService = require('./auth.service');
const { success } = require('../../utils/response');

const authController = {
  /**
   * POST /auth/login
   */
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return success(res, result, 200);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/register
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return success(res, result, 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const result = await authService.refresh(req.body);
      return success(res, result, 200);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/logout
   */
  async logout(req, res, next) {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];
      await authService.logout({
        accessToken,
        refreshToken: req.body.refreshToken,
        userId: req.user.id,
      });
      return success(res, { message: 'Logged out successfully' }, 200);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/force-logout/:userId
   */
  async forceLogout(req, res, next) {
    try {
      await authService.forceLogout(req.params.userId);
      return success(res, { message: 'All sessions revoked' }, 200);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
