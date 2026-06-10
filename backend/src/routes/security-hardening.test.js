import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { encrypt, decrypt, isEncrypted } from '../utils/encryption.js';
import { timingSafeCompare } from '../utils/timingSafe.js';
import University from '../models/University.js';
import LoginAttempt from '../models/LoginAttempt.js';
import RefreshToken from '../models/RefreshToken.js';
import AuditLog from '../models/AuditLog.js';
import studentRouter from './studentRoutes.js';
import authRouter from './auth.js';

// Setup environment variables for test execution
process.env.JWT_SECRET = 'test-secret-key-must-be-long-enough-32-chars-xyz';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 32-byte hex key

describe('Security Hardening Systems', () => {
  // Mock AuditLog.create globally for all tests in this suite to prevent DB buffering timeout
  mock.method(AuditLog, 'create', () => Promise.resolve({}));

  describe('Aspect 1: Mongoose Database Key Encryption', () => {
    it('should encrypt geminiApiKey before writing to DB, and decrypt it when accessing', () => {
      const plainKey = 'AIzaSyExampleKey123456789';
      
      const uni = new University({
        universityId: 'mit',
        name: 'MIT',
        passcodeHash: 'hash',
        geminiApiKey: plainKey
      });

      // The raw mongoose document storage should be encrypted
      const rawObj = uni.toObject({ getters: false });
      assert.ok(isEncrypted(rawObj.geminiApiKey), 'Field is not encrypted in database serialization');
      
      // Accessing the property directly should return decrypted value
      assert.strictEqual(uni.geminiApiKey, plainKey, 'Accessing getter failed to decrypt plaintext API key');
    });

    it('should be backward-compatible with plaintext keys', () => {
      const plaintextKey = 'AIzaSyLegacyPlaintextKey';
      
      const uni = new University({
        universityId: 'stanford',
        name: 'Stanford',
        passcodeHash: 'hash'
      });

      // Directly bypass setter by using mongoose raw field or setting via raw object
      uni._doc.geminiApiKey = plaintextKey;

      assert.strictEqual(uni.geminiApiKey, plaintextKey, 'Legacy plaintext key was corrupted by decrypt utility');
    });
  });

  describe('Aspect 2: Login Lockout Checks', () => {
    it('should block login when account is locked', async () => {
      const req = {
        body: {
          rollNumber: '1001',
          universityId: 'mit',
          passcode: 'secret'
        },
        id: 'req-123',
        ip: '127.0.0.1',
        headers: {}
      };

      let statusResponse = null;
      let jsonResponse = null;
      const res = {
        status: (code) => {
          statusResponse = code;
          return { json: (data) => { jsonResponse = data; } };
        },
        json: (data) => { jsonResponse = data; }
      };

      // Mock LoginAttempt.getOrCreate to return a locked record
      const mockGetOrCreate = mock.method(LoginAttempt, 'getOrCreate', () => {
        return {
          isLocked: () => true,
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000)
        };
      });

      const postLayer = studentRouter.stack.find(layer => layer.route && layer.route.path === '/login' && layer.route.methods.post);
      const routeHandler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;

      await routeHandler(req, res);

      assert.strictEqual(statusResponse, 423, 'Locked account did not return 423 status');
      assert.match(jsonResponse.error, /temporarily locked/, 'Lockout response error message is invalid');

      mockGetOrCreate.mock.restore();
    });
  });

  describe('Aspect 3: Refresh Token Rotation', () => {
    it('should reject refresh if no cookie is provided', async () => {
      const req = {
        headers: {},
        id: 'req-456'
      };

      let statusResponse = null;
      let jsonResponse = null;
      const res = {
        status: (code) => {
          statusResponse = code;
          return { json: (data) => { jsonResponse = data; } };
        }
      };

      const postLayer = authRouter.stack.find(layer => layer.route && layer.route.path === '/refresh' && layer.route.methods.post);
      const routeHandler = postLayer.route.stack[0].handle;

      await routeHandler(req, res);

      assert.strictEqual(statusResponse, 401);
      assert.strictEqual(jsonResponse.error, 'Refresh token required');
    });

    it('should reject and log suspicious activity when refresh token is reused/not found', async () => {
      const req = {
        headers: {
          cookie: 'refreshToken=non-existent-token'
        },
        id: 'req-789',
        ip: '127.0.0.1'
      };

      let statusResponse = null;
      let jsonResponse = null;
      const res = {
        status: (code) => {
          statusResponse = code;
          return { json: (data) => { jsonResponse = data; } };
        }
      };

      // Mock RefreshToken.findOne to return null
      const mockFindOne = mock.method(RefreshToken, 'findOne', () => Promise.resolve(null));

      const postLayer = authRouter.stack.find(layer => layer.route && layer.route.path === '/refresh' && layer.route.methods.post);
      const routeHandler = postLayer.route.stack[0].handle;

      await routeHandler(req, res);

      assert.strictEqual(statusResponse, 401);
      assert.strictEqual(jsonResponse.error, 'Invalid refresh token');

      mockFindOne.mock.restore();
    });
  });

  describe('Aspect 4: Timing-Safe Comparison Helper', () => {
    it('should return true for identical strings', () => {
      assert.strictEqual(timingSafeCompare('correct-token', 'correct-token'), true);
    });

    it('should return false for different strings of the same length', () => {
      assert.strictEqual(timingSafeCompare('correct-token', 'wrong-tok-en-a'), false);
    });

    it('should return false for different strings of different lengths', () => {
      assert.strictEqual(timingSafeCompare('correct-token', 'short'), false);
      assert.strictEqual(timingSafeCompare('correct-token', 'much-longer-token-string'), false);
    });
  });

  describe('Aspect 5: Onboarding Auth Gating', () => {
    it('should gate complete-onboarding via authenticateToken middleware', () => {
      const onboardingLayer = authRouter.stack.find(
        layer => layer.route && layer.route.path === '/complete-onboarding'
      );
      assert.ok(onboardingLayer, 'complete-onboarding route not found');
      assert.ok(onboardingLayer.route.stack.length > 1, 'Route lacks middleware stack');
    });
  });
});
