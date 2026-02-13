import api from './api';

/**
 * Expenses Service
 * Handles all expense-related API calls
 */
const expensesService = {
  /**
   * Get all expenses with optional filters
   */
  async getAll(params = {}) {
    return api.get('/expenses', { params });
  },

  /**
   * Get expense by ID
   */
  async getById(id) {
    return api.get(`/expenses/${id}`);
  },

  /**
   * Create new expense
   */
  async create(expenseData) {
    return api.post('/expenses', expenseData);
  },

  /**
   * Create expense with receipt file
   */
  async createWithReceipt(formData) {
    // Don't set Content-Type - let browser set it with boundary for FormData
    return api.post('/expenses', formData, {
      headers: { 'Content-Type': undefined }
    });
  },

  /**
   * Update expense
   */
  async update(id, expenseData) {
    return api.put(`/expenses/${id}`, expenseData);
  },

  /**
   * Update expense with receipt file
   */
  async updateWithReceipt(id, formData) {
    // Don't set Content-Type - let browser set it with boundary for FormData
    return api.put(`/expenses/${id}`, formData, {
      headers: { 'Content-Type': undefined }
    });
  },

  /**
   * Delete expense
   */
  async delete(id) {
    return api.delete(`/expenses/${id}`);
  },

  /**
   * Get expense statistics
   */
  async getStats(params = {}) {
    return api.get('/expenses/stats', { params });
  },

  /**
   * Get expenses by branch
   */
  async getByBranch(branchId, params = {}) {
    return api.get('/expenses', { params: { branch_id: branchId, ...params } });
  },

  /**
   * Get expenses by date range
   */
  async getByDateRange(startDate, endDate, params = {}) {
    return api.get('/expenses', { params: { start_date: startDate, end_date: endDate, ...params } });
  },

  /**
   * Get expenses by category
   */
  async getByCategory(category, params = {}) {
    return api.get('/expenses', { params: { category, ...params } });
  }
};

export default expensesService;
