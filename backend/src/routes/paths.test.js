import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import pathsRouter from './paths.js';
import LearningPath from '../models/LearningPath.js';
import { mock } from 'node:test';

const app = express();
app.use(express.json());
app.use('/api/paths', pathsRouter);

describe('Paths Router', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe('GET /api/paths/user/:userId', () => {
    test('returns paths for a user', async () => {
      const mockPaths = [{ id: '1', title: 'Path 1' }, { id: '2', title: 'Path 2' }];

      mock.method(LearningPath, 'find', () => ({
        sort: mock.fn(async () => mockPaths)
      }));

      const response = await request(app).get('/api/paths/user/user123');

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, mockPaths);
    });

    test('handles errors', async () => {
      const errorMessage = 'Database error';
      mock.method(LearningPath, 'find', () => {
        throw new Error(errorMessage);
      });

      const response = await request(app).get('/api/paths/user/user123');

      assert.strictEqual(response.status, 500);
      assert.deepStrictEqual(response.body, { error: errorMessage });
    });
  });

  describe('GET /api/paths/:id', () => {
    test('returns a single path', async () => {
      const mockPath = { id: 'path123', title: 'Path 123' };
      mock.method(LearningPath, 'findOne', async () => mockPath);

      const response = await request(app).get('/api/paths/path123');

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, mockPath);
    });

    test('returns 404 if path not found', async () => {
      mock.method(LearningPath, 'findOne', async () => null);

      const response = await request(app).get('/api/paths/nonexistent');

      assert.strictEqual(response.status, 404);
      assert.deepStrictEqual(response.body, { error: 'Path not found' });
    });

    test('handles errors', async () => {
      const errorMessage = 'Database error';
      mock.method(LearningPath, 'findOne', async () => {
        throw new Error(errorMessage);
      });

      const response = await request(app).get('/api/paths/path123');

      assert.strictEqual(response.status, 500);
      assert.deepStrictEqual(response.body, { error: errorMessage });
    });
  });

  describe('POST /api/paths', () => {
    test('creates a new path', async () => {
      const inputData = { title: 'New Path', description: 'Description' };
      const savedPath = { ...inputData, userId: 'user123', id: 'newid' };

      // Mock the prototype save method
      mock.method(LearningPath.prototype, 'save', async function() {
        // Just return this so we can test it works
        return this;
      });

      const response = await request(app)
        .post('/api/paths')
        .send({ ...inputData, userId: 'user123' });

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.title, 'New Path');
      assert.strictEqual(response.body.userId, 'user123');
    });

    test('handles errors', async () => {
      const errorMessage = 'Validation error';
      mock.method(LearningPath.prototype, 'save', async () => {
        throw new Error(errorMessage);
      });

      const response = await request(app)
        .post('/api/paths')
        .send({ title: 'New Path' });

      assert.strictEqual(response.status, 400);
      assert.deepStrictEqual(response.body, { error: errorMessage });
    });
  });

  describe('PUT /api/paths/:id', () => {
    test('updates a path', async () => {
      const updatedPath = { id: 'path123', title: 'Updated Path' };
      mock.method(LearningPath, 'findOneAndUpdate', async () => updatedPath);

      const response = await request(app)
        .put('/api/paths/path123')
        .send({ title: 'Updated Path' });

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, updatedPath);
    });

    test('returns 404 if path not found', async () => {
      mock.method(LearningPath, 'findOneAndUpdate', async () => null);

      const response = await request(app)
        .put('/api/paths/nonexistent')
        .send({ title: 'Updated Path' });

      assert.strictEqual(response.status, 404);
      assert.deepStrictEqual(response.body, { error: 'Path not found' });
    });

    test('handles errors', async () => {
      const errorMessage = 'Update error';
      mock.method(LearningPath, 'findOneAndUpdate', async () => {
        throw new Error(errorMessage);
      });

      const response = await request(app)
        .put('/api/paths/path123')
        .send({ title: 'Updated Path' });

      assert.strictEqual(response.status, 400);
      assert.deepStrictEqual(response.body, { error: errorMessage });
    });
  });

  describe('DELETE /api/paths/:id', () => {
    test('deletes a path', async () => {
      mock.method(LearningPath, 'findOneAndDelete', async () => ({ id: 'path123' }));

      const response = await request(app).delete('/api/paths/path123');

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, { message: 'Path deleted' });
    });

    test('returns 404 if path not found', async () => {
      mock.method(LearningPath, 'findOneAndDelete', async () => null);

      const response = await request(app).delete('/api/paths/nonexistent');

      assert.strictEqual(response.status, 404);
      assert.deepStrictEqual(response.body, { error: 'Path not found' });
    });

    test('handles errors', async () => {
      const errorMessage = 'Failed to delete learning path';
      mock.method(LearningPath, 'findOneAndDelete', async () => {
        throw new Error(errorMessage);
      });

      const originalError = console.error;
      console.error = () => {};

      const response = await request(app).delete('/api/paths/path123');

      console.error = originalError;

      assert.strictEqual(response.status, 500);
      assert.deepStrictEqual(response.body, { error: errorMessage });
    });
  });
});
