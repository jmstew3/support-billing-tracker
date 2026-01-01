import logger from '../services/logger.js';

/**
 * Middleware to log HTTP requests and responses
 * Captures request details, response status, and timing information
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    query: req.query,
    // Don't log request body in production for security/performance
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
  });

  // Capture response data
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;

    // Log response
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel]('Outgoing response', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });

    // If error response, log the error details
    if (res.statusCode >= 400 && data) {
      try {
        const errorData = typeof data === 'string' ? JSON.parse(data) : data;
        logger.error('Error response details', {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          error: errorData,
        });
      } catch (e) {
        // If parsing fails, just log the raw data
        logger.error('Error response (unparseable)', {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          data: data ? data.toString() : undefined,
        });
      }
    }

    originalSend.apply(res, arguments);
  };

  next();
};

export default requestLogger;
