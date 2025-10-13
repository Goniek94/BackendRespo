// helpers/queryBuilder.js
// Query building utilities for user filtering

/**
 * Build MongoDB query object from filter options
 * @param {Object} options - Filter options
 * @returns {Object} MongoDB query object
 */
export const buildUserQuery = (options) => {
  const { search, role, status, dateFrom, dateTo } = options;
  const query = {};

  // Search in name and email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  return query;
};

/**
 * Build sort options for MongoDB query
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Object} MongoDB sort options
 */
export const buildSortOptions = (sortBy = "createdAt", sortOrder = "desc") => {
  return { [sortBy]: sortOrder === "desc" ? -1 : 1 };
};

/**
 * Calculate pagination metadata
 * @param {number} totalCount - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export const calculatePagination = (totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: parseInt(page),
    totalPages,
    totalCount,
    limit: parseInt(limit),
    hasNextPage,
    hasPrevPage,
  };
};
