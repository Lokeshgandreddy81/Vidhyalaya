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

  describe('GET /user/:userId', () => {
    it('should return 200 and a list of paths on success', async () => {
      const mockPaths = [{ id: 'path1', title: 'React' }, { id: 'path2', title: 'Node' }];
      const sortMock = mock.fn(() => mockPaths);
      findMock = mock.method(LearningPath, 'find', () => ({ sort: sortMock }));

      const res = await request(app).get('/api/paths/user/user123');

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, mockPaths);
      assert.strictEqual(findMock.mock.callCount(), 1);
      assert.deepStrictEqual(findMock.mock.calls[0].arguments, [{ userId: 'user123' }]);
      assert.strictEqual(sortMock.mock.callCount(), 1);
      assert.deepStrictEqual(sortMock.mock.calls[0].arguments, [{ createdAt: -1 }]);
    });

    it('should return 500 when database throws an error', async () => {
      const dbError = new Error('Database connection failed');
      const sortMock = mock.fn(() => { throw dbError; });
      findMock = mock.method(LearningPath, 'find', () => ({ sort: sortMock }));

      const res = await request(app).get('/api/paths/user/user123');

      assert.strictEqual(res.status, 500);
      assert.deepStrictEqual(res.body, { error: 'Database connection failed' });
    });
  });

  describe('GET /:id', () => {
    it('should return 200 and the path if found', async () => {
      const mockPath = { id: 'path1', title: 'React' };
      findOneMock.mock.mockImplementation(() => Promise.resolve(mockPath));

      const res = await request(app).get('/api/paths/path1');

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, mockPath);
      assert.strictEqual(findOneMock.mock.callCount(), 1);
      assert.deepStrictEqual(findOneMock.mock.calls[0].arguments, [{ id: 'path1' }]);
    });

    it('should return 404 if path not found', async () => {
      findOneMock.mock.mockImplementation(() => Promise.resolve(null));

      const res = await request(app).get('/api/paths/nonexistent');

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { error: 'Path not found' });
    });

    it('should return 500 on database error', async () => {
      findOneMock.mock.mockImplementation(() => Promise.reject(new Error('DB Error')));

      const res = await request(app).get('/api/paths/path1');

      assert.strictEqual(res.status, 500);
      assert.deepStrictEqual(res.body, { error: 'DB Error' });
    });
  });

  describe('POST /', () => {
    it('should create a new path and return 201', async () => {
      const mockPathData = { title: 'New Path', goal: 'Learn' };
      const expectedPath = { ...mockPathData, userId: 'user123', _id: 'some_id' };

      saveMock.mock.mockImplementation(function() {
        Object.assign(this, expectedPath);
        return Promise.resolve(this);
      });

      const res = await request(app)
        .post('/api/paths')
        .send({ userId: 'user123', ...mockPathData });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.title, 'New Path');
      assert.strictEqual(res.body.userId, 'user123');
      assert.strictEqual(saveMock.mock.callCount(), 1);
    });

    it('should return 400 on error during creation', async () => {
      saveMock.mock.mockImplementation(() => Promise.reject(new Error('Validation Error')));

      const res = await request(app)
        .post('/api/paths')
        .send({ title: 'New Path' });

      assert.strictEqual(res.status, 400);
      assert.deepStrictEqual(res.body, { error: 'Validation Error' });
    });
  });

  describe('PUT /:id', () => {
    it('should update a path and return 200', async () => {
      const updatedPath = { id: 'path1', title: 'Updated Title' };
      findOneAndUpdateMock.mock.mockImplementation(() => Promise.resolve(updatedPath));

      const res = await request(app)
        .put('/api/paths/path1')
        .send({ title: 'Updated Title' });

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, updatedPath);
      assert.strictEqual(findOneAndUpdateMock.mock.callCount(), 1);
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments, [
        { id: 'path1' },
        { title: 'Updated Title' },
        { new: true }
      ]);
    });

    it('should return 404 if path to update is not found', async () => {
      findOneAndUpdateMock.mock.mockImplementation(() => Promise.resolve(null));

      const res = await request(app)
        .put('/api/paths/nonexistent')
        .send({ title: 'Updated Title' });

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { error: 'Path not found' });
    });

    it('should return 400 on error during update', async () => {
      findOneAndUpdateMock.mock.mockImplementation(() => Promise.reject(new Error('Update Error')));

      const res = await request(app)
        .put('/api/paths/path1')
        .send({ title: 'Updated Title' });

      assert.strictEqual(res.status, 400);
      assert.deepStrictEqual(res.body, { error: 'Update Error' });
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a path and return 200', async () => {
      const deletedPath = { id: 'path1', title: 'To Delete' };
      findOneAndDeleteMock.mock.mockImplementation(() => Promise.resolve(deletedPath));

      const res = await request(app).delete('/api/paths/path1');

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, { message: 'Path deleted' });
      assert.strictEqual(findOneAndDeleteMock.mock.callCount(), 1);
      assert.deepStrictEqual(findOneAndDeleteMock.mock.calls[0].arguments, [{ id: 'path1' }]);
    });

    it('should return 404 if path to delete is not found', async () => {
      findOneAndDeleteMock.mock.mockImplementation(() => Promise.resolve(null));

      const res = await request(app).delete('/api/paths/nonexistent');

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { error: 'Path not found' });
    });

    it('should return 500 on error during deletion', async () => {
      findOneAndDeleteMock.mock.mockImplementation(() => Promise.reject(new Error('Delete Error')));

      const res = await request(app).delete('/api/paths/path1');

      assert.strictEqual(res.status, 500);
      assert.deepStrictEqual(res.body, { error: 'Failed to delete learning path' });
    });
  });
});
