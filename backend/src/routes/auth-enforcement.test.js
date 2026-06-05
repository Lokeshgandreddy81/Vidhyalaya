import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import documentRouter from './documentRoutes.js';
import Document from '../models/Document.js';

describe('Auth Enforcement - Document Route Filtering', () => {
  it('should restrict document query to student branch/semester/uni when role is student', async () => {
    const req = {
      user: {
        role: 'student',
        universityId: 'MIT',
        branch: 'CSE',
        semester: '5'
      },
      query: {
        universityId: 'other-uni',
        branch: 'other-branch',
        semester: '1'
      }
    };

    let jsonResponse = null;
    let statusResponse = null;
    const res = {
      json: (data) => { jsonResponse = data; },
      status: (code) => {
        statusResponse = code;
        return { json: (data) => { jsonResponse = data; } };
      }
    };

    // Mock Document.find
    const mockFind = mock.method(Document, 'find', () => {
      return {
        sort: () => Promise.resolve([{ title: 'Restricted Doc', universityId: 'mit' }])
      };
    });

    const getLayer = documentRouter.stack.find(layer => layer.route && layer.route.path === '/' && layer.route.methods.get);
    // There are two handlers (middleware authenticateToken + async handler). Let's call the actual route handler.
    const routeHandler = getLayer.route.stack[getLayer.route.stack.length - 1].handle;

    await routeHandler(req, res);

    // Verify filter arguments applied
    assert.strictEqual(mockFind.mock.calls.length, 1);
    const filterUsed = mockFind.mock.calls[0].arguments[0];

    assert.strictEqual(filterUsed.universityId, 'mit');
    assert.strictEqual(filterUsed.branch, 'cse');
    assert.strictEqual(filterUsed.semester, '5');

    mockFind.mock.restore();
  });

  it('should allow arbitrary branch/semester queries for admin, but restrict to admin universityId', async () => {
    const req = {
      user: {
        role: 'admin',
        universityId: 'Stanford'
      },
      query: {
        universityId: 'other-uni',
        branch: 'EE',
        semester: '3'
      }
    };

    let jsonResponse = null;
    let statusResponse = null;
    const res = {
      json: (data) => { jsonResponse = data; },
      status: (code) => {
        statusResponse = code;
        return { json: (data) => { jsonResponse = data; } };
      }
    };

    const mockFind = mock.method(Document, 'find', () => {
      return {
        sort: () => Promise.resolve([])
      };
    });

    const getLayer = documentRouter.stack.find(layer => layer.route && layer.route.path === '/' && layer.route.methods.get);
    const routeHandler = getLayer.route.stack[getLayer.route.stack.length - 1].handle;

    await routeHandler(req, res);

    assert.strictEqual(mockFind.mock.calls.length, 1);
    const filterUsed = mockFind.mock.calls[0].arguments[0];

    assert.strictEqual(filterUsed.universityId, 'stanford');
    assert.strictEqual(filterUsed.branch, 'ee');
    assert.strictEqual(filterUsed.semester, '3');

    mockFind.mock.restore();
  });
});
