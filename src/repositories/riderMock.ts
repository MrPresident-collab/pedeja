import type { RiderRepository, RiderDeliveryRequest, ActiveDelivery, RiderStep } from './riderTypes';
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
    getHistory: () => mockDeliveryHistory,
  };
}
