const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const elapsedMs = Date.now() - start;
    const userId = req.user?.id || 'anonymous';
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${elapsedMs}ms - user:${userId}`);
  });

  next();
};

module.exports = requestLogger;
