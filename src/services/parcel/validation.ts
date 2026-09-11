import type { ParcelPackageDraft, ParcelRecipientDraft } from '@/types';
import { normalizeAngolaPhone } from '@/services/account';

export type ParcelFieldErrors = {
  recipientName?: string;
  recipientPhone?: string;
  description?: string;
  restriction?: string;
};

export function validateRecipient(recipient: ParcelRecipientDraft): Pick<ParcelFieldErrors, 'recipientName' | 'recipientPhone'> {
  const errors: { recipientName?: string; recipientPhone?: string } = {};
  const name = recipient.name.trim();
  if (!name) {
    errors.recipientName = 'Indica o nome de quem recebe.';
  } else if (name.length < 2) {
    errors.recipientName = 'O nome é demasiado curto.';
  } else if (name.length > 60) {
    errors.recipientName = 'O nome é demasiado longo.';
  }
  if (!normalizeAngolaPhone(recipient.phone)) {
    errors.recipientPhone = 'Número de telefone inválido. Usa um número angolano.';
  }
  return errors;
}

export function validatePackage(pkg: ParcelPackageDraft): Pick<ParcelFieldErrors, 'description'> {
  const description = pkg.description.trim();
  if (!description) {
    return { description: 'Descreve o que envias.' };
  }
  if (description.length < 3) {
    return { description: 'A descrição é demasiado curta.' };
  }
  if (description.length > 120) {
    return { description: 'Usa menos de 120 caracteres.' };
  }
  return {};
}

export function validateRestriction(acknowledged: boolean): Pick<ParcelFieldErrors, 'restriction'> {
  return acknowledged
    ? {}
    : { restriction: 'Confirma que a encomenda não contém artigos proibidos.' };
}

export function validateParcelDraft(
  pkg: ParcelPackageDraft,
  recipient: ParcelRecipientDraft,
  restrictionAcknowledged: boolean,
): ParcelFieldErrors {
  return {
    ...validateRecipient(recipient),
    ...validatePackage(pkg),
    ...validateRestriction(restrictionAcknowledged),
  };
}

export function firstParcelError(errors: ParcelFieldErrors): string | null {
  const values = Object.values(errors).filter(Boolean) as string[];
  return values[0] ?? null;
}