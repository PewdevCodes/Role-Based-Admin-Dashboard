// ============================================================================
// Tenant Resolution Middleware
// ============================================================================
// Resolves the organization context from the authenticated user's JWT.
// Ensures every downstream DB query is scoped to the correct tenant.
//
// Design decision: tenant comes from JWT (set at login), NOT from a header
// or URL param. This prevents tenant-spoofing attacks. A user can only
// access data within their own organization.
//
// For super-admin access across tenants, a separate middleware can override
// the tenant filter.
// ============================================================================

const prisma = require('../config/database');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * Resolves and validates the tenant context.
 * Must run AFTER authenticate middleware.
 */

async function resolveTenant(req, _res, next) {
  try {
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return next(new ForbiddenError('No organization context'));
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    if (!organization) {
      return next(new NotFoundError('Organization'));
    }

    if (!organization.isActive) {
      return next(new ForbiddenError('Organization is deactivated'));
    }

    // Attach tenant context — all downstream queries use this
    req.tenant = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = resolveTenant;
