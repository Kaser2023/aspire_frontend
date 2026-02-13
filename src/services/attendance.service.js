import api from './api';

/**
 * Attendance Service
 * Handles all attendance-related API calls
 */
const attendanceService = {
  /**
   * Get all attendance records with optional filters
   */
  async getAll(params = {}) {
    return api.get('/attendance', { params });
  },

  /**
   * Record single attendance
   */
  async record(attendanceData) {
    return api.post('/attendance', attendanceData);
  },

  /**
   * Bulk record attendance
   * @param {string} programId - Program ID
   * @param {string} sessionDate - Session date (YYYY-MM-DD)
   * @param {Array} attendanceList - Array of {player_id, status} objects
   */
  async recordBulk(programId, sessionDate, attendanceList) {
    return api.post('/attendance/bulk', { 
      program_id: programId, 
      session_date: sessionDate, 
      attendance: attendanceList 
    });
  },

  /**
   * Get attendance statistics
   */
  async getStats(params = {}) {
    return api.get('/attendance/stats', { params });
  },

  /**
   * Get attendance by player
   */
  async getByPlayer(playerId, params = {}) {
    return api.get(`/attendance/player/${playerId}`, { params });
  },

  /**
   * Get attendance by program
   */
  async getByProgram(programId, params = {}) {
    return api.get('/attendance', { params: { program_id: programId, ...params } });
  },

  /**
   * Get attendance by date
   */
  async getByDate(date, params = {}) {
    return api.get('/attendance', { params: { date, ...params } });
  },

  /**
   * Get attendance report for program
   */
  async getReport(programId, params = {}) {
    return api.get(`/attendance/report/${programId}`, { params });
  },

  /**
   * Get player attendance summary
   */
  async getPlayerSummary(playerId, params = {}) {
    return api.get(`/attendance/player/${playerId}/summary`, { params });
  },

  /**
   * Update attendance record
   */
  async update(id, data) {
    return api.put(`/attendance/${id}`, data);
  },

  /**
   * Delete attendance record
   */
  async delete(id) {
    return api.delete(`/attendance/${id}`);
  },

  /**
   * Get attendance by ID
   */
  async getById(id) {
    return api.get(`/attendance/${id}`);
  },

  // ===== COACH ATTENDANCE =====

  async getCoachByDate(date, params = {}) {
    return api.get('/attendance/coach', { params: { date, ...params } });
  },

  async getCoachStats(params = {}) {
    return api.get('/attendance/coach/stats', { params });
  },

  async recordCoach(data) {
    return api.post('/attendance/coach', data);
  },

  async recordCoachBulk(date, attendances) {
    return api.post('/attendance/coach/bulk', { date, attendances });
  },

  async getCoachSummary(params = {}) {
    return api.get('/attendance/coach/summary', { params });
  },

  async initCoachAttendance(date, branch_id) {
    return api.post('/attendance/coach/init', { date, branch_id });
  },

  // ===== PLAYER ATTENDANCE (Super Admin) =====

  async getPlayersForAttendance(date, params = {}) {
    return api.get('/attendance/players/list', { params: { date, ...params } });
  },

  async initPlayerAttendance(date, program_id) {
    return api.post('/attendance/players/init', { date, program_id });
  },

  async recordPlayerBulk(date, attendances) {
    return api.post('/attendance/players/bulk', { date, attendances });
  },
};

export default attendanceService;

