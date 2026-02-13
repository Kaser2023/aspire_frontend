import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Role to dashboard path mapping
const ROLE_DASHBOARDS = {
  parent: '/dashboard',
  coach: '/coach',
  branch_admin: '/branch-admin',
  accountant: '/accountant',
  super_admin: '/super-admin',
  owner: '/super-admin',
};

// Allowed roles for each dashboard path
const PATH_ROLES = {
  '/dashboard': ['parent'],
  '/coach': ['coach'],
  '/branch-admin': ['branch_admin'],
  '/accountant': ['accountant'],
  '/super-admin': ['super_admin', 'owner'],
};

/**
 * Protected Route Component
 * Checks authentication and role-based access
 */
export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-secondary">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  const userRole = user.role;
  const currentPath = location.pathname;

  // Find which dashboard the user is trying to access
  const dashboardPath = Object.keys(PATH_ROLES).find(path => currentPath.startsWith(path));

  if (dashboardPath) {
    const allowedRolesForPath = PATH_ROLES[dashboardPath];
    
    // User doesn't have access to this dashboard
    if (!allowedRolesForPath.includes(userRole)) {
      // Redirect to their correct dashboard
      const correctDashboard = ROLE_DASHBOARDS[userRole] || '/';
      return <Navigate to={correctDashboard} replace />;
    }
  }

  // If specific roles are required, check them
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    const correctDashboard = ROLE_DASHBOARDS[userRole] || '/';
    return <Navigate to={correctDashboard} replace />;
  }

  return children;
}

