import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * UI gate only: hides pages the stored role can't use. Real enforcement is the API,
 * which checks the role in our users table on every request (and a 401/403 there
 * clears the session, which sends the user back here).
 */
export default function ProtectedRoute({ requiredRole, children }) {
  const location = useLocation();
  const { token, role } = useAuth();

  if (!token) {
    const to = requiredRole === 'admin' ? '/admin/auth' : requiredRole === 'patient' ? '/patient/auth' : '/login';
    return <Navigate to={to} replace state={{ from: location }} />;
  }
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/not-authorized" replace />;
  }
  return children;
}
