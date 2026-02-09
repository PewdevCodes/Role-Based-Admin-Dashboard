// ============================================================================
// Permission Validation Schemas
// ============================================================================

const { z } = require('zod');

const createPermissionSchema = z.object({
  action: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z_]+$/, 'Action must be UPPER_SNAKE_CASE'),
  description: z.string().max(500).optional(),
  resource: z.string().min(1).max(100),
});

const updatePermissionSchema = z.object({
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const permissionIdParamSchema = z.object({
  id: z.string().uuid('Invalid permission ID format'),
});

const permissionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  resource: z.string().max(100).optional(),
  search: z.string().max(255).optional(),
});

module.exports = {
  createPermissionSchema,
  updatePermissionSchema,
  permissionIdParamSchema,
  permissionListQuerySchema,
};
