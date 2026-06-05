import crypto from 'crypto';

/**
 * Request ID Middleware
 * Assigns a unique ID to every incoming request for traceability.
 * The ID is attached to `req.id` and returned in the `X-Request-Id` response header.
 */
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
