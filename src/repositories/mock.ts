import {
  mockAddresses,
  mockBusinesses,
  mockDeliveryInstructions,
  mockExploreGroups,
  mockIdentity,
  mockOrders,
  mockPaymentMethods,
  mockProducts,
  mockProfile,
  mockRatings,
  mockShopProducts,
  mockStoreProducts,
  mockVehicles,
} from '@/data/mock';
import type { CreateOrderInput, Repositories } from './types';
import type { CartLine, Order } from '@/types';
import type { Delivery, Identity, ParcelEstimate, Rating, SupportTicket } from '@/types/domain';

function toMoney(amount: number) {
  return { amount, currency: 'AOA' as const };
}

const noOp = () => {};

let orderCounter = 0;
let cartBusiness: string | null = null;
let cartDeliveryFee = 700;
let cartTip = 0;
let cartLines: CartLine[] = [];

function buildOrder(input: CreateOrderInput): Order {
  orderCounter += 1;
  const discount = input.discounts;
  const total = input.total > 0 ? input.total : input.subtotal - discount + input.deliveryFee + input.tip;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const order: Order = {
    id: `PJD-${2049 + orderCounter}`,
    merchant: input.merchant,
    type: input.type,
    date: `Hoje, ${time}`,
    total,
    status: 'novo',
    items: input.lines.reduce((sum, l) => sum + l.quantity, 0),
    distance: input.merchantId?.startsWith('b3') || input.merchantId === 'b5' ? '3.1 km' : '2.3 km',
    duration: '28 min',
    icon: input.icon,
    active: true,
    subtotal: input.subtotal,
    deliveryFee: input.deliveryFee,
    discount: discount || undefined,
    tip: input.tip || undefined,
    paymentMethod: input.paymentMethod ?? 'cash',
    lines: input.lines,
    timeline: [
      { status: 'novo', label: 'Pedido confirmado', timestamp: time, done: true },
      { status: 'preparando', label: 'A preparar o teu pedido', timestamp: '—', done: false },
      { status: 'pronto', label: 'A caminho de ti', timestamp: '—', done: false },
      { status: 'entregue', label: 'Entregue', timestamp: '—', done: false },
    ],
  };
  mockOrders.unshift(order);
  return order;
}

export function createMockRepositories(): Repositories {
  return {
    auth: {
      getIdentity(): Identity | null {
        return mockIdentity;
      },
      requestOtp: async () => true,
      verifyOtp: async () => true,
      signOut: noOp,
    },
    profile: {
      getProfile: () => mockProfile,
      getIdentity: () => mockIdentity,
    },
    location: {
      listAddresses: () => mockAddresses,
      getDefaultAddress: () => mockAddresses.find((a) => a.current) ?? mockAddresses[0] ?? null,
      addAddress: (address) => {
        mockAddresses.push(address);
        return address;
      },
    },
    merchant: {
      listNearby: (limit?: number) => (limit ? mockBusinesses.slice(0, limit) : mockBusinesses),
      listByCategory: (category) => mockBusinesses.filter((b) => b.category === category),
      getById: (id) => mockBusinesses.find((b) => b.id === id) ?? null,
    },
    product: {
      listByBusiness: (businessId) => {
        if (businessId === 'b1' || businessId === 'b2') return mockProducts;
        if (businessId === 'b3' || businessId === 'b4') return mockShopProducts;
        if (businessId === 'b5') return mockStoreProducts;
        return [];
      },
      getById: (id) =>
        mockProducts.find((p) => p.id === id) ??
        mockShopProducts.find((p) => p.id === id) ??
        mockStoreProducts.find((p) => p.id === id) ??
        null,
    },
    cart: {
      getBusiness: () => {
        const business = mockBusinesses.find((b) => b.id === cartBusiness);
        return business ?? null;
      },
      getLines: () => cartLines.map((l) => ({ ...l })),
      getTip: () => cartTip,
      getDeliveryFee: () => cartDeliveryFee,
      setBusiness: (business, deliveryFee) => {
        cartBusiness = business ? business.id : null;
        cartDeliveryFee = deliveryFee;
      },
      addProduct: (product) => {
        const line = cartLines.find((l) => l.productId === product.id);
        if (line) {
          line.quantity += 1;
        } else {
          cartLines.push({ productId: product.id, name: product.name, unitPrice: product.price, quantity: 1 });
        }
      },
      setQuantity: (productId, quantity) => {
        const existing = cartLines.find((l) => l.productId === productId);
        if (!existing) return;
        if (quantity <= 0) {
          cartLines = cartLines.filter((l) => l.productId !== productId);
        } else {
          existing.quantity = quantity;
        }
      },
      removeProduct: (productId) => {
        cartLines = cartLines.filter((l) => l.productId !== productId);
      },
      setTip: (amount) => {
        cartTip = amount;
      },
      clear: () => {
        cartLines = [];
        cartBusiness = null;
        cartTip = 0;
        cartDeliveryFee = 700;
      },
    },
    order: {
      listActive: () => mockOrders.filter((o) => o.active),
      listHistory: () => mockOrders.filter((o) => !o.active),
      getById: (id) => mockOrders.find((o) => o.id === id) ?? null,
      create: buildOrder,
      repeat: (orderId) => {
        const source = mockOrders.find((o) => o.id === orderId);
        if (!source) return null;
        const lines = source.lines ?? [];
        const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
        return buildOrder({
          merchant: source.merchant,
          type: source.type,
          icon: source.icon,
          lines,
          subtotal,
          discounts: 0,
          deliveryFee: source.deliveryFee ?? 700,
          tip: 0,
          total: 0,
        });
      },
    },
    delivery: {
      getForOrder: (orderId): Delivery | null => {
        const order = mockOrders.find((o) => o.id === orderId);
        if (!order) return null;
        return {
          id: `del-${order.id}`,
          orderId: order.id,
          pickup: {
            snapshot: {
              id: 'mk-pickup',
              label: 'Restaurante',
              formatted: order.merchant,
            },
          },
          dropoff: {
            snapshot: {
              id: 'mk-dropoff',
              label: 'Entrega',
              formatted: mockAddresses[0]?.line ?? '',
            },
          },
          distanceMeters: 2300,
          vehicle: 'mota',
          state: 'in_transit',
          estimatedDurationMin: 28,
          earnings: {
            basePay: toMoney(350),
            distancePay: toMoney(120),
            waitingPay: toMoney(0),
            peakBonus: toMoney(0),
            customerTip: toMoney(0),
            platformFee: toMoney(60),
            gross: toMoney(410),
          },
        };
      },
      listAssignments: () => [],
    },
    payment: {
      listMethods: () => mockPaymentMethods,
    },
    parcel: {
      listVehicles: () => mockVehicles,
      listInstructions: () => mockDeliveryInstructions,
      estimate: (input): ParcelEstimate => {
        const base = (
          {
            pequeno: { predio: 12, kmelta: 80 },
            medio: { predio: 18, kmelta: 90 },
            grande: { predio: 25, kmelta: 110 },
          } as const
        )[input.size];
        const trafficMult = input.factors.includes('Trânsito intenso') ? 1.25 : input.factors.includes('Trânsito moderado') ? 1.1 : 1;
        const rainMult = input.factors.includes('Pluviosidade') ? 1.15 : 1;
        const roadMult = input.factors.includes('Estrada precária') ? 1.3 : 1;
        const vehicleMult = input.vehicle === 'mota' ? 1 : input.vehicle === 'carro' ? 1.6 : 2.4;
        const distanceKm = input.distanceMeters / 1000;
        const durationMin = Math.round((base.predio + distanceKm * 5) * trafficMult);
        const price = Math.round((base.kmelta + distanceKm * base.kmelta) * vehicleMult * trafficMult * rainMult * roadMult);
        return {
          distanceMeters: input.distanceMeters,
          durationMin,
          price: toMoney(price),
          factors: input.factors,
        };
      },
    },
    explore: {
      getGroups: () => mockExploreGroups,
    },
    notification: {
      list: () => [],
      markRead: noOp,
    },
    support: {
      listTickets(): SupportTicket[] {
        return [];
      },
      createTicket: (ticket) => ticket,
    },
    rating: {
      getForOrder: (orderId): Rating | null => {
        const found = mockRatings.find((r) => r.orderId === orderId);
        if (!found) return null;
        return {
          id: `r-${orderId}`,
          targetIdentityId: mockIdentity.id,
          authorIdentityId: mockIdentity.id,
          context: { kind: 'order', ref: orderId },
          score: found.score as Rating['score'],
          comment: found.comment,
          createdAt: found.createdAt,
        };
      },
      submitFor: (orderId, score, comment) => {
        const found = mockRatings.find((r) => r.orderId === orderId);
        if (found) {
          found.score = score;
          found.comment = comment ?? found.comment;
        } else {
          mockRatings.push({ orderId, score, comment, createdAt: new Date().toISOString() });
        }
      },
    },
  };
}