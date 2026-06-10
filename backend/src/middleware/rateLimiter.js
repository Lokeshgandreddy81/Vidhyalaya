import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Auth Rate Limiter
 * Prevents brute-force attacks on login/register endpoints.
 * - DEV: Disabled (skip: always true) — so local testing never hits limits.
 * - PROD: 20 attempts per 15-minute window per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 requests per window in production
  skip: () => isDev,         // Completely disabled in development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

/**
 * General API Rate Limiter
 * Prevents abuse on general API endpoints.
 * - DEV: Disabled.
 * - PROD: 200 requests per minute per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
});
