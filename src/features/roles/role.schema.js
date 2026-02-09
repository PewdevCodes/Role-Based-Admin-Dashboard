// ============================================================================
// Role Validation Schemas
// ============================================================================

const { z } = require('zod');

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const assignPermissionsSchema = z.object({
  permissionIds: z
    .array(z.string().uuid())
    .min(1, 'At least one permission is required'),
});

const roleIdParamSchema = z.object({
  id: z.string().uuid('Invalid role ID format'),
});

const roleListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().max(255).optional(),
  includeGlobal: z.enum(['true', 'false']).optional().default('true'),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  roleIdParamSchema,
  roleListQuerySchema,
};
