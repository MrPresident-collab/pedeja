import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession } from '@/services/auth';
import * as authService from '@/services/auth';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [mode, setMode] = useState<AuthContextValue['mode']>('mock');
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [identity, setIdentity] = useState<AuthContextValue['identity']>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const applySession = useCallback((session: AuthSession | null) => {
    setMode(session?.mode ?? authService.getAuthMode());
    setUser(session?.user ?? null);
    setIdentity(session?.identity ?? null);
    setError(null);
    setStatus(session ? 'authenticated' : 'unauthenticated');
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    authService
      .getCurrentSession()
      .then((session) => {
        if (!mounted) return;
        applySession(session);
        unsubscribe = authService.onAuthStateChange((next) => {
          if (mounted) applySession(next);
        });
      })
      .catch(() => {
        if (!mounted) return;
        setError('Não foi possível verificar a sessão.');
        setStatus('error');
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [applySession, reloadToken]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    applySession(null);
  }, [applySession]);

  const retry = useCallback(() => {
    setStatus('loading');
    setReloadToken((t) => t + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      mode,
      user,
      identity,
      isAuthenticated: status === 'authenticated',
      isDemo: mode === 'mock',
      error,
      signInWithPhone: authService.signInWithPhone,
      signInWithEmail: authService.signInWithEmail,
      signUpWithEmail: authService.signUpWithEmail,
      verifyOtp: authService.verifyOtp,
      signOut,
      resetPassword: authService.resetPassword,
      retry,
    }),
    [status, mode, user, identity, error, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}