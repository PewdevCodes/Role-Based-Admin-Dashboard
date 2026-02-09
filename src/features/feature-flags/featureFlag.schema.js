// ============================================================================
// Feature Flag Schemas
// ============================================================================

const { z } = require('zod');

const upsertFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z_]+$/, 'Key must be UPPER_SNAKE_CASE'),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean(),
  roleId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

module.exports = { upsertFlagSchema };
