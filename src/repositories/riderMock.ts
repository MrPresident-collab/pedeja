import type { RiderRepository, RiderDeliveryRequest, ActiveDelivery, RiderStep } from './riderTypes';
import type { Payout, PayoutLine } from '@/types/domain';
import {
  mockRiderProfile,
  mockRiderStats,
  mockDeliveryRequest,
  mockActiveDelivery,
  mockEarningsBreakdown,
  mockDeliveryHistory,
} from '@/data/riderMock';

let online = false;
let darkTheme = false;
let cashOrders = true;
let activeDelivery: ActiveDelivery | null = null;
let currentRequest: RiderDeliveryRequest | null = mockDeliveryRequest;
let currentStep: RiderStep = 'pickup';

function buildTodayPayout(): Payout {
  const lines: PayoutLine[] = [
    { component: 'base_pay', amount: mockEarningsBreakdown.basePay },
    { component: 'distance_pay', amount: mockEarningsBreakdown.distancePay },
    { component: 'waiting_time', amount: mockEarningsBreakdown.waitingPay },
    { component: 'peak_bonus', amount: mockEarningsBreakdown.peakBonus },
    { component: 'customer_tip', amount: mockEarningsBreakdown.customerTip },
    { component: 'platform_fee', amount: mockEarningsBreakdown.platformFee },
  ];
  const now = Date.now();
  return {
    id: 'payout-today',
    identityId: 'id-nelson',
    periodFrom: new Date(now - 1000 * 60 * 60 * 6.5).toISOString(),
    periodTo: new Date(now).toISOString(),
    lines,
    gross: mockEarningsBreakdown.total,
    state: 'scheduled',
  };
}

function buildHistoryPayouts(): Payout[] {
  const now = Date.now();
  return mockDeliveryHistory.map((h, i) => ({
    id: `payout-${h.id}`,
    identityId: 'id-nelson',
    periodFrom: new Date(now - (i + 1) * 60 * 60 * 1000).toISOString(),
    periodTo: new Date(now - i * 60 * 60 * 1000).toISOString(),
    lines: [{ component: 'base_pay', amount: h.payout }],
    gross: h.payout,
    state: h.status === 'completed' ? 'paid' : 'failed',
  }));
}

export function createMockRiderRepository(): RiderRepository {
  return {
    getProfile: () => mockRiderProfile,
    getStats: () => mockRiderStats,
    isOnline: () => online,
    setOnline: (value) => {
      online = value;
      if (!value) {
        activeDelivery = null;
        currentRequest = null;
      } else {
        currentRequest = mockDeliveryRequest;
      }
    },
    isDarkTheme: () => darkTheme,
    setDarkTheme: (value) => { darkTheme = value; },
    isCashOrders: () => cashOrders,
    setCashOrders: (value) => { cashOrders = value; },
    getActiveDelivery: () => activeDelivery,
    getDeliveryRequest: () => (online && !activeDelivery ? currentRequest : null),
    acceptDelivery: () => {
      currentRequest = null;
      activeDelivery = { ...mockActiveDelivery, step: 'pickup' };
      currentStep = 'pickup';
    },
    expireDelivery: () => {
      currentRequest = null;
    },
    advanceStep: () => {
      if (!activeDelivery) return;
      const steps: RiderStep[] = ['pickup', 'picked_up', 'delivered'];
      const idx = steps.indexOf(currentStep);
      if (idx < steps.length - 1) {
        currentStep = steps[idx + 1];
        activeDelivery = { ...activeDelivery, step: currentStep };
        if (currentStep === 'delivered') {
          setTimeout(() => {
            activeDelivery = null;
            currentStep = 'pickup';
            currentRequest = mockDeliveryRequest;
          }, 2000);
        }
      }
    },
    getEarningsBreakdown: () => mockEarningsBreakdown,
    getPayouts: () => [buildTodayPayout(), ...buildHistoryPayouts()],
    getHistory: () => mockDeliveryHistory,
  };
}
