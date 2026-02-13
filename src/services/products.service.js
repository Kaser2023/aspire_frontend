import api from './api';

const productsService = {
  /**
   * Get public product list
   */
  async getAll(params = {}) {
    return api.get('/products', { params });
  },

  /**
   * Get all products for admin (includes inactive)
   */
  async getAdminAll() {
    return api.get('/products/admin');
  },

  /**
   * Create product (super admin / owner)
   */
  async create(formData) {
    return api.post('/products', formData);
  },

  /**
   * Update product
   */
  async update(id, formData) {
    return api.patch(`/products/${id}`, formData);
  },

  /**
   * Toggle product active status
   */
  async toggleStatus(id) {
    return api.patch(`/products/${id}/toggle-status`);
  },

  /**
   * Delete product
   */
  async remove(id) {
    return api.delete(`/products/${id}`);
  }
};

export default productsService;
