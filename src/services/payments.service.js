import api from './api';

/**
 * Payments Service
 * Handles all payment-related API calls
 */
const paymentsService = {
  /**
   * Get all payments with optional filters
   */
  async getAll(params = {}) {
    return api.get('/payments', { params });
  },

  /**
   * Get payment by ID
   */
  async getById(id) {
    return api.get(`/payments/${id}`);
  },

  /**
   * Create new payment
   */
  async create(paymentData) {
    return api.post('/payments', paymentData);
  },

  /**
   * Create payment with receipt (Parent)
   */
  async createReceipt(formData) {
    return api.post('/payments/receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Create payment with receipt (Admin/Accountant)
   */
  async createAdminReceipt(formData) {
    return api.post('/payments/admin/receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Mark payment as completed
   */
  async complete(id, paymentMethod = 'cash') {
    return api.patch(`/payments/${id}/complete`, { payment_method: paymentMethod });
  },

  /**
   * Process refund
   */
  async refund(id, refundData) {
    return api.post(`/payments/${id}/refund`, refundData);
  },

  /**
   * Get payment statistics
   */
  async getStats(params = {}) {
    return api.get('/payments/stats', { params });
  },

  /**
   * Get payments by player
   */
  async getByPlayer(playerId) {
    return api.get('/payments', { params: { player_id: playerId } });
  },

  /**
   * Get payments by branch
   */
  async getByBranch(branchId) {
    return api.get('/payments', { params: { branch_id: branchId } });
  },

  /**
   * Generate invoice for payment
   */
  async getInvoice(id) {
    return api.get(`/payments/${id}/invoice`);
  },

  /**
   * Get revenue report
   */
  async getRevenue(params = {}) {
    return api.get('/payments/revenue', { params });
  },

  /**
   * Cancel payment
   */
  async cancel(id, reason) {
    return api.patch(`/payments/${id}/cancel`, { reason });
  },

  /**
   * Get pending payments
   */
  async getPending() {
    return api.get('/payments/status/pending');
  },

  /**
   * Update payment
   */
  async update(id, paymentData) {
    return api.put(`/payments/${id}`, paymentData);
  },

  /**
   * Delete payment
   */
  async delete(id) {
    return api.delete(`/payments/${id}`);
  },

  /**
   * Get payments by user
   */
  async getByUser(userId) {
    return api.get(`/payments/user/${userId}`);
  },

  // ═══════════════════════════════════════════════════════════════
  //  ONLINE PAYMENT GATEWAY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get payment gateway configuration (publishable keys, supported methods)
   */
  async getGatewayConfig() {
    return api.get('/payments/gateway/config');
  },

  /**
   * Initiate online payment - returns redirect URL
   * @param {object} data - { player_id, pricing_plan_id, discount_id? }
   */
  async initiateOnlinePayment(data) {
    return api.post('/payments/gateway/initiate', data);
  },

  /**
   * Verify payment status with gateway
   */
  async verifyGatewayPayment(paymentId) {
    return api.get(`/payments/gateway/verify/${paymentId}`);
  },

  /**
   * Process refund via gateway
   */
  async refundGateway(paymentId, data) {
    return api.post(`/payments/gateway/${paymentId}/refund`, data);
  },

  /**
   * Complete mock payment (development only)
   */
  async completeMockPayment(paymentId, success = true) {
    return api.post(`/payments/gateway/mock/${paymentId}/complete`, { success });
  },
};

export default paymentsService;

