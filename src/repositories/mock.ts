import {
  mockAddresses,
  mockBusinesses,
  mockEstafetaVehicles,
  mockExploreGroups,
  mockIdentity,
  mockOrders,
  mockParcelVehicleCatalog,
  mockPaymentMethods,
  mockProducts,
  mockProfile,
  mockRatings,
  mockShopProducts,
  mockStoreProducts,
} from '@/data/mock';
import type {
  AppearanceMode,
  CreateOrderInput,
  CreateParcelOrderInput,
  NotificationPreferences,
  Repositories,
} from './types';
import type { Address, CartLine, Order, PaymentMethod } from '@/types';
import type { ParcelOrder, ParcelStatus } from '@/types';
import type {
  Delivery,
  DeliveryAssignment,
  Identity,
  Notification,
  OrderEvent,
  OrderEventType,
  Payment,
  PaymentState,
  Rating,
  SupportTicket,
} from '@/types/domain';
import { parcelStatusLabel } from '@/services/parcel/labels';

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

let mutableProfile = { ...mockProfile };
let trustedPhone = mockProfile.phone;
let pendingPhone: string | null = null;
let otpRequestedAt = 0;
let otpAttempts = 0;
const OTP_EXPIRES_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const DEMO_OTP_CODE = '1234';

let preferredPayment: PaymentMethod = 'cash';
let notificationPrefs: NotificationPreferences = { orders: true, security: true, promotions: false };
let appearanceMode: AppearanceMode = 'light';
let deletionState: { state: 'none' | 'pending'; requestedAt?: string } = { state: 'none' };

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
  if (order.kind === 'parcel' && order.parcel) {
    switch (order.parcel.status) {
      case 'entregue':
        return 'confirmed';
      case 'cancelado':
      case 'falhou':
      case 'devolvido_remetente':
        return 'refunded';
      default:
        return 'pending';
    }
  }
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

const parcelTerminalStatuses: ReadonlyArray<ParcelStatus> = [
  'entregue',
  'cancelado',
  'falhou',
  'devolvido_remetente',
];

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sin));
}

function estimateDistanceKm(pickup: Address, destination: Address): number {
  const p = pickup.coordinates;
  const d = destination.coordinates;
  if (p && d) {
    const km = haversineKm(p.latitude, p.longitude, d.latitude, d.longitude);
    if (km > 0.05) return km;
  }
  return 2.3;
}

function legacyStatusFor(status: ParcelStatus): Order['status'] {
  switch (status) {
    case 'cancelado':
      return 'cancelado';
    case 'entregue':
      return 'entregue';
    default:
      return 'novo';
  }
}

function isParcelActive(status: ParcelStatus): boolean {
  return !parcelTerminalStatuses.includes(status);
}

function clockTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function buildParcelOrder(parcel: ParcelOrder): Order {
  orderCounter += 1;
  const now = new Date();
  const time = clockTime();
  const pickup = parcel.pickup.line || parcel.pickup.label || 'Recolha';
  const dropoff = parcel.destination.line || parcel.destination.label || 'Destino';
  const order: Order = {
    id: `PJD-${2049 + orderCounter}`,
    kind: 'parcel',
    merchant: `Enviar · ${pickup} → ${dropoff}`,
    type: 'Enviar',
    date: `Hoje, ${time}`,
    createdAt: now.toISOString(),
    total: parcel.estimate.total,
    status: legacyStatusFor(parcel.status),
    items: 1,
    distance: `${parcel.estimate.distanceKm.toFixed(1)} km`,
    duration: `${parcel.estimate.durationMinutes} min`,
    icon: 'send',
    active: isParcelActive(parcel.status),
    paymentMethod: parcel.paymentMethod,
    parcel,
  };
  mockOrders.unshift(order);
  return order;
}

function cancelParcelInStore(order: Order, reason: string): boolean {
  const parcel = order.parcel;
  if (!parcel) return false;
  const cancellable: ReadonlyArray<ParcelStatus> = [
    'criado',
    'a_procurar_estafeta',
    'estafeta_atribuido',
    'a_caminho_recolha',
    'chegou_recolha',
  ];
  if (!cancellable.includes(parcel.status)) return false;
  const at = new Date().toISOString();
  parcel.cancellation = { reason, at };
  parcel.status = 'cancelado';
  parcel.updatedAt = at;
  parcel.timeline.push({
    status: 'cancelado',
    label: 'Envio cancelado pelo cliente',
    at,
  });
  order.status = 'cancelado';
  order.active = false;
  return true;
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
    createdAt: now.toISOString(),
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
    deliveryTo: input.deliveryTo,
    deliveryAddressId: input.deliveryAddressId,
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
      getProfile: () => mutableProfile,
      getIdentity: () => mockIdentity,
      updateName: (name) => {
        const trimmed = name.trim();
        if (trimmed) mutableProfile = { ...mutableProfile, name: trimmed };
        return mutableProfile;
      },
      isPhoneVerified: () => trustedPhone === mutableProfile.phone,
      requestPhoneChange: (phone) => {
        pendingPhone = phone;
        otpRequestedAt = Date.now();
        otpAttempts = 0;
        return { success: true };
      },
      verifyPhoneChange: (phone, code) => {
        if (pendingPhone !== phone) {
          return { success: false, error: 'O número mudou. Pede um novo código.' };
        }
        const expired = Date.now() - otpRequestedAt > OTP_EXPIRES_MS;
        if (expired) {
          pendingPhone = null;
          return { success: false, error: 'Código expirado. Pede um novo código.' };
        }
        if (code.trim() !== DEMO_OTP_CODE) {
          otpAttempts += 1;
          if (otpAttempts >= OTP_MAX_ATTEMPTS) {
            pendingPhone = null;
            return { success: false, error: 'Código expirado por demasiadas tentativas. Pede um novo código.' };
          }
          return { success: false, error: 'Código incorreto. No modo demo usa o código 1234.' };
        }
        mutableProfile = { ...mutableProfile, phone };
        trustedPhone = phone;
        pendingPhone = null;
        return { success: true };
      },
      setEmail: (email) => {
        const trimmed = email.trim();
        if (trimmed) mutableProfile = { ...mutableProfile, email: trimmed };
        return mutableProfile;
      },
      getDeletionRequest: () => ({ ...deletionState }),
      requestAccountDeletion: () => {
        deletionState = { state: 'pending', requestedAt: new Date().toISOString() };
        return { success: true };
      },
    },
    location: {
      listAddresses: () => mockAddresses,
      getDefaultAddress: () => mockAddresses.find((a) => a.current) ?? mockAddresses[0] ?? null,
      addAddress: (address) => {
        if (mockAddresses.length === 0) address.current = true;
        mockAddresses.push(address);
        return address;
      },
      updateAddress: (id, changes) => {
        const address = mockAddresses.find((a) => a.id === id);
        if (!address) return null;
        Object.assign(address, changes);
        return address;
      },
      removeAddress: (id) => {
        const index = mockAddresses.findIndex((a) => a.id === id);
        if (index === -1) return false;
        const [removed] = mockAddresses.splice(index, 1);
        if (removed.current && mockAddresses.length > 0) mockAddresses[0].current = true;
        return true;
      },
      setDefault: (id) => {
        const target = mockAddresses.find((a) => a.id === id);
        if (!target) return false;
        mockAddresses.forEach((a) => {
          a.current = a.id === id;
        });
        return true;
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
        if (business) {
          if (cartBusiness && cartBusiness !== business.id && cartLines.length > 0) {
            cartLines = [];
            cartTip = 0;
          }
        }
        cartBusiness = business ? business.id : null;
        cartDeliveryFee = deliveryFee;
      },
      addProduct: (product) => {
        const line = cartLines.find((l) => l.productId === product.id);
        if (line) {
          line.quantity = Math.min(line.quantity + 1, 99);
        } else {
          cartLines.push({ productId: product.id, name: product.name, unitPrice: product.price, quantity: 1 });
        }
      },
      setQuantity: (productId, quantity) => {
        const existing = cartLines.find((l) => l.productId === productId);
        if (!existing) return;
        const next = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
        if (next === 0) {
          cartLines = cartLines.filter((l) => l.productId !== productId);
        } else {
          existing.quantity = Math.min(next, 99);
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
          deliveryTo: source.deliveryTo,
          deliveryAddressId: source.deliveryAddressId,
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
      getDefaultMethod: () => preferredPayment,
      setDefaultMethod: (method) => {
        if (mockPaymentMethods.some((m) => m.id === method && m.available)) preferredPayment = method;
      },
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
      getVehicleCatalog: () => mockParcelVehicleCatalog,
      getEstafetaVehicles: () => mockEstafetaVehicles,
      estimateDistanceKm: (pickup, destination) =>
        estimateDistanceKm(pickup, destination),
      createParcelOrder: (input: CreateParcelOrderInput): Order => {
        const parcel = input.parcel;
        const now = new Date().toISOString();
        const updated: ParcelOrder = {
          ...parcel,
          updatedAt: now,
        };
        if (updated.timeline.length === 0) {
          updated.timeline = [
            { status: updated.status, label: parcelStatusLabel(updated.status), at: now },
          ];
        }
        const state = buildParcelOrder(updated);
        return state;
      },
      getParcelOrder: (orderId) =>
        mockOrders.find((o) => o.id === orderId && o.kind === 'parcel') ?? null,
      cancelParcelOrder: (orderId, reason) => {
        const order = mockOrders.find((o) => o.id === orderId && o.kind === 'parcel');
        if (!order?.parcel) {
          return { ok: false, message: 'Envio não encontrado.' };
        }
        const cancelled = cancelParcelInStore(order, reason);
        return cancelled
          ? { ok: true }
          : { ok: false, message: 'Este envio já não pode ser cancelado.' };
      },
      advanceParcelStatus: (orderId, next) => {
        const order = mockOrders.find((o) => o.id === orderId && o.kind === 'parcel');
        if (!order?.parcel) return false;
        const parcel = order.parcel;
        const at = new Date().toISOString();
        parcel.status = next;
        parcel.updatedAt = at;
        parcel.timeline.push({
          status: next,
          label: parcelStatusLabel(next),
          at,
        });
        order.status = legacyStatusFor(next);
        order.active = isParcelActive(next);
        return true;
      },
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
      getPreferences: () => ({ ...notificationPrefs }),
      setPromotionsEnabled: (enabled) => {
        notificationPrefs = { ...notificationPrefs, promotions: enabled };
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
    settings: {
      getAppearance: () => appearanceMode,
      setAppearance: (mode) => {
        appearanceMode = mode;
      },
    },
  };
}