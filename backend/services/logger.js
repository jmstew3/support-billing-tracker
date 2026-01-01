import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Custom format for console output with colors and structured data
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    const metadataKeys = Object.keys(metadata).filter(key => key !== 'timestamp' && key !== 'level' && key !== 'message');
    if (metadataKeys.length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }

    return msg;
  })
);

/**
 * Format for file output with structured JSON
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create transports based on environment
 */
const createTransports = () => {
  const transports = [
    // Console transport for all environments
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info',
    })
  ];

  // File transports for production
  if (process.env.NODE_ENV === 'production') {
    // Ensure logs directory exists
    const logsDir = path.join(__dirname, '..', 'logs');

    // Error log file - only errors
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );

    // Combined log file - all logs
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  return transports;
};

/**
 * Create and configure the Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'support-billing-tracker',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: createTransports(),
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

/**
 * Handle uncaught exceptions and unhandled rejections
 */
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'exceptions.log')
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'rejections.log')
    })
  );
}

/**
 * Create a child logger with additional metadata
 * @param {Object} metadata - Additional metadata to include in all logs
 * @returns {winston.Logger} Child logger instance
 */
logger.child = (metadata) => {
  return logger.child(metadata);
};

/**
 * Stream for Morgan HTTP request logging
 */
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export default logger;
