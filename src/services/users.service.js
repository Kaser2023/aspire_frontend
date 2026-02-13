import api from './api';

/**
 * Users Service
 * Handles all user-related API calls
 */
const usersService = {
  /**
   * Get all users with optional filters
   */
  async getAll(params = {}) {
    return api.get('/users', { params });
  },

  /**
   * Get user by ID
   */
  async getById(id) {
    return api.get(`/users/${id}`);
  },

  /**
   * Create new user
   */
  async create(userData) {
    return api.post('/users', userData);
  },

  /**
   * Update user
   */
  async update(id, userData) {
    return api.put(`/users/${id}`, userData);
  },

  /**
   * Delete user
   */
  async delete(id) {
    return api.delete(`/users/${id}`);
  },

  /**
   * Toggle user status (active/inactive)
   */
  async toggleStatus(id) {
    return api.patch(`/users/${id}/status`);
  },

  /**
   * Get users by role
   */
  async getByRole(role, params = {}) {
    return api.get(`/users/role/${role}`, { params });
  },

  /**
   * Reset user password (admin only)
   */
  async resetPassword(id, newPassword) {
    return api.put(`/users/${id}`, { password: newPassword });
  },

  /**
   * Get users by branch
   */
  async getByBranch(branchId, params = {}) {
    return api.get(`/users/branch/${branchId}`, { params });
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(id, file) {
    const formData = new FormData();
    formData.append('avatar', file);
    // Don't set Content-Type manually - let the browser set it with the correct boundary
    return api.post(`/users/${id}/avatar`, formData);
  },

  /**
   * Update current user's profile
   */
  async updateProfile(profileData) {
    return api.put('/users/profile', profileData);
  },

  /**
   * Change current user's password
   */
  async changePassword(passwordData) {
    return api.post('/auth/change-password', passwordData);
  },
};

export default usersService;

