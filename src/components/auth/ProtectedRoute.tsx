import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { PageLoader } from '../ui/PageLoader';
import { CMS_ROLES, type AdminRole, getRoleLabel, hasRole } from '../../lib/permissions';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: readonly AdminRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles = CMS_ROLES,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isLoading, isAuthenticated, profile, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const hasAccess = hasRole(profile, allowedRoles);

  if (!hasAccess) {
    const roleLabel = getRoleLabel(profile?.role);
    const requiredRoles = allowedRoles.map((role) => getRoleLabel(role)).join(', ');

    return (
      <div className="min-h-screen bg-brand-paper flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-brand-dark/10 p-8 md:p-12 text-center space-y-8 shadow-soft">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-serif font-bold italic">Acesso administrativo negado</h1>
            <p className="text-brand-dark/70 font-sans leading-relaxed">
              Sua conta esta autenticada, mas nao possui permissao para esta area do CMS.
              Perfil atual: <strong>{roleLabel}</strong>. Perfis permitidos: <strong>{requiredRoles}</strong>.
            </p>
          </div>

          {signOutError && (
            <p className="text-xs text-red-600 font-bold uppercase tracking-brand" role="alert">
              {signOutError}
            </p>
          )}

          <button
            type="button"
            onClick={async () => {
              setSignOutError(null);
              const result = await signOut();
              if (result.error) {
                setSignOutError(result.error);
              }
            }}
            className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-brand-dark text-white rounded-xl text-xs tracking-brand font-bold uppercase hover:bg-brand-red transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
