import api from './api';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
const authService = {
  /**
   * Login with phone and password (Staff: Admin, Coach, Accountant, etc.)
   */
  async login(phone, password) {
    const response = await api.post('/auth/login', { phone, password });
    if (response.success && response.data) {
      this.setSession(response.data);
    }
    return response;
  },

  /**
   * Send OTP to phone number (Parents)
   */
  async sendOtp(phone) {
    return api.post('/auth/send-otp', { phone });
  },

  /**
   * Verify OTP and login (Parents)
   */
  async verifyOtp(phone, code, firstName = null, lastName = null) {
    const payload = { phone, code };
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;
    
    const response = await api.post('/auth/verify-otp', payload);
    if (response.success && response.data) {
      this.setSession(response.data);
    }
    return response;
  },

  /**
   * Resend OTP
   */
  async resendOtp(phone) {
    return api.post('/auth/resend-otp', { phone });
  },

  /**
   * Register new user (Parent) with password - via OTP flow
   */
  async register(data) {
    const response = await api.post('/auth/complete-registration', data);
    if (response.success && response.data) {
      this.setSession(response.data);
    }
    return response;
  },

  /**
   * Direct signup (no OTP verification) - email + password + phone
   */
  async signup(data) {
    const response = await api.post('/auth/signup', data);
    if (response.success && response.data) {
      this.setSession(response.data);
    }
    return response;
  },

  /**
   * Get current user profile
   */
  async getMe() {
    return api.get('/auth/me');
  },

  /**
   * Update current user profile
   */
  async updateMe(data) {
    return api.put('/auth/me', data);
  },

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    return api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
  },

  /**
   * Forgot password - request reset
   */
  async forgotPassword(email) {
    return api.post('/auth/forgot-password', { email });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    return api.post('/auth/reset-password', { token, password: newPassword });
  },

  /**
   * Logout current session
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      this.clearSession();
    }
  },

  /**
   * Logout from all devices
   */
  async logoutAll() {
    try {
      await api.post('/auth/logout-all');
    } finally {
      this.clearSession();
    }
  },

  /**
   * Set session data in localStorage
   */
  setSession(data) {
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  },

  /**
   * Clear session data from localStorage
   */
  clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  /**
   * Get stored user from localStorage
   */
  getStoredUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Get access token
   */
  getAccessToken() {
    return localStorage.getItem('accessToken');
  },

  /**
   * Check if this is first system setup (no admins exist)
   */
  async checkSetupStatus() {
    return api.get('/auth/setup-status');
  },

  /**
   * Verify admin setup key
   */
  async verifySetupKey(setupKey) {
    return api.post('/auth/verify-setup-key', { setup_key: setupKey });
  },

  /**
   * Register admin account (Super Admin or Owner)
   */
  async registerAdmin(data) {
    return api.post('/auth/register-admin', data);
  },
};

export default authService;

