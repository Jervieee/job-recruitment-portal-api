const getPagination = (query = {}, defaultLimit = 10, maxLimit = 100) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const rawLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildPaginationMeta = ({ page, limit, total }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = { getPagination, buildPaginationMeta };
