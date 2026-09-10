import { getSupabase } from './supabase';

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function signInWithPhone(phone: string): Promise<AuthResult> {
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
  if (!sb) return { success: false, error: 'Supabase non configurado' };
  const { error } = await sb.auth.signUp({ email, password });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function verifyOtp(phone: string, token: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase não configurado' };
  const { error } = await sb.auth.verifyOtp({ phone, token, type: 'sms' });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}

export async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}
