import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps a route and enforces authentication + optional role guard.
 *
 * Props:
 *   children      — the protected component to render
 *   roles         — (optional) array of allowed roles, e.g. ['admin', 'analyst']
 *   requiredRole  — (optional) single role string shorthand, e.g. 'admin'
 *   redirectTo    — (optional) where to redirect if role is insufficient (default: '/dashboard')
 */
export default function ProtectedRoute({ children, roles, requiredRole, redirectTo = '/dashboard' }) {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Normalise role guard — support both `requiredRole="admin"` and `roles={['admin']}`
  const allowedRoles = roles || (requiredRole ? [requiredRole] : null);

  // Role guard: if specific roles are required and user's role is not in the list
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
