import { repositories } from '@/repositories';
import type { CreateOrderInput } from '@/repositories/types';
import type { Order, PaymentMethod } from '@/types';
import { computePricing } from './pricing';

export type PlaceOrderParams = {
  paymentMethod: PaymentMethod;
  tip: number;
};

export type PlaceOrderOutcome =
  | { ok: true; order: Order }
  | { ok: false; reason: 'empty-cart' | 'no-address' | 'unknown'; message: string };

function deliveryLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 650));
}

function clearReasonMessage(): string {
  return 'O teu cesto está vazio. Adiciona itens antes de continuar.';
}

function noAddressMessage(): string {
  return 'Adiciona um endereço de entrega para fazeres o pedido.';
}

export async function placeOrder({ paymentMethod, tip }: PlaceOrderParams): Promise<PlaceOrderOutcome> {
  const cart = repositories.cart;
  const business = cart.getBusiness();
  const lines = cart.getLines();

  if (!business || lines.length === 0) {
    return { ok: false, reason: 'empty-cart', message: clearReasonMessage() };
  }

  const address = repositories.location.getDefaultAddress();
  if (!address) {
    return { ok: false, reason: 'no-address', message: noAddressMessage() };
  }

  const pricing = computePricing(lines, business.promo === true, cart.getDeliveryFee(), tip);
  const input: CreateOrderInput = {
    merchant: business.name,
    merchantId: business.id,
    type: business.type,
    icon: business.icon,
    lines,
    subtotal: pricing.subtotal,
    discounts: pricing.discount,
    deliveryFee: pricing.deliveryFee,
    tip: pricing.tip,
    total: pricing.total,
    paymentMethod,
    deliveryTo: address.line,
    deliveryAddressId: address.id,
  };

  try {
    await deliveryLatency();
    const order = repositories.order.create(input);
    cart.clear();
    return { ok: true, order };
  } catch {
    return {
      ok: false,
      reason: 'unknown',
      message: 'Não conseguimos criar o pedido agora. Tenta novamente.',
    };
  }
}