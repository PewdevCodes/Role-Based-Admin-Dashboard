// ============================================================================
// User Validation Schemas (Zod)
// ============================================================================

const { z } = require('zod');

const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roleIds: z.array(z.string().uuid()).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  isActive: z.boolean().optional(),
});

const assignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1, 'At least one role is required'),
});

const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z
    .enum(['createdAt', 'email', 'firstName', 'lastName'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().max(255).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  assignRolesSchema,
  userIdParamSchema,
  userListQuerySchema,
};
