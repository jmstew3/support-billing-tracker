/**
 * Pagination Middleware
 *
 * Parses, validates, and sanitizes pagination query parameters.
 * Attaches pagination object to req for use in route handlers.
 *
 * Query Parameters:
 * - page: Current page number (default: 1, min: 1)
 * - limit: Items per page (default: 20, min: 1, max: 100)
 * - offset: Alternative to page (default: 0, min: 0)
 *
 * Attached to req.pagination:
 * - page: Validated page number
 * - limit: Validated limit
 * - offset: Calculated offset (page - 1) * limit
 *
 * @module middleware/pagination
 */

/**
 * Default pagination configuration
 */
const DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  MIN_PAGE: 1,
  MIN_OFFSET: 0,
};

/**
 * Parses and validates an integer query parameter
 *
 * @param {string|number} value - Query parameter value
 * @param {number} defaultValue - Default value if parsing fails
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value (optional)
 * @returns {number} Validated integer
 */
function parseIntParam(value, defaultValue, min, max = Infinity) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return defaultValue;
  }

  // Apply bounds
  if (parsed < min) {
    return min;
  }

  if (parsed > max) {
    return max;
  }

  return parsed;
}

/**
 * Pagination middleware factory
 *
 * @param {Object} options - Configuration options
 * @param {number} [options.defaultPage=1] - Default page number
 * @param {number} [options.defaultLimit=20] - Default items per page
 * @param {number} [options.maxLimit=100] - Maximum items per page
 * @param {number} [options.minLimit=1] - Minimum items per page
 * @returns {Function} Express middleware function
 */
export function paginationMiddleware(options = {}) {
  const config = {
    defaultPage: options.defaultPage || DEFAULTS.PAGE,
    defaultLimit: options.defaultLimit || DEFAULTS.LIMIT,
    maxLimit: options.maxLimit || DEFAULTS.MAX_LIMIT,
    minLimit: options.minLimit || DEFAULTS.MIN_LIMIT,
  };

  return function pagination(req, res, next) {
    // Parse page parameter
    const page = parseIntParam(
      req.query.page,
      config.defaultPage,
      DEFAULTS.MIN_PAGE
    );

    // Parse limit parameter
    const limit = parseIntParam(
      req.query.limit,
      config.defaultLimit,
      config.minLimit,
      config.maxLimit
    );

    // Parse offset parameter (alternative to page)
    const offset = parseIntParam(
      req.query.offset,
      (page - 1) * limit, // Calculate from page if offset not provided
      DEFAULTS.MIN_OFFSET
    );

    // Attach pagination object to request
    req.pagination = {
      page,
      limit,
      offset,
    };

    next();
  };
}

/**
 * Default pagination middleware with standard settings
 */
export const pagination = paginationMiddleware();

/**
 * Helper function to generate pagination metadata for responses
 *
 * @param {number} totalItems - Total number of items in the dataset
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export function getPaginationMeta(totalItems, page, limit) {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    totalItems,
    totalPages,
    currentPage: page,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
}

/**
 * Middleware to add pagination metadata to response
 *
 * Usage:
 * router.get('/items', pagination, async (req, res) => {
 *   const items = await getItems(req.pagination);
 *   const total = await getItemsCount();
 *   res.paginatedJson(items, total);
 * });
 */
export function paginationResponse(req, res, next) {
  /**
   * Send paginated JSON response
   *
   * @param {Array} data - Response data
   * @param {number} total - Total item count
   */
  res.paginatedJson = function(data, total) {
    const { page, limit } = req.pagination;
    const meta = getPaginationMeta(total, page, limit);

    this.json({
      data,
      meta,
    });
  };

  next();
}

export default {
  pagination,
  paginationMiddleware,
  paginationResponse,
  getPaginationMeta,
};
