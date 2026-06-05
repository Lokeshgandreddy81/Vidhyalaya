import jwt from 'jsonwebtoken';

/**
 * Middleware: requireAdminAuth
 * Verifies the Authorization: Bearer <admin-jwt> header.
 * Attaches req.universityId and req.universityName on success.
 */
const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin JWT required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Restrict to expected algorithm
    });

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin role required.' });
    }

    req.universityId = decoded.universityId;
    req.universityName = decoded.universityName;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin token.' });
  }
};

export default requireAdminAuth;
