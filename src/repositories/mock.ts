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
import type { CreateOrderInput, CreateParcelInput, Repositories } from './types';
import type { CartLine, Order } from '@/types';
import type {
  Delivery,
  DeliveryAssignment,
  Identity,
  Notification,
  OrderEvent,
  OrderEventType,
  Parcel,
  ParcelEstimate,
  Payment,
  PaymentState,
  Rating,
  SupportTicket,
} from '@/types/domain';

function toMoney(amount: number) {
  return { amount, currency: 'AOA' as const };
}

const noOp = () => {};

let orderCounter = 0;
let cartBusiness: string | null = null;
let cartDeliveryFee = 700;
let cartTip = 0;
let cartLines: CartLine[] = [];

const paymentOverrides = new Map<string, PaymentState>();
const notifications: Notification[] = [];
const supportTickets: SupportTicket[] = [];
const parcels: Parcel[] = [];

function timeToIso(time: string): string {
  const match = /(\d{2}):(\d{2})/.exec(time);
  if (!match) return new Date().toISOString();
  const now = new Date();
  now.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return now.toISOString();
}

function orderEventTypeFor(status: Order['status']): OrderEventType | null {
  switch (status) {
    case 'novo':
      return 'ORDER_CREATED';
    case 'aceite':
      return 'MERCHANT_ACCEPTED';
    case 'preparando':
      return 'ORDER_PREPARING';
    case 'pronto':
      return 'ORDER_READY';
    case 'recolhido':
      return 'ORDER_PICKED_UP';
    case 'entregue':
      return 'ORDER_DELIVERED';
    case 'cancelado':
      return 'ORDER_CANCELLED';
    default:
      return null;
  }
}

function eventAuthorFor(type: OrderEventType | null): OrderEvent['by'] {
  switch (type) {
    case 'MERCHANT_ACCEPTED':
    case 'ORDER_PREPARING':
    case 'ORDER_READY':
      return { kind: 'merchant', ref: 'b1' };
    case 'ORDER_PICKED_UP':
    case 'ORDER_DELIVERED':
      return { kind: 'delivery_partner', ref: 'id-nelson' };
    case 'ORDER_CREATED':
      return { kind: 'customer', ref: mockIdentity.id };
    default:
      return { kind: 'system' };
  }
}

function derivePaymentState(orderId: string): PaymentState {
  if (paymentOverrides.has(orderId)) return paymentOverrides.get(orderId) as PaymentState;
  const order = mockOrders.find((o) => o.id === orderId);
  if (!order) return 'unpaid';
  switch (order.status) {
    case 'cancelado':
      return 'refunded';
    case 'entregue':
    case 'recolhido':
    case 'pronto':
      return 'confirmed';
    default:
      return 'pending';
  }
}

function estimateParcel(input: {
  size: 'pequeno' | 'medio' | 'grande';
  vehicle: 'mota' | 'carro' | 'van';
  distanceMeters: number;
  factors: string[];
}): ParcelEstimate {
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
}

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
      cancelOrder: (orderId) => {
        const order = mockOrders.find((o) => o.id === orderId);
        if (!order || order.status === 'cancelado' || order.status === 'entregue') return null;
        order.status = 'cancelado';
        order.active = false;
        if (order.timeline) {
          order.timeline.push({
            status: 'cancelado',
            label: 'Cancelado pelo cliente',
            timestamp: 'Agora',
            done: true,
          });
        }
        return order;
      },
      getOrderEvents: (orderId) => {
        const order = mockOrders.find((o) => o.id === orderId);
        if (!order) return [];
        return (order.timeline ?? [])
          .filter((t) => t.done)
          .flatMap((t, i) => {
            const type = orderEventTypeFor(t.status);
            if (!type) return [];
            return [
              {
                id: `evt-${order.id}-${i}`,
                orderId: order.id,
                type,
                occurredAt: t.timestamp === '—' ? new Date().toISOString() : timeToIso(String(t.timestamp)),
                by: eventAuthorFor(type),
              },
            ];
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
      getActiveAssignment: (deliveryId): DeliveryAssignment | null => {
        const orderId = deliveryId.replace(/^del-/, '');
        const order = mockOrders.find((o) => o.id === orderId);
        if (!order || order.status === 'cancelado' || order.status === 'entregue') return null;
        return {
          id: `asg-${deliveryId}`,
          deliveryId,
          partnerId: 'id-nelson',
          status: 'accepted',
          offeredAt: new Date().toISOString(),
          acceptTimeoutSeconds: 15,
        };
      },
    },
    payment: {
      listMethods: () => mockPaymentMethods,
      getOrderPayment: (orderId): Payment | null => {
        const order = mockOrders.find((o) => o.id === orderId);
        if (!order) return null;
        const state = derivePaymentState(orderId);
        return {
          id: `pay-${order.id}`,
          orderId: order.id,
          method: order.paymentMethod ?? 'cash',
          amount: toMoney(order.total),
          state,
          capturedAt: state === 'confirmed' ? new Date().toISOString() : undefined,
          refundedAt: state === 'refunded' ? new Date().toISOString() : undefined,
        };
      },
      updatePaymentStatus: (orderId, state) => {
        paymentOverrides.set(orderId, state);
      },
    },
    parcel: {
      listVehicles: () => mockVehicles,
      listInstructions: () => mockDeliveryInstructions,
      estimate: (input): ParcelEstimate => estimateParcel(input),
      createParcel: (input: CreateParcelInput): Parcel => {
        const parcel: Parcel = {
          id: `par-${Date.now()}`,
          customerId: mockIdentity.id,
          content: input.content,
          size: input.size,
          pickup: input.pickup,
          dropoff: input.dropoff,
          vehicle: input.vehicle,
          estimate: estimateParcel(input),
          evidence: [],
        };
        parcels.unshift(parcel);
        return parcel;
      },
      getParcel: (id) => parcels.find((p) => p.id === id) ?? null,
    },
    explore: {
      getGroups: () => mockExploreGroups,
    },
    notification: {
      list: () => notifications,
      listUnread: () => notifications.filter((n) => !n.read),
      markRead: (id) => {
        const found = notifications.find((n) => n.id === id);
        if (found) found.read = true;
      },
      markAllAsRead: () => {
        notifications.forEach((n) => {
          n.read = true;
        });
      },
    },
    support: {
      listTickets(): SupportTicket[] {
        return supportTickets;
      },
      createTicket: (ticket) => {
        supportTickets.unshift(ticket);
        return ticket;
      },
      getTicket: (id) => supportTickets.find((t) => t.id === id) ?? null,
      addMessage: (ticketId, author, body) => {
        const ticket = supportTickets.find((t) => t.id === ticketId);
        if (!ticket) throw new Error(`Support ticket not found: ${ticketId}`);
        ticket.messages.push({
          id: `sm-${ticketId}-${ticket.messages.length}`,
          author,
          body,
          sentAt: new Date().toISOString(),
        });
        ticket.state = 'waiting';
        return ticket;
      },
      updateStatus: (ticketId, state) => {
        const ticket = supportTickets.find((t) => t.id === ticketId);
        if (ticket) ticket.state = state;
      },
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