import api from './api';

/**
 * Players Service
 * Handles all player-related API calls
 */
const playersService = {
  /**
   * Get all players with optional filters
   */
  async getAll(params = {}) {
    return api.get('/players', { params });
  },

  /**
   * Get player by ID
   */
  async getById(id) {
    return api.get(`/players/${id}`);
  },

  /**
   * Create new player
   */
  async create(playerData) {
    return api.post('/players', playerData);
  },

  /**
   * Update player
   */
  async update(id, playerData) {
    return api.put(`/players/${id}`, playerData);
  },

  /**
   * Delete player
   */
  async delete(id) {
    return api.delete(`/players/${id}`);
  },

  /**
   * Get player statistics
   */
  async getStats(params = {}) {
    return api.get('/players/stats', { params });
  },

  /**
   * Get players by parent ID
   */
  async getByParent(parentId) {
    return api.get('/players', { params: { parent_id: parentId } });
  },

  /**
   * Get players by branch
   */
  async getByBranch(branchId) {
    return api.get('/players', { params: { branch_id: branchId } });
  },

  /**
   * Get players by program
   */
  async getByProgram(programId) {
    return api.get('/players', { params: { program_id: programId } });
  },

  /**
   * Upload player photo/avatar
   */
  async uploadPhoto(playerId, file) {
    const formData = new FormData();
    formData.append('avatar', file);
    // Don't set Content-Type manually - let the browser set it with the correct boundary
    return api.post(`/players/${playerId}/avatar`, formData);
  },

  /**
   * Upload player ID document
   */
  async uploadIdDocument(playerId, file) {
    const formData = new FormData();
    formData.append('document', file);
    // Don't set Content-Type manually - let the browser set it with the correct boundary
    return api.post(`/players/${playerId}/id-document`, formData);
  },

  /**
   * Update player status
   */
  async updateStatus(id, status) {
    return api.patch(`/players/${id}/status`, { status });
  },

  /**
   * Assign player to program
   */
  async assignToProgram(id, programId) {
    return api.post(`/players/${id}/assign-program`, { program_id: programId });
  },

  /**
   * Link a self-registered player to parent by registration code
   */
  async linkPlayer(registrationCode) {
    return api.post('/players/link', { registration_code: registrationCode });
  },
};

export default playersService;

