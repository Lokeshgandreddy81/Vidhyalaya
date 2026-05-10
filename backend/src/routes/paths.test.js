import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import pathsRouter from './paths.js';
import LearningPath from '../models/LearningPath.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/paths', pathsRouter);

describe('Paths API Routes', () => {
  let findMock, findOneMock, saveMock, findOneAndUpdateMock, findOneAndDeleteMock;

  beforeEach(() => {
    findOneMock = mock.method(LearningPath, 'findOne');
    findOneAndUpdateMock = mock.method(LearningPath, 'findOneAndUpdate');
    findOneAndDeleteMock = mock.method(LearningPath, 'findOneAndDelete');
    saveMock = mock.method(LearningPath.prototype, 'save');
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret');
  };

  describe('GET /user/:userId', () => {
    it('should return 200 and a list of paths on success', async () => {
      const mockPaths = [{ id: 'path1', title: 'React' }, { id: 'path2', title: 'Node' }];
      const sortMock = mock.fn(() => mockPaths);
      findMock = mock.method(LearningPath, 'find', () => ({ sort: sortMock }));

      const res = await request(app).get('/api/paths/user/user123').set('Authorization', `Bearer ${generateToken('user123')}`);

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

      const res = await request(app).get('/api/paths/user/user123').set('Authorization', `Bearer ${generateToken('user123')}`);

      assert.strictEqual(res.status, 500);
      assert.deepStrictEqual(res.body, { error: 'Database connection failed' });
    });
  });

  describe('GET /:id', () => {
    it('should return 200 and the path if found', async () => {
      const mockPath = { id: 'path1', title: 'React', userId: 'user123' };
      findOneMock.mock.mockImplementation(() => Promise.resolve(mockPath));

      const res = await request(app).get('/api/paths/path1').set('Authorization', `Bearer ${generateToken('user123')}`);

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, mockPath);
      assert.strictEqual(findOneMock.mock.callCount(), 1);
      assert.deepStrictEqual(findOneMock.mock.calls[0].arguments, [{ id: 'path1' }]);
    });

    it('should return 404 if path not found', async () => {
      findOneMock.mock.mockImplementation(() => Promise.resolve(null));

      const res = await request(app).get('/api/paths/nonexistent').set('Authorization', `Bearer ${generateToken('user123')}`);

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { error: 'Path not found' });
    });

    it('should return 500 on database error', async () => {
      findOneMock.mock.mockImplementation(() => Promise.reject(new Error('DB Error')));

      const res = await request(app).get('/api/paths/path1').set('Authorization', `Bearer ${generateToken('user123')}`);

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
        .set('Authorization', `Bearer ${generateToken('user123')}`)
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
        .set('Authorization', `Bearer ${generateToken('user123')}`)
        .send({ title: 'New Path', userId: 'user123' });

      assert.strictEqual(res.status, 400);
      assert.deepStrictEqual(res.body, { error: 'Validation Error' });
    });
  });

  describe('PUT /:id', () => {
    it('should update a path and return 200', async () => {
      const updatedPath = { id: 'path1', title: 'Updated Title', userId: 'user123' };
      findOneMock.mock.mockImplementation(() => Promise.resolve(updatedPath));
      findOneAndUpdateMock.mock.mockImplementation(() => Promise.resolve(updatedPath));

      const res = await request(app)
        .put('/api/paths/path1')
        .set('Authorization', `Bearer ${generateToken('user123')}`)
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
      findOneMock.mock.mockImplementation(() => Promise.resolve(null));

      const res = await request(app)
        .put('/api/paths/nonexistent')
        .set('Authorization', `Bearer ${generateToken('user123')}`)
        .send({ title: 'Updated Title' });

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { error: 'Path not found' });
    });

    it('should return 400 on error during update', async () => {
      findOneMock.mock.mockImplementation(() => Promise.resolve({ id: 'path1', userId: 'user123' }));
      findOneAndUpdateMock.mock.mockImplementation(() => Promise.reject(new Error('Update Error')));

      const res = await request(app)
        .put('/api/paths/path1')
        .set('Authorization', `Bearer ${generateToken('user123')}`)
        .send({ title: 'Updated Title' });

      assert.strictEqual(res.status, 400);
      assert.deepStrictEqual(res.body, { error: 'Update Error' });
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a path and return 200', async () => {
      const deletedPath = { id: 'path1', title: 'To Delete', userId: 'user123' };
      findOneMock.mock.mockImplementation(() => Promise.resolve(deletedPath));
      findOneAndDeleteMock.mock.mockImplementation(() => Promise.resolve(deletedPath));

      const res = await request(app).delete('/api/paths/path1').set('Authorization', `Bearer ${generateToken('user123')}`);

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, { message: 'Path deleted' });
      assert.strictEqual(findOneAndDeleteMock.mock.callCount(), 1);
      assert.deepStrictEqual(findOneAndDeleteMock.mock.calls[0].arguments, [{ id: 'path1' }]);
    });

    it('should return 404 if path to delete is not found', async () => {
      findOneMock.mock.mockImplementation(() => Promise.resolve(null));

      const res = await request(app).delete('/api/paths/nonexistent').set('Authorization', `Bearer ${generateToken('user123')}`);

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { error: 'Path not found' });
    });

    it('should return 500 on error during deletion', async () => {
      findOneMock.mock.mockImplementation(() => Promise.resolve({ id: 'path1', userId: 'user123' }));
      findOneAndDeleteMock.mock.mockImplementation(() => Promise.reject(new Error('Delete Error')));

      const res = await request(app).delete('/api/paths/path1').set('Authorization', `Bearer ${generateToken('user123')}`);

      assert.strictEqual(res.status, 500);
      assert.deepStrictEqual(res.body, { error: 'Failed to delete learning path' });
    });
  });
});
