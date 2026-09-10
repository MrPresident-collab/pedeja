import type {
  OperationsRepository,
  OpsOrderStatus,
  OpsOrder,
  OpsReport,
} from './operationsTypes';
import {
  mockOperator,
  mockOverview,
  mockOrders,
  mockRiders,
  mockRevenue,
  mockReconciliation,
  mockCashPosition,
  mockCustomers,
  mockReports,
  mockSettings,
  mockStaff,
} from '@/data/operationsMock';

const orders = [...mockOrders];
let riders = [...mockRiders];
const reconciliation = [...mockReconciliation];
let settings = { ...mockSettings };

export function createMockOperationsRepository(): OperationsRepository {
  return {
    getOperator: () => mockOperator,

    getOverview: () => {
      const late = orders.filter((o) => o.flags.late).length;
      const noRider = orders.filter((o) => o.flags.noRider).length;
      const awaitingAccepter = orders.filter((o) => o.flags.awaitingAcceptance).length;
      const paymentsPending = orders.filter((o) => o.flags.paymentPending).length;
      const activeRiders = riders.filter((r) => r.status === 'online' || r.status === 'em_entrega').length;
      return {
        ordersToday: mockOverview.ordersToday,
        revenueToday: mockOverview.revenueToday,
        activeRiders,
        lateOrders: late,
        riders: riders
          .filter((r) => r.status === 'online' || r.status === 'em_entrega')
          .map((r) => ({ id: r.id, name: r.name, area: r.area, status: r.status })),
        revenue7d: mockOverview.revenue7d,
        exceptions: { late, noRider, awaitingAcceptance: awaitingAccepter, paymentsPending },
      };
    },

    listOrders: () => orders,
    getOrder: (id) => orders.find((o) => o.id === id) as OpsOrder,

    updateOrderStatus: (id, status: OpsOrderStatus) => {
      const order = orders.find((o) => o.id === id);
      if (!order) return;
      order.status = status;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const stepMap: Record<OpsOrderStatus, string> = {
        novo: 'Pedido criado',
        aceite: 'Aceite',
        em_preparacao: 'Preparação',
        pronto: 'Pronto',
        recolhido: 'Recolhido',
        em_entrega: 'Em entrega',
        entregue: 'Entregue',
        cancelado: 'Cancelado',
        aguardando_estafeta: 'A aguardar estafeta',
      };
      const step = order.events.find((e) => e.label === stepMap[status]);
      if (step) {
        step.done = true;
        step.time = time;
      }
    },

    reassignDelivery: (orderId, riderId) => {
      const order = orders.find((o) => o.id === orderId);
      const rider = riders.find((r) => r.id === riderId);
      if (!order || !rider) return;
      order.rider = rider.name;
      order.riderPhone = rider.phone;
      order.flags.noRider = false;
      order.events = order.events.map((e) =>
        e.label === 'Em entrega' ? { ...e, done: false } : e
      );
    },

    cancelOrder: (orderId) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      order.status = 'cancelado';
      order.events = order.events.map((e, i) =>
        i === order.events.length - 1
          ? { ...e, label: 'Cancelado', done: true, time: 'Agora' }
          : e
      );
    },

    listRiders: () => riders,
    getRider: (id) => riders.find((r) => r.id === id) ?? null,
    blockRider: (id) => {
      riders = riders.map((r) => (r.id === id ? { ...r, blocked: true } : r));
    },
    unblockRider: (id) => {
      riders = riders.map((r) => (r.id === id ? { ...r, blocked: false } : r));
    },

    getRevenue: () => mockRevenue,
    getReconciliation: () => reconciliation,
    getCashPosition: () => mockCashPosition,

    listCustomers: () => mockCustomers,
    getReports: () => mockReports as OpsReport,
    getSettings: () => settings,
    updateSettings: (partial) => { settings = { ...settings, ...partial }; },
    listStaff: () => mockStaff,
  };
}