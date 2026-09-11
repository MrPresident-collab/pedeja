import { repositories } from '@/repositories';

export type AccountResult =
  | { ok: true }
  | { ok: false; message: string };

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function formatAngolaPhone(digits: string): string {
  return `+244 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function normalizeAngolaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return formatAngolaPhone(digits);
  if (digits.length === 12 && digits.startsWith('244')) {
    const local = digits.slice(3);
    if (local.startsWith('9')) return formatAngolaPhone(local);
  }
  return null;
}

export async function updateDisplayName(name: string): Promise<AccountResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: 'O nome não pode ficar vazio.' };
  if (trimmed.length < 2) return { ok: false, message: 'O nome é demasiado curto.' };
  if (trimmed.length > 60) return { ok: false, message: 'O nome é demasiado longo.' };
  await delay(450);
  repositories.profile.updateName(trimmed);
  return { ok: true };
}

export async function requestPhoneChange(raw: string): Promise<AccountResult> {
  const phone = normalizeAngolaPhone(raw);
  if (!phone) return { ok: false, message: 'Introduz um número angolano válido (9 dígitos).' };
  await delay(500);
  const outcome = repositories.profile.requestPhoneChange(phone);
  return outcome.success ? { ok: true } : { ok: false, message: outcome.error ?? 'Não foi possível enviar o código.' };
}

export async function verifyPhoneChange(phone: string, code: string): Promise<AccountResult> {
  const normalized = normalizeAngolaPhone(phone);
  if (!normalized) return { ok: false, message: 'Número inválido. Pede um novo código.' };
  if (code.trim().length < 4) return { ok: false, message: 'Introduz o código de 4 dígitos.' };
  await delay(650);
  const outcome = repositories.profile.verifyPhoneChange(normalized, code.trim());
  return outcome.success ? { ok: true } : { ok: false, message: outcome.error ?? 'Código inválido. Tenta de novo.' };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Introduz um endereço de email.';
  if (!EMAIL_RE.test(trimmed)) return 'Esse email não parece válido.';
  if (trimmed.length > 120) return 'O email é demasiado longo.';
  return null;
}

export async function saveEmail(raw: string): Promise<AccountResult> {
  const error = validateEmail(raw);
  if (error) return { ok: false, message: error };
  await delay(450);
  repositories.profile.setEmail(raw.trim());
  return { ok: true };
}

export async function requestAccountDeletion(): Promise<AccountResult> {
  await delay(700);
  const outcome = repositories.profile.requestAccountDeletion();
  return outcome.success ? { ok: true } : { ok: false, message: outcome.error ?? 'Não foi possível pedir a eliminação da conta.' };
}