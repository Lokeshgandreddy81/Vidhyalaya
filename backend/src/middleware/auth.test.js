import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './auth.js';

describe('Auth Middleware - authenticateToken', () => {
  it('should return 401 if no token is provided', () => {
    const req = { headers: {} };
    let statusResponse = null;
    let jsonResponse = null;
    const res = {
      status: (code) => {
        statusResponse = code;
        return { json: (data) => { jsonResponse = data; } };
      }
    };
    const next = mock.fn();

    authenticateToken(req, res, next);

    assert.strictEqual(statusResponse, 401);
    assert.strictEqual(jsonResponse.error, 'Authentication required');
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should return 401 if authorization header is missing the token part', () => {
    const req = { headers: { authorization: 'Bearer' } };
    let statusResponse = null;
    let jsonResponse = null;
    const res = {
      status: (code) => {
        statusResponse = code;
        return { json: (data) => { jsonResponse = data; } };
      }
    };
    const next = mock.fn();

    authenticateToken(req, res, next);

    assert.strictEqual(statusResponse, 401);
    assert.strictEqual(jsonResponse.error, 'Authentication required');
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should return 403 if token is invalid', () => {
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = 'test-secret';

      const req = { headers: { authorization: 'Bearer invalid-token' } };
      let statusResponse = null;
      let jsonResponse = null;
      const res = {
        status: (code) => {
          statusResponse = code;
          return { json: (data) => { jsonResponse = data; } };
        }
      };
      const next = mock.fn();

      // Mock jwt.verify to call callback with error
      const mockVerify = mock.method(jwt, 'verify', (token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      authenticateToken(req, res, next);

      assert.strictEqual(statusResponse, 403);
      assert.strictEqual(jsonResponse.error, 'Invalid or expired token');
      assert.strictEqual(next.mock.calls.length, 0);

      mockVerify.mock.restore();
    } finally {
      if (originalSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalSecret;
      }
    }
  });

  it('should call next and set req.user if token is valid', () => {
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = 'test-secret';

      const userPayload = { id: 'user-123', name: 'Test User' };
      const req = { headers: { authorization: 'Bearer valid-token' } };
      const res = {};
      const next = mock.fn();

      // Mock jwt.verify to call callback with user payload
      const mockVerify = mock.method(jwt, 'verify', (token, secret, callback) => {
        callback(null, userPayload);
      });

      authenticateToken(req, res, next);

      assert.strictEqual(req.user, userPayload);
      assert.strictEqual(next.mock.calls.length, 1);

      mockVerify.mock.restore();
    } finally {
      if (originalSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalSecret;
      }
    }
  });
});
