import { repositories } from '@/repositories';
import type { AppearanceMode } from '@/repositories/types';
import type { PaymentMethod } from '@/types';

export function setAppearance(mode: AppearanceMode): void {
  repositories.settings.setAppearance(mode);
}

export function setPromotionsEnabled(enabled: boolean): void {
  repositories.notification.setPromotionsEnabled(enabled);
}

export function setDefaultPaymentMethod(method: PaymentMethod): void {
  repositories.payment.setDefaultMethod(method);
}