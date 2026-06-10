import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-byok-api-key"]',
      'req.headers["x-user-gemini-key"]',
      'req.headers["x-embedding-api-key"]',
      'req.headers["x-user-gemini-byok"]'
    ],
    censor: '[REDACTED]'
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Middleware to attach a request-specific child logger.
 */
export function loggerMiddleware(req, res, next) {
  req.log = logger.child({ requestId: req.id || 'system' });
  next();
}

export default logger;
