import api from './api';

/**
 * Branch Announcements Service
 * Handles all branch-specific announcement API calls
 * Uses separate table from Super Admin announcements
 */
const branchAnnouncementsService = {
  /**
   * Get all announcements for the current branch
   */
  async getAll(params = {}) {
    return api.get('/branch-announcements', { params });
  },

  /**
   * Get announcement by ID
   */
  async getById(id) {
    return api.get(`/branch-announcements/${id}`);
  },

  /**
   * Create new announcement
   */
  async create(announcementData) {
    return api.post('/branch-announcements', announcementData);
  },

  /**
   * Update announcement
   */
  async update(id, announcementData) {
    return api.put(`/branch-announcements/${id}`, announcementData);
  },

  /**
   * Delete announcement
   */
  async delete(id) {
    return api.delete(`/branch-announcements/${id}`);
  }
};

export default branchAnnouncementsService;
