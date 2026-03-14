const { authenticate, authorize } = require('./auth.middleware');
const asyncHandler = require('./asyncHandler.middleware');
const { notFound, errorHandler } = require('./error.middleware');
const pagination = require('./pagination.middleware');
const { sanitizeBody } = require('./sanitize.middleware');
const requestLogger = require('./requestLogger.middleware');
const rateLimit = require('./rateLimit.middleware');
const {
  validateBodyRequired,
  validateUUIDParam,
  validateIntParam,
  validateArrayField,
  validateDateParam,
  isUUID,
  isPositiveInt
} = require('./validate.middleware');

module.exports = {
  authenticate,
  authorize,
  asyncHandler,
  notFound,
  errorHandler,
  pagination,
  sanitizeBody,
  requestLogger,
  rateLimit,
  validateBodyRequired,
  validateUUIDParam,
  validateIntParam,
  validateArrayField,
  validateDateParam,
  isUUID,
  isPositiveInt
};
