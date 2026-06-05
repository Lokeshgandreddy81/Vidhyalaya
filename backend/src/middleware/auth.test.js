import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './auth.js';

// Setup environment variable for testing
process.env.JWT_SECRET = 'test-secret-for-unit-tests';

function mockRes() {
  let statusResponse = null;
  let jsonResponse = null;
  return {
    status: (code) => {
      statusResponse = code;
      return {
        json: (data) => { jsonResponse = data; }
      };
    },
    getStatus: () => statusResponse,
    getJson: () => jsonResponse,
  };
}

describe('Auth Middleware - authenticateToken', () => {
  it('should return 401 if no token is provided', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = mock.fn();

    authenticateToken(req, res, next);

    assert.strictEqual(res.getStatus(), 401);
    assert.strictEqual(res.getJson().error, 'Authentication required');
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should return 401 if authorization header is missing the token part', () => {
    const req = { headers: { authorization: 'Bearer' } };
    const res = mockRes();
    const next = mock.fn();

    authenticateToken(req, res, next);

    // 'Bearer'.split(' ')[1] is undefined, so token == null → 401
    assert.strictEqual(res.getStatus(), 401);
    assert.strictEqual(res.getJson().error, 'Authentication required');
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should return 403 if token is invalid', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const res = mockRes();
    const next = mock.fn();

    authenticateToken(req, res, next);

    assert.strictEqual(res.getStatus(), 403);
    assert.strictEqual(res.getJson().error, 'Invalid or expired token');
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should return 401 with specific message if token is expired', () => {
    // Create a token that expired 1 hour ago
    const expiredToken = jwt.sign(
      { id: 'user-123' },
      process.env.JWT_SECRET,
      { expiresIn: '-1h', algorithm: 'HS256' }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = mockRes();
    const next = mock.fn();

    authenticateToken(req, res, next);

    assert.strictEqual(res.getStatus(), 401);
    assert.strictEqual(res.getJson().error, 'Token expired. Please log in again.');
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should call next and set req.user if token is valid', () => {
    const userPayload = { id: 'user-123', name: 'Test User' };
    const validToken = jwt.sign(userPayload, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const res = mockRes();
    const next = mock.fn();

    authenticateToken(req, res, next);

    assert.strictEqual(req.user.id, 'user-123');
    assert.strictEqual(req.user.name, 'Test User');
    assert.strictEqual(next.mock.calls.length, 1);
  });

  it('should reject tokens signed with wrong algorithm', () => {
    // HS384 token should be rejected when middleware only allows HS256
    const wrongAlgoToken = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET, { algorithm: 'HS384' });
    const req = { headers: { authorization: `Bearer ${wrongAlgoToken}` } };
    const res = mockRes();
    const next = mock.fn();

    authenticateToken(req, res, next);

    assert.strictEqual(res.getStatus(), 403);
    assert.strictEqual(next.mock.calls.length, 0);
  });
});
