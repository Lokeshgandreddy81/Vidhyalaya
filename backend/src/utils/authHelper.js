import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';

/**
 * Generate a new short-lived access token and a rotated long-lived refresh token.
 * Stores the refresh token in MongoDB and attaches it to the client via an httpOnly cookie.
 * 
 * IMPORTANT: The access token payload is ALWAYS normalized to include a top-level `id` field.
 * This ensures `req.user.id` works uniformly in ALL route guards regardless of role
 * (user, student, admin), eliminating the IDOR gap where student tokens only had `studentId`.
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

  // 2. Resolve the canonical identifier. Always normalize to `id`.
  //    This is the single source of truth for req.user.id across all roles.
  const resolvedId = userPayload.id
    || userPayload.studentId
    || userPayload.universityId
    || userPayload.userId;

  if (!resolvedId) {
    throw new Error('userPayload must contain an identifying field (id, studentId, universityId, or userId)');
  }

  // 3. Build normalized payload — always includes `id` at the top level.
  const normalizedPayload = {
    ...userPayload,
    id: String(resolvedId), // canonical field — always present, always a string
    role,
  };

  // 4. Sign Access Token (HS256 enforced)
  const accessToken = jwt.sign(
    normalizedPayload,
    secret,
    { expiresIn: accessTokenExpiry, algorithm: 'HS256' }
  );

  // 5. Generate Cryptographically Secure Refresh Token
  const refreshTokenString = crypto.randomBytes(32).toString('hex');
  
  // Expiration: 7 days
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 6. Save to Persistent Session Store (for rotation validation)
  const refreshTokenDoc = new RefreshToken({
    token: refreshTokenString,
    userId: String(resolvedId),
    role,
    sessionData: userPayload, // store original payload for re-issuance on refresh
    expiresAt: refreshExpiry,
  });
  await refreshTokenDoc.save();

  // 7. Write secure cookie.
  // path is restricted to /api/auth/refresh to prevent browser sending it with every request.
  const isProduction = process.env.NODE_ENV === 'production';
  
  let cookieName = 'userRefreshToken';
  if (role === 'student') {
    cookieName = 'studentRefreshToken';
  } else if (role === 'admin') {
    cookieName = 'adminRefreshToken';
  }

  res.cookie(cookieName, refreshTokenString, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });

  return { accessToken, refreshToken: refreshTokenString };
}

