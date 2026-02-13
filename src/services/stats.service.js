import api from './api';

/**
 * Statistics Service
 * Handles all dashboard statistics API calls
 */
const statsService = {
  /**
   * Get Super Admin dashboard statistics
   */
  async getSuperAdminStats() {
    return api.get('/stats/super-admin');
  },

  /**
   * Get Branch dashboard statistics
   */
  async getBranchStats(branchId) {
    return api.get(`/stats/branch/${branchId}`);
  },

  /**
   * Get Coach dashboard statistics
   */
  async getCoachStats(coachId) {
    return api.get(`/stats/coach/${coachId}`);
  },

  /**
   * Get Parent dashboard statistics
   */
  async getParentStats(parentId) {
    return api.get(`/stats/parent/${parentId}`);
  },

  /**
   * Get Financial statistics
   */
  async getFinancialStats(params = {}) {
    return api.get('/stats/financial', { params });
  },

  /**
   * Get Accountant dashboard statistics
   */
  async getAccountantStats() {
    return api.get('/stats/accountant');
  },
};

export default statsService;

