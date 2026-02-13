import api from './api';

/**
 * Subscriptions Service
 * Handles all subscription-related API calls
 */
const subscriptionsService = {
  /**
   * Get all subscriptions with optional filters
   */
  async getAll(params = {}) {
    return api.get('/subscriptions', { params });
  },

  /**
   * Get subscription by ID
   */
  async getById(id) {
    return api.get(`/subscriptions/${id}`);
  },

  /**
   * Create new subscription
   */
  async create(subscriptionData) {
    return api.post('/subscriptions', subscriptionData);
  },

  /**
   * Update subscription
   */
  async update(id, subscriptionData) {
    return api.put(`/subscriptions/${id}`, subscriptionData);
  },

  /**
   * Get subscriptions by player
   */
  async getByPlayer(playerId) {
    return api.get('/subscriptions', { params: { player_id: playerId } });
  },

  /**
   * Get subscriptions by branch
   */
  async getByBranch(branchId) {
    return api.get('/subscriptions', { params: { branch_id: branchId } });
  },

  /**
   * Renew subscription
   */
  async renew(id, renewalData) {
    return api.post(`/subscriptions/${id}/renew`, renewalData);
  },

  /**
   * Apply discount to subscription
   */
  async applyDiscount(id, discountData) {
    return api.post(`/subscriptions/${id}/discount`, discountData);
  },

  /**
   * Cancel subscription
   */
  async cancel(id) {
    return api.patch(`/subscriptions/${id}/cancel`);
  },

  /**
   * Get subscription statistics
   */
  async getStats(params = {}) {
    return api.get('/subscriptions/stats', { params });
  },

  /**
   * Get expiring subscriptions
   */
  async getExpiring(days = 7) {
    return api.get('/subscriptions/expiring', { params: { days } });
  },

  /**
   * Get overdue subscriptions
   */
  async getOverdue() {
    return api.get('/subscriptions/overdue');
  },

  /**
   * Get expiry summary (counts by urgency)
   */
  async getExpirySummary(params = {}) {
    return api.get('/subscriptions/expiry-summary', { params });
  },

  /**
   * Send renewal reminder for single subscription
   */
  async sendReminder(id, type = 'notification') {
    return api.post(`/subscriptions/${id}/send-reminder`, { type });
  },

  /**
   * Send bulk renewal reminders
   */
  async sendBulkReminders(subscriptionIds, type = 'notification') {
    return api.post('/subscriptions/send-bulk-reminders', { 
      subscription_ids: subscriptionIds, 
      type 
    });
  },
};

export default subscriptionsService;
