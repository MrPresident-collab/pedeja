import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_SERVICE_TYPES,
  APP_CAPABILITY_MAP,
  APPLICATIONS,
  CAPABILITIES,
  CUSTOMER_WAIT_RULES,
  DELIVERY_AVAILABILITY_STATUSES,
  ORDER_STATUSES,
  SERVICE_TYPES,
  hasCoordinates,
  hasHumanAddress,
  normalizeAddress,
} from '../packages/pedeja-contracts/src/index.js';

test('customer service contract exposes only the active Pedeja surface', () => {
  assert.deepEqual(ACTIVE_SERVICE_TYPES, [
    SERVICE_TYPES.FOME,
    SERVICE_TYPES.COMPRAS,
    SERVICE_TYPES.ENVIAR,
  ]);
});

test('application identities map to backend capabilities without granting access', () => {
  assert.equal(APP_CAPABILITY_MAP[APPLICATIONS.ESTAFETA][0], CAPABILITIES.DELIVERY_PARTNER);
  assert.equal(APP_CAPABILITY_MAP[APPLICATIONS.MERCHANT][0], CAPABILITIES.MERCHANT);
  assert.equal(APP_CAPABILITY_MAP[APPLICATIONS.ADMIN][0], CAPABILITIES.INTERNAL_STAFF);
});

test('address contract keeps human address primary and coordinates optional', () => {
  const address = normalizeAddress({
    label: 'Casa',
    addressLine1: 'Rua 10, Nº 25',
    neighborhood: 'Maianga',
    municipality: 'Luanda',
    reference: 'Perto do mercado',
  });

  assert.equal(hasHumanAddress(address), true);
  assert.equal(hasCoordinates(address), false);
  assert.equal(address.latitude, null);
  assert.equal(address.longitude, null);
});

test('delivery/customer timing contracts remain explicit', () => {
  assert.equal(CUSTOMER_WAIT_RULES.FREE_MINUTES, 8);
  assert.equal(CUSTOMER_WAIT_RULES.RATE_KZ_PER_MINUTE, 50);
  assert.equal(CUSTOMER_WAIT_RULES.PAID_MAX_KZ, 250);
  assert.equal(DELIVERY_AVAILABILITY_STATUSES.AVAILABLE, 'available');
  assert.ok(ORDER_STATUSES.DELIVERING);
});
