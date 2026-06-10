import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import UserProfile from '../models/UserProfile.js';
import AuditLog from '../models/AuditLog.js';
import RefreshToken from '../models/RefreshToken.js';
import authRouter from './auth.js';

// Ensure environment variables are loaded
process.env.JWT_SECRET = 'test-secret-key-must-be-long-enough-32-chars-xyz';
process.env.GEMINI_API_KEY = 'AIzaSyTestSandboxKey123';

describe('Sandbox OTP Verification and Session Tracking', () => {
  // Mock AuditLog.create globally for all tests in this suite
  mock.method(AuditLog, 'create', () => Promise.resolve({}));
  mock.method(RefreshToken.prototype, 'save', () => Promise.resolve({}));

  it('should initialize a temporary sandbox user, return 403 with devCode OTP, and verify via verify-email', async () => {
    let savedProfile = null;
    
    // Mock UserProfile.prototype.save
    const mockSave = mock.method(UserProfile.prototype, 'save', function() {
      savedProfile = this;
      return Promise.resolve(this);
    });

    // Mock UserProfile.findOne
    const mockFindOne = mock.method(UserProfile, 'findOne', (query) => {
      if (savedProfile && query.email === savedProfile.email) {
        return Promise.resolve(savedProfile);
      }
      return Promise.resolve(null);
    });

    // 1. Test POST /sandbox-request
    const reqRequest = {
      body: {},
      id: 'req-sandbox-req',
      ip: '127.0.0.1',
      headers: {}
    };

    let statusResponse = null;
    let jsonResponse = null;
    const resRequest = {
      status: (code) => {
        statusResponse = code;
        return { json: (data) => { jsonResponse = data; } };
      },
      json: (data) => { jsonResponse = data; },
      cookie: () => {}
    };

    const requestLayer = authRouter.stack.find(layer => layer.route && layer.route.path === '/sandbox-request' && layer.route.methods.post);
    const requestHandler = requestLayer.route.stack[requestLayer.route.stack.length - 1].handle;

    await requestHandler(reqRequest, resRequest);

    assert.strictEqual(statusResponse, 403);
    assert.strictEqual(jsonResponse.requiresVerification, true);
    assert.ok(jsonResponse.email.endsWith('@cortex.sandbox'));
    assert.ok(jsonResponse.devCode);
    assert.strictEqual(savedProfile.authProvider, 'sandbox');
    assert.strictEqual(savedProfile.isEmailVerified, false);
    assert.strictEqual(savedProfile.emailVerificationCode, jsonResponse.devCode);

    // 2. Test POST /verify-email using the generated code and email
    const reqVerify = {
      body: {
        email: jsonResponse.email,
        code: jsonResponse.devCode
      },
      id: 'req-sandbox-verify',
      ip: '127.0.0.1',
      headers: {}
    };

    let verifyStatusResponse = null;
    let verifyJsonResponse = null;
    const resVerify = {
      status: (code) => {
        verifyStatusResponse = code;
        return { json: (data) => { verifyJsonResponse = data; } };
      },
      json: (data) => { verifyJsonResponse = data; },
      cookie: () => {}
    };

    const verifyLayer = authRouter.stack.find(layer => layer.route && layer.route.path === '/verify-email' && layer.route.methods.post);
    const verifyHandler = verifyLayer.route.stack[verifyLayer.route.stack.length - 1].handle;

    await verifyHandler(reqVerify, resVerify);

    assert.strictEqual(verifyStatusResponse, 200);
    assert.ok(verifyJsonResponse.token);
    assert.strictEqual(savedProfile.isEmailVerified, true);
    assert.strictEqual(savedProfile.emailVerificationCode, null);

    // 3. Test GET /sandbox-key with the verified sandbox token payload
    const decodedToken = jwt.verify(verifyJsonResponse.token, process.env.JWT_SECRET);
    
    const reqKey = {
      user: {
        id: decodedToken.id,
        email: decodedToken.email,
        role: decodedToken.role
      },
      headers: {}
    };

    let keyStatusResponse = null;
    let keyJsonResponse = null;
    const resKey = {
      status: (code) => {
        keyStatusResponse = code;
        return { json: (data) => { keyJsonResponse = data; } };
      },
      json: (data) => { keyJsonResponse = data; }
    };

    const keyLayer = authRouter.stack.find(layer => layer.route && layer.route.path === '/sandbox-key' && layer.route.methods.get);
    const keyHandler = keyLayer.route.stack[keyLayer.route.stack.length - 1].handle;

    await keyHandler(reqKey, resKey);

    assert.strictEqual(keyStatusResponse, null); // happy path returns json directly (200 status default)
    assert.strictEqual(keyJsonResponse.apiKey, 'AIzaSyTestSandboxKey123');

    // Restore mocks
    mockSave.mock.restore();
    mockFindOne.mock.restore();
  });

  it('should sign up a standard email user, return 403 with devUrl magic link, and verify via token', async () => {
    let savedProfile = null;

    // Mock UserProfile.prototype.save
    const mockSave = mock.method(UserProfile.prototype, 'save', function() {
      savedProfile = this;
      return Promise.resolve(this);
    });

    // Mock UserProfile.findOne
    const mockFindOne = mock.method(UserProfile, 'findOne', (query) => {
      // For signup duplicate check, return null so signup succeeds
      if (query.email === 'newuser@example.com' && !savedProfile) {
        return Promise.resolve(null);
      }
      if (savedProfile && (query.email === savedProfile.email || query.emailVerificationToken === savedProfile.emailVerificationToken)) {
        return Promise.resolve(savedProfile);
      }
      return Promise.resolve(null);
    });

    // Test POST /signup
    const reqSignup = {
      body: {
        name: 'John Doe',
        email: 'newuser@example.com',
        password: 'securePassword123'
      },
      id: 'req-signup-id',
      ip: '127.0.0.1',
      headers: {}
    };

    let statusResponse = null;
    let jsonResponse = null;
    const resSignup = {
      status: (code) => {
        statusResponse = code;
        return { json: (data) => { jsonResponse = data; } };
      },
      json: (data) => { jsonResponse = data; }
    };

    const signupLayer = authRouter.stack.find(layer => layer.route && layer.route.path === '/signup' && layer.route.methods.post);
    const signupHandler = signupLayer.route.stack[signupLayer.route.stack.length - 1].handle;

    await signupHandler(reqSignup, resSignup);

    assert.strictEqual(statusResponse, 403);
    assert.strictEqual(jsonResponse.requiresVerification, true);
    assert.strictEqual(jsonResponse.email, 'newuser@example.com');
    assert.ok(jsonResponse.devUrl);
    
    // Extract token from devUrl (e.g. http://localhost:3000/#/verify-email?token=...&email=...)
    const url = new URL(jsonResponse.devUrl.replace('#/', ''));
    const token = url.searchParams.get('token');
    assert.ok(token);
    assert.strictEqual(savedProfile.emailVerificationToken, token);
    assert.strictEqual(savedProfile.isEmailVerified, false);

    // Test POST /verify-email using the generated token and email
    const reqVerify = {
      body: {
        email: 'newuser@example.com',
        token: token
      },
      id: 'req-verify-token',
      ip: '127.0.0.1',
      headers: {}
    };

    let verifyStatusResponse = null;
    let verifyJsonResponse = null;
    const resVerify = {
      status: (code) => {
        verifyStatusResponse = code;
        return { json: (data) => { verifyJsonResponse = data; } };
      },
      json: (data) => { verifyJsonResponse = data; },
      cookie: () => {}
    };

    const verifyLayer = authRouter.stack.find(layer => layer.route && layer.route.path === '/verify-email' && layer.route.methods.post);
    const verifyHandler = verifyLayer.route.stack[verifyLayer.route.stack.length - 1].handle;

    await verifyHandler(reqVerify, resVerify);

    assert.strictEqual(verifyStatusResponse, 200);
    assert.ok(verifyJsonResponse.token); // jwt token
    assert.strictEqual(savedProfile.isEmailVerified, true);
    assert.strictEqual(savedProfile.emailVerificationToken, null);

    // Restore mocks
    mockSave.mock.restore();
    mockFindOne.mock.restore();
  });
});
