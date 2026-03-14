const isUUID = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

const isPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
};

const validateBodyRequired = (requiredFields = []) => (req, res, next) => {
  const missing = requiredFields.filter((field) => {
    const value = req.body?.[field];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Faltan campos obligatorios: ${missing.join(', ')}`
    });
  }

  return next();
};

const validateUUIDParam = (paramName = 'id') => (req, res, next) => {
  const value = req.params?.[paramName];
  if (!isUUID(value)) {
    return res.status(400).json({ success: false, message: `${paramName} debe ser UUID válido` });
  }
  return next();
};

const validateIntParam = (paramName = 'id') => (req, res, next) => {
  const value = req.params?.[paramName];
  if (!isPositiveInt(value)) {
    return res.status(400).json({ success: false, message: `${paramName} debe ser un entero positivo` });
  }
  return next();
};

const validateArrayField = (fieldName) => (req, res, next) => {
  const value = req.body?.[fieldName];
  if (value !== undefined && !Array.isArray(value)) {
    return res.status(400).json({ success: false, message: `${fieldName} debe ser un arreglo` });
  }
  return next();
};

const validateDateParam = (paramName = 'fecha') => (req, res, next) => {
  const value = req.params?.[paramName];
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

  if (!valid) {
    return res.status(400).json({
      success: false,
      message: `${paramName} debe tener formato YYYY-MM-DD`
    });
  }

  return next();
};

module.exports = {
  validateBodyRequired,
  validateUUIDParam,
  validateIntParam,
  validateArrayField,
  validateDateParam,
  isUUID,
  isPositiveInt
};
