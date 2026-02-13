import api from './api';

/**
 * Branches Service
 * Handles all branch-related API calls
 */
const branchesService = {
  /**
   * Get public branches (no auth required)
   */
  async getPublic() {
    return api.get('/branches/public');
  },

  /**
   * Get all branches
   */
  async getAll(params = {}) {
    return api.get('/branches', { params });
  },

  /**
   * Get branch by ID
   */
  async getById(id) {
    return api.get(`/branches/${id}`);
  },

  /**
   * Create new branch
   */
  async create(branchData) {
    return api.post('/branches', branchData);
  },

  /**
   * Update branch
   */
  async update(id, branchData) {
    return api.put(`/branches/${id}`, branchData);
  },

  /**
   * Delete branch
   */
  async delete(id) {
    return api.delete(`/branches/${id}`);
  },

  /**
   * Get branch statistics
   */
  async getStats(branchId) {
    return api.get(`/stats/branch/${branchId}`);
  },

  /**
   * Toggle branch status (active/inactive)
   */
  async toggleStatus(id) {
    return api.patch(`/branches/${id}/status`);
  },

  /**
   * Get branch programs
   */
  async getPrograms(branchId) {
    return api.get(`/branches/${branchId}/programs`);
  },

  /**
   * Get branch players
   */
  async getPlayers(branchId, params = {}) {
    return api.get(`/branches/${branchId}/players`, { params });
  },

  /**
   * Get branch staff
   */
  async getStaff(branchId) {
    return api.get(`/branches/${branchId}/staff`);
  },

  /**
   * Assign manager to branch
   */
  async assignManager(branchId, managerId) {
    return api.post(`/branches/${branchId}/assign-manager`, { manager_id: managerId });
  },
};

export default branchesService;

