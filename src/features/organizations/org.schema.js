// ============================================================================
// Organization Validation Schemas
// ============================================================================

const { z } = require('zod');

const createOrgSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(1000).optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

const orgIdParamSchema = z.object({
  id: z.string().uuid('Invalid organization ID format'),
});

module.exports = {
  createOrgSchema,
  updateOrgSchema,
  orgIdParamSchema,
};
