import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';

// Create Auth Context
export const AuthContext = createContext(null);

// Role to dashboard path mapping
const ROLE_DASHBOARDS = {
  parent: '/dashboard',
  coach: '/coach',
  branch_admin: '/branch-admin',
  accountant: '/accountant',
  super_admin: '/super-admin',
  owner: '/super-admin',
};

/**
 * Auth Provider Component
 * Manages authentication state and provides auth methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getStoredUser();
        if (storedUser && authService.isAuthenticated()) {
          // Optionally verify token with backend
          try {
            const response = await authService.getMe();
            if (response.success) {
              setUser(response.data);
            } else {
              authService.clearSession();
            }
          } catch {
            // Token might be expired, try refresh or clear
            authService.clearSession();
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login with phone and password (Staff)
   */
  const login = useCallback(async (phone, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(phone, password);
      if (response.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      throw new Error(response.message || 'Login failed');
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send OTP to phone (Parents)
   */
  const sendOtp = useCallback(async (phone) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.sendOtp(phone);
      return { success: response.success, expiresIn: response.data?.expires_in };
    } catch (err) {
      const errorMessage = err.message || 'Failed to send OTP';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify OTP and login (Parents)
   */
  const verifyOtp = useCallback(async (phone, code, firstName = null, lastName = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.verifyOtp(phone, code, firstName, lastName);
      if (response.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user, isNewUser: response.data.is_new_user };
      }
      throw new Error(response.message || 'OTP verification failed');
    } catch (err) {
      const errorMessage = err.message || 'OTP verification failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.updateMe(data);
      if (response.success) {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        return { success: true };
      }
      throw new Error(response.message || 'Update failed');
    } catch (err) {
      const errorMessage = err.message || 'Update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Change password
   */
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      return { success: response.success };
    } catch (err) {
      const errorMessage = err.message || 'Password change failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get dashboard path for current user role
   */
  const getDashboardPath = useCallback(() => {
    if (!user?.role) return '/';
    return ROLE_DASHBOARDS[user.role] || '/';
  }, [user]);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((roles) => {
    if (!user?.role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  /**
   * Check if user has specific permission (for super_admin)
   */
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (!user.permissions) return false;
    const [resource, action] = permission.split('.');
    return user.permissions[resource]?.includes(action);
  }, [user]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh user data from backend
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response.success) {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        return { success: true };
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
    return { success: false };
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    sendOtp,
    verifyOtp,
    logout,
    updateProfile,
    changePassword,
    getDashboardPath,
    hasRole,
    hasPermission,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

