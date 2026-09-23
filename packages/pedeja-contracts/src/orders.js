export const ORDER_STATUSES = Object.freeze({
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY_TO_PICKUP: 'ready_to_pickup',
  RIDER_ACCEPTED: 'rider_accepted',
  PICKING_UP: 'picking_up',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const PAYMENT_METHODS = Object.freeze({
  CASH: 'cash',
  MULTICAIXA: 'multicaixa',
  CARD: 'card',
});

export const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
});

export const ORDER_ACTOR_TYPES = Object.freeze({
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  ESTAFETA: 'delivery_partner',
  STAFF: 'internal_staff',
});

export function isOrderStatus(value) {
  return Object.values(ORDER_STATUSES).includes(value);
}
