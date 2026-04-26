import { LearningPath, UserProfile } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';
const DEFAULT_USER_ID = 'default-user';

export const api = {
  // Users API
  async getUserProfile(userId = DEFAULT_USER_ID): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  },

  async updateUserProfile(data: Partial<UserProfile>, userId = DEFAULT_USER_ID): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user profile');
    return response.json();
  },

  // Paths API
  async getUserPaths(userId = DEFAULT_USER_ID): Promise<LearningPath[]> {
    const response = await fetch(`${API_BASE_URL}/paths/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user paths');
    return response.json();
  },

  async createPath(path: LearningPath, userId = DEFAULT_USER_ID): Promise<LearningPath> {
    const response = await fetch(`${API_BASE_URL}/paths`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...path, userId }),
    });
    if (!response.ok) throw new Error('Failed to create path');
    return response.json();
  },

  async updatePath(pathId: string, data: Partial<LearningPath>): Promise<LearningPath> {
    const response = await fetch(`${API_BASE_URL}/paths/${pathId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update path');
    return response.json();
  },

  async deletePath(pathId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/paths/${pathId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete path');
  }
};
