// ============================================================================
// Auth Service — Business Logic
// ============================================================================
// Handles:
//   - Login (credential verification + token generation)
//   - Token refresh with rotation
//   - Logout (token revocation)
//   - Register (new user creation)
//
// Architectural notes:
//   - bcrypt.compare is timing-safe by design (prevents timing attacks).
//   - Refresh token rotation: every refresh creates a new token and invalidates
//     the old one. If a revoked token is reused ("replay attack"), we revoke
//     the entire family — forcing re-login on all devices.
//   - Access tokens are short-lived (15m) to limit blast radius if leaked.
//   - Refresh tokens are stored in DB with a family UUID for rotation tracking.
// ============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const prisma = require('../../config/database');
const { cache } = require('../../config/redis');
const {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require('../../utils/errors');
const { expiryToDate } = require('../../utils/helpers');
const logger = require('../../config/logger');

class AuthService {
  /**
   * Authenticate user with email + password.
   * Returns access token + refresh token pair.
   */
  async login({ email, password, organizationSlug }) {
    // Resolve organization first
    const organization = await prisma.organization.findUnique({
      where: { slug: organizationSlug },
    });

    if (!organization || !organization.isActive) {
      throw new NotFoundError('Organization');
    }

    // Find user within this tenant
    const user = await prisma.user.findUnique({
      where: {
        email_organizationId: { email, organizationId: organization.id },
      },
    });

    if (!user || !user.isActive) {
      // Generic message to prevent user enumeration
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password (bcrypt.compare is timing-safe)
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token pair
    const tokens = await this._generateTokenPair(user, organization.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Fetch user roles for the response
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: {
        role: {
          select: { id: true, name: true, description: true, isSystem: true },
        },
      },
    });

    logger.info({ userId: user.id, orgId: organization.id }, 'User logged in');

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: organization.id,
        userRoles,
      },
    };
  }

  /**
   * Register a new user in an organization.
   */
  async register({ email, password, firstName, lastName, organizationSlug }) {
    const organization = await prisma.organization.findUnique({
      where: { slug: organizationSlug },
    });

    if (!organization || !organization.isActive) {
      throw new NotFoundError('Organization');
    }

    // Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: {
        email_organizationId: { email, organizationId: organization.id },
      },
    });

    if (existingUser) {
      throw new ConflictError(
        'User with this email already exists in this organization',
      );
    }

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    // Find default role for this org (or global "USER" role)
    const defaultRole = await prisma.role.findFirst({
      where: {
        name: 'USER',
        OR: [{ organizationId: organization.id }, { organizationId: null }],
        isActive: true,
      },
      orderBy: { organizationId: 'desc' }, // Prefer org-specific over global
    });

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          organizationId: organization.id,
        },
      });

      // Assign default role if exists
      if (defaultRole) {
        await tx.userRole.create({
          data: {
            userId: newUser.id,
            roleId: defaultRole.id,
          },
        });
      }

      return newUser;
    });

    logger.info({ userId: user.id, orgId: organization.id }, 'User registered');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: organization.id,
    };
  }

  /**
   * Refresh token rotation.
   * The old refresh token is revoked, a new pair is issued.
   * If a revoked token is reused, the entire family is invalidated (security measure).
   */
  async refresh({ refreshToken }) {
    // Verify the refresh token JWT
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Look up the token record
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token not found');
    }

    // ── Replay Detection ─────────────────────────────────────────────
    // If this token was already revoked, someone is reusing an old token.
    // Revoke the entire family as a security measure.
    if (storedToken.isRevoked) {
      logger.warn(
        { userId: storedToken.userId, family: storedToken.family },
        'Refresh token replay detected — revoking entire family',
      );
      await prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError(
        'Token reuse detected — all sessions revoked',
      );
    }

    // Check expiry
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Check user is still active
    if (!storedToken.user || !storedToken.user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    // ── Rotate ───────────────────────────────────────────────────────
    // Revoke old token, create new one in the same family
    const [, tokens] = await Promise.all([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      }),
      this._generateTokenPair(
        storedToken.user,
        decoded.organizationId,
        storedToken.family,
      ),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logout — revokes the refresh token and blacklists the access token.
   */
  async logout({ accessToken, refreshToken, userId }) {
    // Blacklist the access token in Redis (TTL matches remaining lifetime)
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await cache.set(`blacklist:${accessToken}`, true, ttl);
          }
        }
      } catch {
        // Ignore decode failures — token might already be expired
      }
    }

    // Revoke the refresh token
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { isRevoked: true },
      });
    }

    logger.info({ userId }, 'User logged out');
  }

  /**
   * Force logout — revokes ALL refresh tokens for a user.
   * Used by admins to force-logout a compromised account.
   */
  async forceLogout(userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    // Invalidate permission cache
    await cache.delPattern(`permissions:${userId}:*`);

    logger.info({ userId }, 'All sessions force-revoked');
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  async _generateTokenPair(user, organizationId, family = null) {
    const tokenFamily = family || uuidv4();

    // Access token (short-lived, stateless)
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        organizationId,
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry },
    );

    // Refresh token (long-lived, stored in DB)
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        organizationId,
        family: tokenFamily,
      },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry },
    );

    // Persist refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        family: tokenFamily,
        expiresAt: expiryToDate(config.jwt.refreshExpiry),
      },
    });

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
