import { Navigate } from 'react-router-dom';
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

/**
 * Public Route Component
 * Redirects authenticated users to their dashboard
 */
export default function PublicRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

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

  // If authenticated, redirect to their dashboard
  if (isAuthenticated && user) {
    const dashboardPath = ROLE_DASHBOARDS[user.role] || '/';
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
}

