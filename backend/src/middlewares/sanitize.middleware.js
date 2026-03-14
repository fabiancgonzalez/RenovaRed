const trimStrings = (input) => {
  if (typeof input === 'string') {
    return input.trim();
  }

  if (Array.isArray(input)) {
    return input.map(trimStrings);
  }

  if (input && typeof input === 'object') {
    return Object.keys(input).reduce((acc, key) => {
      acc[key] = trimStrings(input[key]);
      return acc;
    }, {});
  }

  return input;
};

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = trimStrings(req.body);
  }
  next();
};

module.exports = { sanitizeBody };
