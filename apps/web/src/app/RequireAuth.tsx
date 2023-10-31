import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../shared/api/session';

export function RequireAuth() {
  const { user, loading } = useSession();
  if (loading) {
    return <div className="p-10 text-sm text-slate-500">Loading session...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
