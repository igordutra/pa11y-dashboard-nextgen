import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Activity } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'editor' | 'viewer')[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse bg-slate-800 p-4 rounded-2xl shadow-lg">
          <Activity className="h-8 w-8 text-white" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}