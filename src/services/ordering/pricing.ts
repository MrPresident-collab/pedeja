import type { CartLine } from '@/types';

export type Pricing = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tip: number;
  total: number;
  count: number;
};

export function promoDiscount(subtotal: number): number {
  return Math.round(subtotal * 0.1);
}

export function computePricing(
  lines: CartLine[],
  hasPromo: boolean,
  deliveryFee: number,
  tip: number
): Pricing {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = hasPromo ? promoDiscount(subtotal) : 0;
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  return {
    subtotal,
    discount,
    deliveryFee,
    tip,
    total: subtotal - discount + deliveryFee + tip,
    count,
  };
}