// ============================================================================
// Standardized API Response Helpers
// ============================================================================
// Every API response follows the same envelope structure for consistency:
//   { success, data, meta?, error? }
// ============================================================================

/**
 * Success response — 200/201.
 */
function success(res, data, statusCode = 200, meta = null) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * Paginated list response.
 */
function paginated(res, data, pagination) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      totalCount: pagination.totalCount,
      totalPages: Math.ceil(pagination.totalCount / pagination.limit),
    },
  });
}

/**
 * Error response — used by the global error handler.
 */
function error(res, statusCode, errorCode, message, details = null) {
  const body = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { success, paginated, error };
