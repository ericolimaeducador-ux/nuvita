import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { Modulo, Papel } from '@/types';

export function ProtectedRoute({ roles, modulo }: { roles?: Papel[]; modulo?: Modulo }) {
  const { user, token, permissoes } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && roles.length > 0 && !roles.includes(user.papel)) {
    return <Navigate to="/" replace />;
  }
  if (modulo && !permissoes.includes(modulo)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
