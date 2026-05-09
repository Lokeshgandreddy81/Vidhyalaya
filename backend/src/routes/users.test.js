import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import router from './users.js';
import UserProfile from '../models/UserProfile.js';

describe('Users Route - PUT /:userId', () => {
  it('should only update name and email, filtering out mass-assigned fields', async () => {
    // Setup a mock express request and response
    const req = {
      params: { userId: 'test-user-123' },
      user: { id: 'test-user-123' },
      body: {
        name: 'New Name',
        email: 'new@email.com',
        xp: 9999, // Malicious update attempt
        level: 100 // Malicious update attempt
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

    // Mock UserProfile.findOneAndUpdate
    const mockFindOneAndUpdate = mock.method(UserProfile, 'findOneAndUpdate', async (filter, update, options) => {
      return { ...filter, ...update.$set }; // Return a mock representation of the updated object
    });

    // Extract the PUT handler function from the router
    const putLayer = router.stack.find(layer => layer.route && layer.route.methods.put);
    const putHandler = putLayer.route.stack[0].handle;

    // Call the handler
    await putHandler(req, res);

    // Assertions
    assert.strictEqual(mockFindOneAndUpdate.mock.calls.length, 1);

    const callArgs = mockFindOneAndUpdate.mock.calls[0].arguments;
    const updateArg = callArgs[1]; // The update object passed to Mongoose

    assert.ok(updateArg.$set);
    assert.strictEqual(updateArg.$set.name, 'New Name');
    assert.strictEqual(updateArg.$set.email, 'new@email.com');

    // Ensure mass assignment fields are filtered out
    assert.strictEqual(updateArg.$set.xp, undefined);
    assert.strictEqual(updateArg.$set.level, undefined);

    // Cleanup mock
    mockFindOneAndUpdate.mock.restore();
  });
});
