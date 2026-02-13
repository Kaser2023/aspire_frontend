import api from './api';

/**
 * Schedule Service
 * Handles all schedule-related API calls
 */
const scheduleService = {
  /**
   * Get all sessions for a branch with optional filters
   * @param {string} branchId - Branch UUID
   * @param {Object} params - Query parameters (startDate, endDate, programId, coachId, isCancelled)
   */
  async getBranchSchedule(branchId, params = {}) {
    return api.get(`/schedule/branch/${branchId}`, { params });
  },

  /**
   * Get week schedule for a branch
   * @param {string} branchId - Branch UUID
   * @param {string} startDate - Week start date (YYYY-MM-DD), defaults to current week
   */
  async getWeekSchedule(branchId, startDate = null) {
    const params = startDate ? { startDate } : {};
    return api.get(`/schedule/branch/${branchId}/week`, { params });
  },

  /**
   * Get day schedule for a branch
   * @param {string} branchId - Branch UUID
   * @param {string} date - Target date (YYYY-MM-DD), defaults to today
   */
  async getDaySchedule(branchId, date = null) {
    const params = date ? { date } : {};
    return api.get(`/schedule/branch/${branchId}/day`, { params });
  },

  /**
   * Get program schedule
   * @param {string} programId - Program UUID
   * @param {Object} params - Query parameters (startDate, endDate)
   */
  async getProgramSchedule(programId, params = {}) {
    return api.get(`/schedule/program/${programId}`, { params });
  },

  /**
   * Get coach weekly schedule
   * @param {string} coachId - Coach UUID
   * @param {string} startDate - Week start date (YYYY-MM-DD), defaults to current week
   */
  async getCoachSchedule(coachId, startDate = null) {
    const params = startDate ? { startDate } : {};
    return api.get(`/schedule/coach/${coachId}/week`, { params });
  },

  /**
   * Create a new training session
   * @param {Object} sessionData - Session data
   * @param {string} sessionData.program_id - Program UUID (required)
   * @param {string} sessionData.coach_id - Coach UUID (required)
   * @param {string} sessionData.date - Session date YYYY-MM-DD (required)
   * @param {string} sessionData.start_time - Start time HH:MM or HH:MM:SS (required)
   * @param {string} sessionData.end_time - End time HH:MM or HH:MM:SS (required)
   * @param {string} sessionData.facility - Facility name (optional)
   * @param {number} sessionData.max_capacity - Max capacity (optional)
   * @param {boolean} sessionData.is_recurring - Is recurring session (optional)
   * @param {string} sessionData.notes - Session notes (optional)
   */
  async createSession(sessionData) {
    return api.post('/schedule/session', sessionData);
  },

  /**
   * Update a training session
   * @param {string} sessionId - Session UUID
   * @param {Object} sessionData - Updated session data
   */
  async updateSession(sessionId, sessionData) {
    return api.put(`/schedule/session/${sessionId}`, sessionData);
  },

  /**
   * Cancel or delete a training session
   * @param {string} sessionId - Session UUID
   * @param {Object} data - Cancellation data
   * @param {string} data.reason - Cancellation reason (optional)
   * @param {boolean} data.permanent - Permanent deletion flag (optional, default false)
   */
  async cancelSession(sessionId, data = {}) {
    return api.delete(`/schedule/session/${sessionId}`, { data });
  },

  /**
   * Validate session scheduling (check for conflicts)
   * @param {Object} scheduleData - Schedule validation data
   * @param {string} scheduleData.coach_id - Coach UUID (required)
   * @param {string} scheduleData.branch_id - Branch UUID (required)
   * @param {string} scheduleData.facility - Facility name (optional)
   * @param {string} scheduleData.date - Session date YYYY-MM-DD (required)
   * @param {string} scheduleData.start_time - Start time HH:MM or HH:MM:SS (required)
   * @param {string} scheduleData.end_time - End time HH:MM or HH:MM:SS (required)
   * @param {string} scheduleData.session_id - Session UUID to exclude from check (optional, for updates)
   */
  async validateSchedule(scheduleData) {
    return api.post('/schedule/validate', scheduleData);
  },

  /**
   * Generate recurring sessions for a program
   * @param {string} programId - Program UUID
   * @param {Object} data - Generation options
   * @param {string} data.startDate - Start date YYYY-MM-DD (optional, defaults to today)
   * @param {string} data.endDate - End date YYYY-MM-DD (optional)
   * @param {number} data.weeksAhead - Number of weeks to generate (optional, default 12, max 52)
   */
  async generateRecurringSessions(programId, data = {}) {
    return api.post(`/schedule/program/${programId}/generate`, data);
  },

  /**
   * Get schedule statistics
   * @param {Object} params - Query parameters
   * @param {string} params.branchId - Branch UUID (optional)
   * @param {string} params.startDate - Start date YYYY-MM-DD (optional)
   * @param {string} params.endDate - End date YYYY-MM-DD (optional)
   */
  async getScheduleStats(params = {}) {
    return api.get('/schedule/stats', { params });
  },

  // ==================== Waitlist Methods ====================

  /**
   * Get program waitlist
   * @param {string} programId - Program UUID
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status (waiting, notified, enrolled, expired, cancelled)
   */
  async getProgramWaitlist(programId, params = {}) {
    return api.get(`/schedule/program/${programId}/waitlist`, { params });
  },

  /**
   * Add player to waitlist
   * @param {string} programId - Program UUID
   * @param {Object} data - Waitlist entry data
   * @param {string} data.player_id - Player UUID (required)
   * @param {string} data.parent_id - Parent UUID (required)
   * @param {string} data.notes - Additional notes (optional)
   */
  async addToWaitlist(programId, data) {
    return api.post(`/schedule/program/${programId}/waitlist`, data);
  },

  /**
   * Remove player from waitlist
   * @param {string} waitlistId - Waitlist entry UUID
   */
  async removeFromWaitlist(waitlistId) {
    return api.delete(`/schedule/waitlist/${waitlistId}`);
  },

  /**
   * Update waitlist entry status
   * @param {string} waitlistId - Waitlist entry UUID
   * @param {Object} data - Update data
   * @param {string} data.status - New status (waiting, notified, enrolled, expired, cancelled)
   * @param {string} data.notes - Updated notes (optional)
   */
  async updateWaitlistStatus(waitlistId, data) {
    return api.patch(`/schedule/waitlist/${waitlistId}`, data);
  },

  // ==================== Calendar Export Methods ====================

  /**
   * Export branch schedule as PDF
   * @param {string} branchId - Branch UUID
   * @param {string} period - Period type: 'daily', 'weekly', or 'monthly'
   */
  async exportBranchSchedulePDF(branchId, period = 'weekly') {
    const url = `/schedule/export/branch/${branchId}/pdf?period=${period}`;
    window.location.href = `${import.meta.env.VITE_API_URL}${url}`;
  }
};

export default scheduleService;
