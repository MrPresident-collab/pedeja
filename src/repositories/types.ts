import type {
  Address,
  Business,
  CartLine,
  Category,
  DeliveryInstruction,
  ID,
  Order,
  PaymentMethod,
  Product,
  Profile,
  Vehicle,
} from '@/types';
import type { ParcelSize, VehicleType } from '@/types/common';
import type {
  AddressRef,
  Delivery,
  DeliveryAssignment,
  Identity,
  Notification,
  OrderEvent,
  Parcel,
  ParcelEstimate,
  Payment,
  PaymentState,
  Rating,
  SupportMessage,
  SupportTicket,
  SupportTicketState,
} from '@/types/domain';

export type ExploreGroup = {
  title: string;
  links: string[];
};

export type PaymentMethodOption = {
  id: PaymentMethod;
  label: string;
  available: boolean;
};

export type ParcelEstimateInput = {
  size: 'pequeno' | 'medio' | 'grande';
  vehicle: 'mota' | 'carro' | 'van';
  distanceMeters: number;
  factors: string[];
};

export type CreateParcelInput = {
  content: string;
  size: ParcelSize;
  vehicle: VehicleType;
  pickup: AddressRef;
  dropoff: AddressRef;
  distanceMeters: number;
  factors: string[];
};

export type SupportMessageAuthor = SupportMessage['author'];

export type CreateOrderInput = {
  merchant: string;
  merchantId?: ID;
  type: string;
  icon: Order['icon'];
  lines: CartLine[];
  subtotal: number;
  discounts: number;
  deliveryFee: number;
  tip: number;
  total: number;
  paymentMethod?: PaymentMethod;
  note?: string;
};

export interface AuthRepository {
  getIdentity(): Identity | null;
  requestOtp(phone: string): Promise<boolean>;
  verifyOtp(phone: string, token: string): Promise<boolean>;
  signOut(): void;
}

export interface ProfileRepository {
  getProfile(): Profile;
  getIdentity(): Identity;
}

export interface LocationRepository {
  listAddresses(): Address[];
  getDefaultAddress(): Address | null;
  addAddress(address: Address): Address;
}

export interface MerchantRepository {
  listNearby(limit?: number): Business[];
  listByCategory(category: Category): Business[];
  getById(id: string): Business | null;
}

export interface ProductRepository {
  listByBusiness(businessId: string): Product[];
  getById(id: string): Product | null;
}

export interface OrderRepository {
  listActive(): Order[];
  listHistory(): Order[];
  getById(id: string): Order | null;
  create(input: CreateOrderInput): Order;
  repeat(orderId: string): Order | null;
  cancelOrder(orderId: string): Order | null;
  getOrderEvents(orderId: string): OrderEvent[];
}

export interface CartRepository {
  getBusiness(): Business | null;
  getLines(): CartLine[];
  getTip(): number;
  getDeliveryFee(): number;
  setBusiness(business: Business | null, deliveryFee: number): void;
  addProduct(product: Product): void;
  setQuantity(productId: string, quantity: number): void;
  removeProduct(productId: string): void;
  setTip(amount: number): void;
  clear(): void;
}

export interface RatingRepository {
  getForOrder(orderId: string): Rating | null;
  submitFor(orderId: string, score: number, comment?: string): void;
}

export interface DeliveryRepository {
  getForOrder(orderId: string): Delivery | null;
  listAssignments(deliveryId: string): DeliveryAssignment[];
  getActiveAssignment(deliveryId: string): DeliveryAssignment | null;
}

export interface PaymentRepository {
  listMethods(): PaymentMethodOption[];
  getOrderPayment(orderId: string): Payment | null;
  updatePaymentStatus(orderId: string, state: PaymentState): void;
}

export interface ParcelRepository {
  listVehicles(): Vehicle[];
  listInstructions(): DeliveryInstruction[];
  estimate(input: ParcelEstimateInput): ParcelEstimate;
  createParcel(input: CreateParcelInput): Parcel;
  getParcel(id: string): Parcel | null;
}

export interface ExploreRepository {
  getGroups(): ExploreGroup[];
}

export interface NotificationRepository {
  list(): Notification[];
  listUnread(): Notification[];
  markRead(id: string): void;
  markAllAsRead(): void;
}

export interface SupportRepository {
  listTickets(): SupportTicket[];
  createTicket(ticket: SupportTicket): SupportTicket;
  getTicket(id: string): SupportTicket | null;
  addMessage(ticketId: string, author: SupportMessageAuthor, body: string): SupportTicket;
  updateStatus(ticketId: string, state: SupportTicketState): void;
}

export interface Repositories {
  auth: AuthRepository;
  profile: ProfileRepository;
  location: LocationRepository;
  merchant: MerchantRepository;
  product: ProductRepository;
  cart: CartRepository;
  order: OrderRepository;
  delivery: DeliveryRepository;
  payment: PaymentRepository;
  parcel: ParcelRepository;
  explore: ExploreRepository;
  notification: NotificationRepository;
  support: SupportRepository;
  rating: RatingRepository;
}