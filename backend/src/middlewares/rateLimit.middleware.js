const buckets = new Map();

const rateLimit = ({ windowMs = 60 * 1000, max = 120 } = {}) => (req, res, next) => {
  const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > max) {
    return res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes, intentá nuevamente más tarde'
    });
  }

  next();
};

module.exports = rateLimit;
