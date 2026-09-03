import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set.');
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    // Synchronous verification — cleaner control flow than callback
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'], // Restrict to expected algorithm — prevents "none" algorithm attacks
    });

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
