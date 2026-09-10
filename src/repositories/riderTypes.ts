import type { Money, VehicleType } from '@/types/common';
import type { Payout } from '@/types/domain';

export type RiderStep = 'pickup' | 'picked_up' | 'delivered';

export type RiderDeliveryRequest = {
  id: string;
  orderId: string;
  business: string;
  businessType: string;
  customer: string;
  customerAddress: string;
  pickupAddress: string;
  distanceLabel: string;
  distanceMeters: number;
  etaLabel: string;
  etaMinutes: number;
  earnings: Money;
  instructions?: string;
};

export type ActiveDelivery = {
  id: string;
  orderId: string;
  business: string;
  businessType: string;
  customer: string;
  customerPhone: string;
  customerAddress: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceLabel: string;
  etaLabel: string;
  step: RiderStep;
  paymentMethod: 'cash' | 'multicaixa';
  earnings: Money;
  tip?: Money;
  instructions?: string;
};

export type DeliveryHistoryItem = {
  id: string;
  orderId: string;
  date: string;
  business: string;
  businessType: string;
  destination: string;
  distanceLabel: string;
  status: 'completed' | 'cancelled';
  payout: Money;
  rating?: number;
};

export type EarningsBreakdown = {
  basePay: Money;
  distancePay: Money;
  waitingPay: Money;
  peakBonus: Money;
  customerTip: Money;
  platformFee: Money;
  total: Money;
};

export type RiderStats = {
  todayEarnings: Money;
  deliveriesCompleted: number;
  avgPerDelivery: Money;
  onTimePct: number;
  rating: number;
  onlineHours: number;
  totalDeliveries: number;
};

export type RiderProfile = {
  name: string;
  phone: string;
  initials: string;
  vehicle: VehicleType;
  vehicleLabel: string;
  rating: number;
  onlineHours: number;
  joinedDate: string;
  documentsState: Record<string, 'verified' | 'pending' | 'rejected'>;
};

export interface RiderRepository {
  getProfile(): RiderProfile;
  getStats(): RiderStats;
  isOnline(): boolean;
  setOnline(value: boolean): void;
  isDarkTheme(): boolean;
  setDarkTheme(value: boolean): void;
  isCashOrders(): boolean;
  setCashOrders(value: boolean): void;
  getActiveDelivery(): ActiveDelivery | null;
  getDeliveryRequest(): RiderDeliveryRequest | null;
  acceptDelivery(requestId: string): void;
  expireDelivery(requestId: string): void;
  advanceStep(): void;
  getEarningsBreakdown(): EarningsBreakdown;
  getPayouts(): Payout[];
  getHistory(): DeliveryHistoryItem[];
}
