const pagination = (defaultLimit = 20, maxLimit = 100) => (req, res, next) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const requestedLimit = parseInt(req.query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);
  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };
  next();
};

module.exports = pagination;
