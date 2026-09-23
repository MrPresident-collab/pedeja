export const CAPABILITIES = Object.freeze({
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  DELIVERY_PARTNER: 'delivery_partner',
  PARTNER: 'partner',
  INTERNAL_STAFF: 'internal_staff',
});

export const STAFF_TIERS = Object.freeze({
  PRESIDENT: 'president',
  OPERATIONS_DIRECTOR: 'operations_director',
  SUPPORT_LEAD: 'support_lead',
  SUPPORT_AGENT: 'support_agent',
  DISPATCHER: 'dispatcher',
});

export const APPLICATIONS = Object.freeze({
  CUSTOMER: 'customer',
  ESTAFETA: 'estafeta',
  MERCHANT: 'merchant',
  ADMIN: 'admin',
});

export const APP_CAPABILITY_MAP = Object.freeze({
  [APPLICATIONS.CUSTOMER]: Object.freeze([CAPABILITIES.CUSTOMER]),
  [APPLICATIONS.ESTAFETA]: Object.freeze([CAPABILITIES.DELIVERY_PARTNER]),
  [APPLICATIONS.MERCHANT]: Object.freeze([CAPABILITIES.MERCHANT]),
  [APPLICATIONS.ADMIN]: Object.freeze([CAPABILITIES.INTERNAL_STAFF]),
});

export function isCapability(value) {
  return Object.values(CAPABILITIES).includes(value);
}

export function isStaffTier(value) {
  return Object.values(STAFF_TIERS).includes(value);
}
