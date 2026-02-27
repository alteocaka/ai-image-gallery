import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}
