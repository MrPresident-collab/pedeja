import test from 'node:test';
import assert from 'node:assert/strict';

import { canApplyOrderUpdate } from '../src/domain/orderStatus.js';

test('allows a new order and forward status transitions', () => {
  assert.equal(canApplyOrderUpdate(null, { status: 'pending' }), true);
  assert.equal(canApplyOrderUpdate({ status: 'preparing' }, { status: 'delivering' }), true);
});

test('rejects stale status regressions', () => {
  assert.equal(canApplyOrderUpdate({ status: 'delivering' }, { status: 'preparing' }), false);
  assert.equal(canApplyOrderUpdate({ status: 'completed' }, { status: 'delivered' }), false);
});

test('never cancels a delivered or completed order', () => {
  assert.equal(canApplyOrderUpdate({ status: 'delivered' }, { status: 'cancelled' }), false);
  assert.equal(canApplyOrderUpdate({ status: 'completed' }, { status: 'cancelled' }), false);
  assert.equal(canApplyOrderUpdate({ status: 'preparing' }, { status: 'cancelled' }), true);
});

import {
  PEDEJA_ACTIVE_SERVICES,
  PEDEJA_BUSINESS_CATEGORIES,
  PEDEJA_SERVICE_TYPES,
  normalizePedejaServiceType,
} from '../src/constants.js';

test('Pedejá exposes exactly Fome, Compras and ENVIAR', () => {
  assert.deepEqual(PEDEJA_ACTIVE_SERVICES, [
    PEDEJA_SERVICE_TYPES.FOME,
    PEDEJA_SERVICE_TYPES.COMPRAS,
    PEDEJA_SERVICE_TYPES.ENVIAR,
  ]);
});

test('legacy service values normalize only at the compatibility boundary', () => {
  assert.equal(normalizePedejaServiceType('food'), PEDEJA_SERVICE_TYPES.FOME);
  assert.equal(normalizePedejaServiceType('shopping'), PEDEJA_SERVICE_TYPES.COMPRAS);
  assert.equal(normalizePedejaServiceType('parcel'), PEDEJA_SERVICE_TYPES.ENVIAR);
});

test('Fome and Compras have explicit backend category boundaries', () => {
  assert.ok(PEDEJA_BUSINESS_CATEGORIES[PEDEJA_SERVICE_TYPES.FOME].includes('comida'));
  assert.ok(PEDEJA_BUSINESS_CATEGORIES[PEDEJA_SERVICE_TYPES.COMPRAS].includes('compras'));
  assert.ok(!PEDEJA_BUSINESS_CATEGORIES[PEDEJA_SERVICE_TYPES.FOME].includes('lojas'));
});

import { filterPedejaMarketplaceBusinesses } from '../src/domain/pedejaMarketplace.js';

test('marketplace filter never leaks a Compras business into Fome', () => {
  const businesses = [
    { id: 'food-1', category: 'comida' },
    { id: 'shop-1', category: 'compras' },
    { id: 'store-1', category: 'lojas' },
  ];

  assert.deepEqual(
    filterPedejaMarketplaceBusinesses(businesses, PEDEJA_SERVICE_TYPES.FOME),
    [{ id: 'food-1', category: 'comida' }],
  );
});

test('marketplace filter includes Compras and Lojas in Compras', () => {
  const businesses = [
    { id: 'food-1', category: 'comida' },
    { id: 'shop-1', category: 'compras' },
    { id: 'store-1', category: 'lojas' },
  ];

  assert.deepEqual(
    filterPedejaMarketplaceBusinesses(businesses, PEDEJA_SERVICE_TYPES.COMPRAS),
    [
      { id: 'shop-1', category: 'compras' },
      { id: 'store-1', category: 'lojas' },
    ],
  );
});

test('unknown service types fail closed instead of exposing all businesses', () => {
  assert.deepEqual(
    filterPedejaMarketplaceBusinesses([{ id: 'x', category: 'comida' }], 'legacy-unknown'),
    [],
  );
});
