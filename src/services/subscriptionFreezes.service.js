import api from './api';

const subscriptionFreezesService = {
  /**
   * Get all subscription freezes with optional filters
   */
  async getAll(params = {}) {
    return api.get('/subscription-freezes', { params });
  },

  /**
   * Create a new subscription freeze
   */
  async create(data) {
    return api.post('/subscription-freezes', data);
  },

  /**
   * Update a subscription freeze (cancel)
   */
  async update(id, data) {
    return api.patch(`/subscription-freezes/${id}`, data);
  },

  /**
   * Get active freezes
   */
  async getActive() {
    return api.get('/subscription-freezes/active');
  }
};

export default subscriptionFreezesService;
