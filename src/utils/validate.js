// ============================================================================
// Zod Validation Middleware Factory
// ============================================================================
// Wraps Zod schemas into Express middleware. Validates body, params, and query
// separately, then merges errors into a single ValidationError.
// ============================================================================

const { ValidationError } = require('./errors');

/**
 * @param {object} schemas - { body?: ZodSchema, params?: ZodSchema, query?: ZodSchema }
 */
function validate(schemas) {
  return (req, _res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            source,
          });
        }
      } else {
        // Replace with parsed (coerced/transformed) values
        req[source] = result.data;
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors));
    }

    next();
  };
}

module.exports = validate;
