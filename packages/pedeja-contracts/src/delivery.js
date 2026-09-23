export const DELIVERY_ASSIGNMENT_STATUSES = Object.freeze({
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  PICKED_UP: 'picked_up',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

export const DELIVERY_AVAILABILITY_STATUSES = Object.freeze({
  OFFLINE: 'offline',
  AVAILABLE: 'available',
  BUSY: 'busy',
});

export const VEHICLE_TYPES = Object.freeze({
  MOTA: 'mota',
  TRICICLO: 'triciclo',
  CARRO: 'carro',
  CARRINHA: 'carrinha',
});

export const PICKUP_RULES = Object.freeze({
  MAX_WAIT_MINUTES: 8,
  MERCHANT_DELAY_THRESHOLD_MINUTES: 6,
});

export const CUSTOMER_WAIT_RULES = Object.freeze({
  FREE_MINUTES: 8,
  PAID_MINUTES_MAX: 5,
  RATE_KZ_PER_MINUTE: 50,
  PAID_MAX_KZ: 250,
});

export function isVehicleType(value) {
  return Object.values(VEHICLE_TYPES).includes(value);
}
