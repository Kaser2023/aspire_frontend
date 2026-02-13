import api from './api';

const discountsService = {
  /**
   * Get all discounts with optional filters
   */
  async getAll(params = {}) {
    return api.get('/discounts', { params });
  },

  /**
   * Create a new discount
   */
  async create(data) {
    return api.post('/discounts', data);
  },

  /**
   * Update a discount (cancel, edit, etc.)
   */
  async update(id, data) {
    return api.patch(`/discounts/${id}`, data);
  },

  /**
   * Get available discounts for a player at payment time
   */
  async getAvailable(params) {
    return api.get('/discounts/available', { params });
  }
};

export default discountsService;
