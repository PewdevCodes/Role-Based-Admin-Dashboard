// ============================================================================
// Audit Log Validation Schemas
// ============================================================================

const { z } = require('zod');

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  action: z.string().max(100).optional(),
  resource: z.string().max(100).optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

module.exports = { auditLogQuerySchema };
