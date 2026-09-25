import React from 'react';
import { Navigate } from 'react-router-dom';
import { CSpinner } from '@coreui/react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { firebaseUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <CSpinner color="primary" />
      </div>
    );
  }

  if (!firebaseUser || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile.status !== 'active') {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(userProfile.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <CSpinner color="primary" />
      </div>
    );
  }

  if (firebaseUser && userProfile && userProfile.status === 'active') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
