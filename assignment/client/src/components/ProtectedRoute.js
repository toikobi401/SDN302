import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Hiding routes is only for navigation; the API enforces permissions itself.
export default function ProtectedRoute({ admin = false, children }) {
  const { user, ready } = useAuth();
  const { pathname, search, hash } = useLocation();
  if (!ready) return <p className="container page" role="status">Loading your account...</p>;
  if (!user) return <Navigate to={admin ? '/admin/login' : '/login'} replace state={{ from: pathname + search + hash }} />;
  if (admin && user.role !== 'ADMIN') return <div className="container page"><h1>Administrator access only</h1><Link to="/">Back to the store</Link></div>;
  return children;
}
