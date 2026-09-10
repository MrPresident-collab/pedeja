import { getSupabase, isSupabaseConfigured } from './supabase';
import type { ID } from '@/types';
import type { Identity } from '@/types/domain';
import { mockIdentity, mockProfile } from '@/data/mock';

export type AuthMode = 'mock' | 'supabase';

export type AuthUser = {
  id: ID;
  phone?: string;
  email?: string;
};

export type AuthSession = {
  user: AuthUser;
  mode: AuthMode;
  identity: Identity | null;
};

export interface AuthResult {
  success: boolean;
  error?: string;
}

const DEMO_SESSION_KEY = 'pedeja:demo-session';

const listeners = new Set<(session: AuthSession | null) => void>();

let mockSession: AuthSession | null = null;

function mockAuthUser(): AuthUser {
  return { id: mockIdentity.id, phone: mockProfile.phone, email: mockProfile.email };
}

function mockSessionFor(): AuthSession {
  return { user: mockAuthUser(), mode: 'mock', identity: mockIdentity };
}

function persistMockSession() {
  try {
    localStorage.setItem(DEMO_SESSION_KEY, '1');
  } catch {
    // demo convenience only; storage failure never breaks the app
  }
}

function hasPersistedMockSession(): boolean {
  try {
    return localStorage.getItem(DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function notifyListeners() {
  const session = mockSession;
  listeners.forEach((listener) => listener(session));
}

export function getAuthMode(): AuthMode {
  return isSupabaseConfigured() ? 'supabase' : 'mock';
}

function toAuthSession(session: {
  user: { id: string; phone?: string | null; email?: string | null };
}): AuthSession {
  return {
    user: { id: session.user.id, phone: session.user.phone ?? undefined, email: session.user.email ?? undefined },
    mode: 'supabase',
    identity: null,
  };
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  if (getAuthMode() === 'supabase') {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session ? toAuthSession(data.session) : null;
  }
  if (mockSession) return mockSession;
  if (hasPersistedMockSession()) {
    mockSession = mockSessionFor();
    return mockSession;
  }
  return null;
}

export const getSession = getCurrentSession;

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

async function requestDemoOtp(): Promise<AuthResult> {
  return { success: true };
}

async function verifyDemoOtp(token: string): Promise<AuthResult> {
  if (token.trim() !== '1234') {
    return { success: false, error: 'Código incorreto. No modo demo usa o código 1234.' };
  }
  mockSession = mockSessionFor();
  persistMockSession();
  notifyListeners();
  return { success: true };
}

export async function signInWithPhone(phone: string): Promise<AuthResult> {
  if (getAuthMode() === 'mock') return requestDemoOtp();
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase não configurado' };
  const { error } = await sb.auth.signInWithOtp({ phone });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase não configurado' };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase não configurado' };
  const { error } = await sb.auth.signUp({ email, password });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function verifyOtp(phone: string, token: string): Promise<AuthResult> {
  if (getAuthMode() === 'mock') return verifyDemoOtp(token);
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase não configurado' };
  const { error } = await sb.auth.verifyOtp({ phone, token, type: 'sms' });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { success: true };
  const { error } = await sb.auth.resetPasswordForEmail(email);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function signOut(): Promise<void> {
  if (getAuthMode() === 'supabase') {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    return;
  }
  mockSession = null;
  try {
    localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // best-effort demo cleanup
  }
  notifyListeners();
}

export function onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
  if (getAuthMode() === 'supabase') {
    const sb = getSupabase();
    if (!sb) return () => {};
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      callback(session ? toAuthSession(session) : null);
    });
    return () => data.subscription.unsubscribe();
  }
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}