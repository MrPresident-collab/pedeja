import { createContext } from 'react';
import type { AuthMode, AuthResult, AuthUser } from '@/services/auth';
import type { Identity } from '@/types/domain';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export type AuthContextValue = {
  status: AuthStatus;
  mode: AuthMode;
  user: AuthUser | null;
  identity: Identity | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  error: string | null;
  signInWithPhone: (phone: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  verifyOtp: (phone: string, token: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  retry: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);