import api from './api';

/**
 * Announcements Service
 * Handles all announcement-related API calls
 */
const announcementsService = {
  /**
   * Get all announcements
   */
  async getAll(params = {}) {
    return api.get('/announcements', { params });
  },

  /**
   * Get announcements feed (for current user)
   */
  async getFeed(params = {}) {
    return api.get('/announcements/feed', { params });
  },

  /**
   * Get announcement by ID
   */
  async getById(id) {
    return api.get(`/announcements/${id}`);
  },

  /**
   * Create new announcement
   */
  async create(announcementData) {
    return api.post('/announcements', announcementData);
  },

  /**
   * Update announcement
   */
  async update(id, announcementData) {
    return api.put(`/announcements/${id}`, announcementData);
  },

  /**
   * Delete announcement
   */
  async delete(id) {
    return api.delete(`/announcements/${id}`);
  },

  /**
   * Publish announcement
   */
  async publish(id) {
    return api.patch(`/announcements/${id}/publish`);
  },

  /**
   * Unpublish announcement
   */
  async unpublish(id) {
    return api.patch(`/announcements/${id}/unpublish`);
  },

  /**
   * Toggle pin status
   */
  async togglePin(id) {
    return api.patch(`/announcements/${id}/pin`);
  },

  /**
   * Increment view count
   */
  async incrementView(id) {
    return api.post(`/announcements/${id}/view`);
  },

  /**
   * Upload announcement image
   */
  async uploadImage(id, file) {
    const formData = new FormData();
    formData.append('announcement_image', file);
    return api.post(`/announcements/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default announcementsService;

