import rateLimit from 'express-rate-limit';

/**
 * Auth Rate Limiter
 * Prevents brute-force attacks on login/register endpoints.
 * - 10 attempts per 15-minute window per IP.
 * - Returns 429 with a standardized error response.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 requests per window
  standardHeaders: true,     // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

/**
 * General API Rate Limiter
 * Prevents abuse on general API endpoints.
 * - 100 requests per minute per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
});
