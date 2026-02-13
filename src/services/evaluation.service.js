import api from './api';

/**
 * Evaluation Service
 * Handles all evaluation-related API calls
 */
const evaluationService = {
  /**
   * Create a new evaluation
   */
  async create(evaluationData) {
    return api.post('/evaluations', evaluationData);
  },

  /**
   * Get all evaluations with optional filters
   */
  async getAll(params = {}) {
    return api.get('/evaluations', { params });
  },

  /**
   * Get evaluations for a specific player
   */
  async getByPlayer(playerId, params = {}) {
    return api.get(`/evaluations/player/${playerId}`, { params });
  },

  /**
   * Get evaluation summary/stats for a player
   */
  async getPlayerSummary(playerId) {
    return api.get(`/evaluations/player/${playerId}/summary`);
  },

  /**
   * Get single evaluation by ID
   */
  async getById(id) {
    return api.get(`/evaluations/${id}`);
  },

  /**
   * Update an evaluation
   */
  async update(id, evaluationData) {
    return api.put(`/evaluations/${id}`, evaluationData);
  },

  /**
   * Delete an evaluation
   */
  async delete(id) {
    return api.delete(`/evaluations/${id}`);
  }
};

export default evaluationService;
