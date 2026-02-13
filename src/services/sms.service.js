import api from './api';

/**
 * SMS Service
 * Handles all SMS-related API calls
 */
const smsService = {
  /**
   * Get all SMS messages
   */
  async getAll(params = {}) {
    return api.get('/sms', { params });
  },

  /**
   * Send SMS to individuals
   * @param {Array} recipients - Array of phone numbers or user IDs
   * @param {string} message - SMS message content
   * @param {string} recipientType - Type: 'individual', 'group', 'branch', 'program', 'all'
   */
  async send(recipients, message, recipientType = 'individual') {
    return api.post('/sms/send', { 
      recipients, 
      message, 
      recipient_type: recipientType 
    });
  },

  /**
   * Send SMS to branch
   */
  async sendToBranch(branchId, message, targetRoles = ['parent']) {
    return api.post('/sms/send-branch', { branch_id: branchId, message, target_roles: targetRoles });
  },

  /**
   * Send SMS to program
   */
  async sendToProgram(programId, message) {
    return api.post('/sms/send-program', { program_id: programId, message });
  },

  /**
   * Get auto SMS settings
   */
  async getAutoSettings() {
    return api.get('/sms/auto-settings');
  },

  /**
   * Create auto SMS setting
   */
  async createAutoSetting(settingData) {
    return api.post('/sms/auto-settings', settingData);
  },

  /**
   * Update auto SMS setting
   */
  async updateAutoSetting(id, settingData) {
    return api.put(`/sms/auto-settings/${id}`, settingData);
  },

  /**
   * Delete auto SMS setting
   */
  async deleteAutoSetting(id) {
    return api.delete(`/sms/auto-settings/${id}`);
  },

  /**
   * Manually trigger auto SMS
   */
  async triggerAutoSMS() {
    return api.post('/sms/trigger-auto');
  },

  /**
   * Get scheduler status
   */
  async getSchedulerStatus() {
    return api.get('/sms/scheduler-status');
  },

  /**
   * Get SMS statistics
   */
  async getStats(params = {}) {
    return api.get('/sms/stats', { params });
  },

  /**
   * Get SMS templates
   */
  async getTemplates() {
    return api.get('/sms/templates/list');
  },

  /**
   * Get SMS balance
   */
  async getBalance() {
    return api.get('/sms/account/balance');
  },

  /**
   * Schedule SMS
   */
  async schedule(data) {
    return api.post('/sms/schedule', data);
  },

  /**
   * Cancel scheduled SMS
   */
  async cancelScheduled(id) {
    return api.delete(`/sms/${id}/cancel`);
  },

  /**
   * Get SMS by ID
   */
  async getById(id) {
    return api.get(`/sms/${id}`);
  },

  /**
   * Get auto SMS setting by ID
   */
  async getAutoSettingById(id) {
    return api.get(`/sms/auto-settings/${id}`);
  },

  /**
   * Update SMS message
   */
  async update(id, data) {
    return api.put(`/sms/${id}`, data);
  },

  /**
   * Delete SMS message
   */
  async delete(id) {
    return api.delete(`/sms/${id}`);
  },
};

export default smsService;

