import type {
  MerchantRepository,
} from './merchantTypes';
import {
  mockMerchantProfile,
  mockMerchantSettings,
  mockMerchantOrders,
  mockMerchantProducts,
  mockMerchantCategories,
  mockMerchantReport,
} from '@/data/merchantMock';

let settings = { ...mockMerchantSettings };
const orders = [...mockMerchantOrders];
let products = [...mockMerchantProducts];

export function createMockMerchantRepository(): MerchantRepository {
  return {
    getProfile: () => mockMerchantProfile,
    getSettings: () => settings,
    updateSettings: (partial) => { settings = { ...settings, ...partial }; },
    isOpen: () => settings.open,
    setOpen: (value) => { settings = { ...settings, open: value }; },
    listOrders: () => orders,
    getOrder: (id) => orders.find((o) => o.id === id) ?? null,
    updateOrderStatus: (id, status) => {
      const order = orders.find((o) => o.id === id);
      if (!order) return;
      order.status = status;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const step = order.timeline.find((t) => t.status === status);
      if (step) {
        step.done = true;
        step.time = time;
      }
    },
    listProducts: () => products,
    listCategories: () => mockMerchantCategories,
    addProduct: (input) => {
      const id = `mp-${Date.now()}`;
      const product = { ...input, id };
      products = [...products, product];
      return product;
    },
    updateProduct: (id, partial) => {
      products = products.map((p) => (p.id === id ? { ...p, ...partial } : p));
    },
    toggleProductAvailability: (id) => {
      products = products.map((p) => (p.id === id ? { ...p, available: !p.available } : p));
    },
    setProductAvailability: (id, available) => {
      products = products.map((p) => (p.id === id ? { ...p, available } : p));
    },
    getReport: () => mockMerchantReport,
    isOrdersPaused: () => settings.ordersPaused,
    setOrdersPaused: (value) => { settings = { ...settings, ordersPaused: value }; },
    pauseOrders: () => { settings = { ...settings, ordersPaused: true }; },
    resumeOrders: () => { settings = { ...settings, ordersPaused: false }; },
    signOut: () => { window.location.href = '/'; },
  };
}
