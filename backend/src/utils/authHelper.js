import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';

/**
 * Generate a new short-lived access token and a rotated long-lived refresh token.
 * Stores the refresh token in MongoDB and attaches it to the client via an httpOnly cookie.
 * 
 * @param {object} userPayload - Claims to store in access token (must contain identifier field)
 * @param {string} role - 'user' | 'student' | 'admin'
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {Promise<object>} { accessToken, refreshToken }
 */
export async function generateTokens(userPayload, role, req, res) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  // 1. Determine Access Token Expiration (best-practice short lifecycle)
  const accessTokenExpiry = role === 'admin' ? '1h' : '15m';

  // 2. Sign Access Token (HS256 enforced)
  const accessToken = jwt.sign(
    { ...userPayload, role },
    secret,
    { expiresIn: accessTokenExpiry, algorithm: 'HS256' }
  );

  // 3. Generate Cryptographically Secure Refresh Token
  const refreshTokenString = crypto.randomBytes(32).toString('hex');
  
  // Expiration: 7 days
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 4. Save to Persistent Session Store (for rotation validation)
  const userId = userPayload.id || userPayload.studentId || userPayload.universityId || userPayload.userId;
  if (!userId) {
    throw new Error('userPayload must contain an identifying field (id, studentId, or universityId)');
  }

  const refreshTokenDoc = new RefreshToken({
    token: refreshTokenString,
    userId,
    role,
    sessionData: userPayload,
    expiresAt: refreshExpiry,
  });
  await refreshTokenDoc.save();

  // 5. Write secure cookie. 
  // path is restricted to /api/auth/refresh to prevent browser sending it with every static/API asset request.
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshTokenString, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });

  return { accessToken, refreshToken: refreshTokenString };
}
