import api from './api';

/**
 * Programs Service
 * Handles all program-related API calls
 */
const programsService = {
  /**
   * Get public programs (no auth required)
   */
  async getPublic(params = {}) {
    return api.get('/programs/public', { params });
  },

  /**
   * Get all programs
   */
  async getAll(params = {}) {
    return api.get('/programs', { params });
  },

  /**
   * Get program by ID
   */
  async getById(id) {
    return api.get(`/programs/${id}`);
  },

  /**
   * Create new program
   */
  async create(programData) {
    return api.post('/programs', programData);
  },

  /**
   * Update program
   */
  async update(id, programData) {
    return api.put(`/programs/${id}`, programData);
  },

  /**
   * Delete program
   */
  async delete(id) {
    return api.delete(`/programs/${id}`);
  },

  /**
   * Get programs by branch
   */
  async getByBranch(branchId) {
    return api.get('/programs', { params: { branch_id: branchId } });
  },

  /**
   * Toggle program status (active/inactive)
   */
  async toggleStatus(id) {
    return api.patch(`/programs/${id}/status`);
  },

  /**
   * Upload program image
   */
  async uploadImage(id, file) {
    const formData = new FormData();
    formData.append('program_image', file);
    return api.post(`/programs/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Get program schedule
   */
  async getSchedule(id) {
    return api.get(`/programs/${id}/schedule`);
  },

  /**
   * Update program schedule
   */
  async updateSchedule(id, schedule) {
    return api.put(`/programs/${id}/schedule`, { schedule });
  },

  /**
   * Get program players
   */
  async getPlayers(id) {
    return api.get(`/programs/${id}/players`);
  },

  /**
   * Get program coaches
   */
  async getCoaches(id) {
    return api.get(`/programs/${id}/coaches`);
  },

  /**
   * Assign coach to program
   */
  async assignCoach(id, coachId) {
    return api.post(`/programs/${id}/assign-coach`, { coach_id: coachId });
  },

  /**
   * Get program statistics
   */
  async getStats(params = {}) {
    return api.get('/programs/stats', { params });
  },
};

export default programsService;

