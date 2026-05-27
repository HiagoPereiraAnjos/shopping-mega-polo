import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigMessage } from '../lib/supabase';
import { CMS_ROLES, hasRole } from '../lib/permissions';
import type { AdminProfile } from '../types/cms';

interface AuthActionResult {
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AdminProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }

  if (normalized.includes('missing')) {
    return 'Dados incompletos para autenticação.';
  }

  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileByUserId = useCallback(async (userId: string) => {
    if (!supabase) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        setProfile(null);
        return;
      }

      console.error('Falha ao carregar perfil administrativo:', error.message);
      setProfile(null);
      return;
    }

    setProfile(data ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    await fetchProfileByUserId(user.id);
  }, [fetchProfileByUserId, user]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (!supabase) {
        if (import.meta.env.DEV) {
          console.warn(
            supabaseConfigMessage ??
              'Supabase não configurado. A autenticação administrativa ficará indisponível.',
          );
        }
        if (active) {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        console.error('Erro ao recuperar sessão do Supabase:', error.message);
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const currentSession = data.session ?? null;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchProfileByUserId(currentSession.user.id);
      } else {
        setProfile(null);
      }

      if (active) {
        setIsLoading(false);
      }
    };

    void initialize();

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      window.setTimeout(() => {
        void fetchProfileByUserId(nextSession.user.id).finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileByUserId]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!supabase) {
      return {
        error:
          supabaseConfigMessage ??
          'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: mapAuthError(error.message) };
    }

    if (data.user) {
      await fetchProfileByUserId(data.user.id);
    }

    return { error: null };
  }, [fetchProfileByUserId]);

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase) {
      return {
        error:
          supabaseConfigMessage ??
          'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: mapAuthError(error.message) };
    }

    setSession(null);
    setUser(null);
    setProfile(null);

    return { error: null };
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthActionResult> => {
    if (!supabase) {
      return {
        error:
          supabaseConfigMessage ??
          'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      };
    }

    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl.replace(/\/$/, '')}/login`,
    });

    if (error) {
      return { error: mapAuthError(error.message) };
    }

    return { error: null };
  }, []);

  const isAuthenticated = !!session?.user;
  const hasCmsProfile = hasRole(profile, CMS_ROLES);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isAuthenticated,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [user, session, profile, isLoading, isAuthenticated, signIn, signOut, resetPassword, refreshProfile],
  );

  // Keep admin profile sanity check here for easier debugging in development.
  if (import.meta.env.DEV && isAuthenticated && !hasCmsProfile && profile) {
    console.warn(
      `Usuário autenticado com perfil "${profile.role}" sem permissão de admin para o CMS.`,
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
