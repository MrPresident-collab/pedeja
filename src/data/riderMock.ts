import type { Money } from '@/types/common';
import type {
  ActiveDelivery,
  DeliveryHistoryItem,
  EarningsBreakdown,
  RiderDeliveryRequest,
  RiderProfile,
  RiderStats,
} from '@/repositories/riderTypes';

function m(amount: number): Money {
  return { amount, currency: 'AOA' };
}

export const mockRiderProfile: RiderProfile = {
  name: 'Nelson Kiala',
  phone: '+244 933 000 402',
  initials: 'NK',
  vehicle: 'mota',
  vehicleLabel: 'Mota Honda CB 150',
  rating: 4.9,
  onlineHours: 6.5,
  joinedDate: 'Agosto 2026',
  documentsState: {
    'Bilhete de Identidade': 'verified',
    'Carta de Condução': 'verified',
    'Registo Criminal': 'pending',
  },
};

export const mockRiderStats: RiderStats = {
  todayEarnings: m(1850),
  deliveriesCompleted: 4,
  avgPerDelivery: m(463),
  onTimePct: 96,
  rating: 4.9,
  onlineHours: 6.5,
  totalDeliveries: 287,
};

export const mockDeliveryRequest: RiderDeliveryRequest = {
  id: 'drq-001',
  orderId: 'PJD-2052',
  business: 'Cantinho da Belita',
  businessType: 'Comida angolana',
  customer: 'Joana S.',
  customerAddress: 'Rua 5, Talatona',
  pickupAddress: 'Cantinho da Belita, Miramar',
  distanceLabel: '2,3 km',
  distanceMeters: 2300,
  etaLabel: '~12 min',
  etaMinutes: 12,
  earnings: m(500),
  instructions: 'Portão azul, 2º andar.',
};

export const mockActiveDelivery: ActiveDelivery = {
  id: 'del-2052',
  orderId: 'PJD-2052',
  business: 'Cantinho da Belita',
  businessType: 'Comida angolana',
  customer: 'Joana S.',
  customerPhone: '+244 923 111 222',
  customerAddress: 'Rua 5, Talatona',
  pickupAddress: 'Cantinho da Belita, Miramar',
  dropoffAddress: 'Rua 5, Talatona',
  distanceLabel: '2,3 km',
  etaLabel: '~12 min',
  step: 'pickup',
  earnings: m(500),
  instructions: 'Portão azul, 2º andar.',
};

export const mockEarningsBreakdown: EarningsBreakdown = {
  basePay: m(350),
  distancePay: m(120),
  waitingPay: m(80),
  peakBonus: m(200),
  customerTip: m(100),
  platformFee: m(-100),
  total: m(1850),
};

export const mockDeliveryHistory: DeliveryHistoryItem[] = [
  { id: 'del-h1', orderId: 'PJD-2051', date: 'Hoje, 11:45', business: 'Sabores da Vila', businessType: 'Comida caseira', destination: 'Marginal, Luanda', distanceLabel: '1,8 km', status: 'completed', payout: m(420), rating: 5 },
  { id: 'del-h2', orderId: 'PJD-2049', date: 'Hoje, 10:20', business: 'Meu Super', businessType: 'Compras', destination: 'Talatona, Luanda', distanceLabel: '3,1 km', status: 'completed', payout: m(580), rating: 4 },
  { id: 'del-h3', orderId: 'PJD-2047', date: 'Hoje, 09:05', business: 'Farmácia Vitalidade', businessType: 'Farmácia', destination: 'Ingombota, Luanda', distanceLabel: '2,7 km', status: 'completed', payout: m(450), rating: 5 },
  { id: 'del-h4', orderId: 'PJD-2045', date: 'Hoje, 08:12', business: 'Cantinho da Belita', businessType: 'Comida angolana', destination: 'Kilamba, Luanda', distanceLabel: '4,2 km', status: 'completed', payout: m(400), rating: 5 },
  { id: 'del-h5', orderId: 'PJD-2040', date: 'Ontem, 19:30', business: 'Sabores da Vila', businessType: 'Comida caseira', destination: 'Samba, Luanda', distanceLabel: '2,0 km', status: 'completed', payout: m(390), rating: 5 },
  { id: 'del-h6', orderId: 'PJD-2038', date: 'Ontem, 17:15', business: 'Kero Supermercado', businessType: 'Supermercado', destination: 'Talatona, Luanda', distanceLabel: '5,1 km', status: 'cancelled', payout: m(200) },
  { id: 'del-h7', orderId: 'PJD-2035', date: 'Ontem, 14:40', business: 'Meu Super', businessType: 'Compras', destination: 'Miramar, Luanda', distanceLabel: '1,5 km', status: 'completed', payout: m(350), rating: 4 },
  { id: 'del-h8', orderId: 'PJD-2032', date: '08 Set, 12:10', business: 'Cantinho da Belita', businessType: 'Comida angolana', destination: 'Ingombota, Luanda', distanceLabel: '3,4 km', status: 'completed', payout: m(520), rating: 5 },
];
