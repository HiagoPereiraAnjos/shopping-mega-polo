import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { hasRole, type AdminRole } from '../../lib/permissions';

interface PermissionGateProps {
  allowedRoles: readonly AdminRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGate({
  allowedRoles,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { profile } = useAuth();
  const canRender = hasRole(profile, allowedRoles);

  if (!canRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
