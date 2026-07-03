import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    // Redirect to login page while saving current path in location state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'super_admin') {
    // User lacks required role permissions
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
export default ProtectedRoute;
