import type { PaymentMethod } from '@/types/common';

export type OpsOrderStatus =
  | 'novo'
  | 'aceite'
  | 'em_preparacao'
  | 'pronto'
  | 'recolhido'
  | 'em_entrega'
  | 'entregue'
  | 'cancelado'
  | 'aguardando_estafeta';

export type OpsOrderFlags = {
  late: boolean;
  noRider: boolean;
  awaitingAcceptance: boolean;
  paymentPending: boolean;
};

export type OpsOrderEvent = {
  label: string;
  time: string;
  done: boolean;
};

export type OpsOrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type OpsOrder = {
  id: string;
  time: string;
  customer: string;
  customerPhone: string;
  merchant: string;
  rider: string;
  riderPhone?: string;
  status: OpsOrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'confirmado' | 'pendente' | 'diferente';
  value: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tip: number;
  elapsedMin: number;
  targetMin: number;
  distance: string;
  eta: string;
  instructions?: string;
  merchantArea: string;
  customerArea: string;
  items: OpsOrderItem[];
  events: OpsOrderEvent[];
  flags: { late: boolean; noRider: boolean; awaitingAcceptance: boolean; paymentPending: boolean };
};

export type OpsRiderStatus = 'online' | 'em_entrega' | 'offline' | 'indisponivel';

export type OpsRider = {
  id: string;
  name: string;
  phone: string;
  status: OpsRiderStatus;
  activeOrderId?: string;
  area: string;
  earnings: number;
  deliveries: number;
  avgTimeMin: number;
  rating: number;
  documents: 'verificado' | 'pendente' | 'rejeitado';
  acceptsCash: boolean;
  blocked: boolean;
  since: string;
};

export type OpsCustomer = {
  id: string;
  name: string;
  phone: string;
  orders: number;
  ltv: number;
  lastOrder: string;
  state: 'ativo' | 'suspenso' | 'suspeito';
  memberSince: string;
  neighborhood: string;
};

export type OpsRevenue = {
  daily: number;
  weekly: number;
  monthly: number;
  breakdown: {
    label: string;
    value: number;
  }[];
  byPaymentMethod: {
    method: PaymentMethod;
    orders: number;
    volume: number;
  }[];
};

export type OpsReconciliationItem = {
  id: string;
  orderId: string;
  amount: number;
  state: 'pendente' | 'confirmado' | 'divergente';
  updatedAt: string;
};

export type OpsCashPosition = {
  received: number;
  pending: number;
  toDeliver: number;
  differences: number;
};

export type OpsReport = {
  late: {
    count: number;
    byReason: { label: string; value: number }[];
  };
  riderPerformance: { rider: string; deliveries: number; onTimePct: number; avgMin: number; rating: number }[];
  merchantPerformance: { merchant: string; orders: number; lateCount: number; avgPrepMin: number }[];
  cancelledOrders: number;
  paymentMix: { method: PaymentMethod; count: number }[];
  revenue: { daily: number; weekly: number; monthly: number };
  avgDeliveryMin: number;
};

export type OpsStaff = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  lastActive: string;
};

export type OpsSettings = {
  city: string;
  plannedRestaurants: number;
  activeRestaurants: number;
  deliveryBaseFee: number;
  deliveryPerKm: number;
  cashEnabled: boolean;
  multicaixaEnabled: boolean;
  minPrepAlertMin: number;
};

export interface OperationsRepository {
  getOperator(): { name: string; initials: string; role: string; permissions: string[] };
  getOverview(): {
    ordersToday: number;
    revenueToday: number;
    activeRiders: number;
    lateOrders: number;
    riders: { id: string; name: string; area: string; status: OpsRiderStatus }[];
    revenue7d: { label: string; value: number }[];
    exceptions: { late: number; noRider: number; awaitingAcceptance: number; paymentsPending: number };
  };
  listOrders(): OpsOrder[];
  getOrder(id: string): OpsOrder;
  updateOrderStatus(id: string, status: OpsOrderStatus): void;
  reassignDelivery(orderId: string, riderId: string): void;
  cancelOrder(orderId: string): void;
  listRiders(): OpsRider[];
  getRider(id: string): OpsRider | null;
  blockRider(id: string): void;
  unblockRider(id: string): void;
  getRevenue(): OpsRevenue;
  getReconciliation(): OpsReconciliationItem[];
  getCashPosition(): OpsCashPosition;
  listCustomers(): OpsCustomer[];
  getReports(): OpsReport;
  getSettings(): OpsSettings;
  updateSettings(partial: Partial<OpsSettings>): void;
  listStaff(): OpsStaff[];
}