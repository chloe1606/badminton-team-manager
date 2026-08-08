import React from 'react';
import { Navigate, Outlet } from 'react-router-dom'; // Assumes react-router-dom v6
import { useAuth } from '../../auth/AuthContext.tsx';

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'player')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  // Show a clean loading state while checking Supabase credentials
  if (loading) {
    return <div className="loading-screen">🏸 Loading team manager dashboard...</div>;
  }

  // Redirect to login if user is unauthenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block access if user role is unauthorized
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render children components securely
  return <Outlet />;
};
