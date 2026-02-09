// ============================================================================
// Auth Validation Schemas (Zod)
// ============================================================================

const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  organizationSlug: z.string().min(1).max(100),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  organizationSlug: z.string().min(1).max(100),
});

module.exports = { loginSchema, refreshTokenSchema, registerSchema };
