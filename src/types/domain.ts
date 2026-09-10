import type { Category, GeoPoint, ID, Money, ParcelSize, Timestamp, VehicleType } from './common';

// ================================================================
// IDENTITY & MARKETPLACE CAPABILITY
// ================================================================

export type IdentityStatus = 'active' | 'suspended' | 'deleted';

export type MarketplaceCapability = 'customer' | 'merchant' | 'delivery_partner' | 'partner';

export type CapabilityApprovalState = 'not_requested' | 'pending' | 'approved' | 'rejected' | 'revoked';

export type MarketplaceCapabilityState = {
  capability: MarketplaceCapability;
  approval: CapabilityApprovalState;
  approvedAt?: Timestamp;
};

export type Identity = {
  id: ID;
  status: IdentityStatus;
  capabilities: MarketplaceCapabilityState[];
  internal: InternalAuthority | null;
};

// ================================================================
// INTERNAL AUTHORITY (OPERATIONS) — separate security boundary
// ================================================================

export type InternalPermission =
  | 'ops.view_dashboard'
  | 'ops.manage_orders'
  | 'ops.manage_riders'
  | 'ops.manage_merchants'
  | 'ops.view_finance'
  | 'ops.manage_settings'
  | 'ops.manage_staff';

export type Scope =
  | { kind: 'global' }
  | { kind: 'region'; region: string }
  | { kind: 'merchant'; businessId: ID };

export type Permission = {
  permission: InternalPermission;
  scope: Scope;
};

export type InternalStaff = {
  id: ID;
  identityId: ID;
  employeeCode: string;
  permissions: Permission[];
};

export type InternalAuthority = {
  staffId: ID;
  permissions: Permission[];
};

// ================================================================
// PROFILE / PERSON
// ================================================================

export type Profile = {
  id: ID;
  identityId: ID;
  name: string;
  phone: string;
  email: string;
  avatarRef?: string;
  createdAt: Timestamp;
};

export type CustomerProfile = {
  identityId: ID;
  defaultLocationId?: ID;
  memberSince: Timestamp;
};

export type MerchantProfile = {
  identityId: ID;
  businessIds: ID[];
};

export type DeliveryPartnerStatus = 'invited' | 'documents_review' | 'active' | 'suspended';

export type DeliveryPartnerProfile = {
  identityId: ID;
  status: DeliveryPartnerStatus;
  vehicle: VehicleType;
};

export type PartnerProfile = {
  identityId: ID;
  partnerSince: Timestamp;
};

// ================================================================
// ADDRESS / LOCATION
// ================================================================

export type Address = {
  id: ID;
  label: string;
  formatted?: string;
  province?: string;
  municipality?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  landmark?: string;
  deliveryInstructions?: string;
  coordinates?: GeoPoint;
  isDefault?: boolean;
};

export type AddressRef = {
  addressId?: ID;
  snapshot: Address;
};

// ================================================================
// ORDER — multi-dimensional state (payment ≠ fulfillment ≠ delivery)
// ================================================================

export type PaymentState = 'unpaid' | 'pending' | 'confirmed' | 'failed' | 'refunded';

export type FulfillmentState =
  | 'created'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type DeliveryState =
  | 'none'
  | 'matching'
  | 'assigned'
  | 'pickup_arrived'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed';

export type RiskState = 'normal' | 'review' | 'blocked';

export type OrderState = {
  payment: PaymentState;
  fulfillment: FulfillmentState;
  delivery: DeliveryState;
  risk: RiskState;
};

export type OrderEventType =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'MERCHANT_ACCEPTED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'DELIVERY_ASSIGNED'
  | 'ORDER_PICKED_UP'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'REFUND_ISSUED';

export type EventAuthor =
  | { kind: 'customer'; ref: ID }
  | { kind: 'merchant'; ref: ID }
  | { kind: 'delivery_partner'; ref: ID }
  | { kind: 'system' }
  | { kind: 'internal_staff'; ref: ID }
  | { kind: 'payment_provider'; ref: ID };

export type OrderEvent = {
  id: ID;
  orderId: ID;
  type: OrderEventType;
  occurredAt: Timestamp;
  by?: EventAuthor;
  meta?: Record<string, unknown>;
};

export type OrderItem = {
  id: ID;
  productId?: ID;
  name: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
  notes?: string;
};

export type OrderTotals = {
  subtotal: Money;
  discounts: Money;
  deliveryFee: Money;
  tip: Money;
  total: Money;
};

export type OrderKind = 'marketplace' | 'parcel';

export type Order = {
  id: ID;
  kind: OrderKind;
  customerId: ID;
  source: { category: Category; merchantId?: ID };
  destination: AddressRef;
  items: OrderItem[];
  totals: OrderTotals;
  state: OrderState;
  events: OrderEvent[];
  createdAt: Timestamp;
};

// ================================================================
// DELIVERY / ASSIGNMENT / PARTNER
// ================================================================

export type DeliveryEarnings = {
  basePay: Money;
  distancePay: Money;
  waitingPay: Money;
  peakBonus: Money;
  customerTip: Money;
  platformFee: Money;
  gross: Money;
};

export type Delivery = {
  id: ID;
  orderId: ID;
  pickup: AddressRef;
  dropoff: AddressRef;
  distanceMeters: number;
  vehicle: VehicleType;
  state: DeliveryState;
  estimatedDurationMin: number;
  earnings: DeliveryEarnings;
};

export type DeliveryAssignmentStatus = 'offered' | 'accepted' | 'declined' | 'expired' | 'completed' | 'cancelled';

export type DeliveryAssignment = {
  id: ID;
  deliveryId: ID;
  partnerId: ID;
  status: DeliveryAssignmentStatus;
  offeredAt: Timestamp;
  acceptedAt?: Timestamp;
  acceptTimeoutSeconds: number;
};

export type DeliveryPartner = {
  identityId: ID;
  status: DeliveryPartnerStatus;
  vehicle: VehicleType;
  available: boolean;
  online: boolean;
  activeAssignmentId?: ID;
  location?: GeoPoint;
  performance: {
    rating?: number;
    onTimePct?: number;
    deliveriesCompleted: number;
  };
};

// ================================================================
// MERCHANT / BUSINESS
// ================================================================

export type Merchant = {
  identityId: ID;
  businessIds: ID[];
  approval: CapabilityApprovalState;
};

export type BusinessKind =
  | 'restaurant'
  | 'takeaway'
  | 'kitchen'
  | 'convenience'
  | 'pharmacy'
  | 'supermarket'
  | 'mall'
  | 'franchise';

export type RestaurantProfile = {
  businessId: ID;
  cuisine?: string;
  prepTimeMin?: number;
};

export type BusinessLocation = {
  id: ID;
  name: string;
  address: Address;
};

export type BusinessStaffRole = 'owner' | 'manager' | 'kitchen' | 'cashier';

export type BusinessPermission = 'menu.manage' | 'orders.view' | 'orders.manage' | 'reports.view' | 'settings.manage';

export type BusinessStaff = {
  identityId: ID;
  role: BusinessStaffRole;
  permissions: BusinessPermission[];
};

export type OpeningHours = Record<string, { open: string; close: string } | null>;

export type Business = {
  id: ID;
  merchantId: ID;
  name: string;
  kind: BusinessKind;
  category: Category;
  locations: BusinessLocation[];
  staff: BusinessStaff[];
  hours: OpeningHours;
  restaurant?: RestaurantProfile;
};

export type ProductCategory = {
  id: ID;
  businessId: ID;
  name: string;
  sortOrder: number;
};

export type Product = {
  id: ID;
  businessId: ID;
  categoryId?: ID;
  name: string;
  description?: string;
  price: Money;
  available: boolean;
  preparationMin?: number;
  photoRef?: string;
};

// ================================================================
// PAYMENTS / PAYOUTS
// ================================================================

export type PaymentMethod = 'cash' | 'multicaixa' | 'future';

export type Payment = {
  id: ID;
  orderId: ID;
  method: PaymentMethod;
  amount: Money;
  state: PaymentState;
  capturedAt?: Timestamp;
  refundedAt?: Timestamp;
};

export type PayoutComponentKey = 'base_pay' | 'distance_pay' | 'waiting_time' | 'peak_bonus' | 'customer_tip' | 'platform_fee';

export type PayoutLine = {
  component: PayoutComponentKey;
  amount: Money;
  note?: string;
};

export type PayoutState = 'accrued' | 'scheduled' | 'paid' | 'failed';

export type Payout = {
  id: ID;
  identityId: ID;
  periodFrom: Timestamp;
  periodTo: Timestamp;
  lines: PayoutLine[];
  gross: Money;
  state: PayoutState;
  paidAt?: Timestamp;
};

// ================================================================
// PARCEL / ENVIAR & EVIDENCE
// ================================================================

export type ParcelEstimate = {
  distanceMeters: number;
  durationMin: number;
  price: Money;
  factors: string[];
};

export type Parcel = {
  id: ID;
  customerId: ID;
  content: string;
  size: ParcelSize;
  pickup: AddressRef;
  dropoff: AddressRef;
  vehicle: VehicleType;
  estimate: ParcelEstimate;
  evidence: ParcelEvidence[];
};

export type ParcelEvidenceKind = 'sender_photo' | 'pickup_photo' | 'delivery_photo' | 'recipient_signature';

export type ParcelEvidenceState = 'created' | 'active' | 'completed' | 'in_retention' | 'deleted';

export type ParcelEvidence = {
  id: ID;
  parcelId: ID;
  kind: ParcelEvidenceKind;
  state: ParcelEvidenceState;
  capturedBy: ID;
  capturedAt: Timestamp;
  retainedUntil?: Timestamp;
  deletedAt?: Timestamp;
  storageRef?: string;
};

// ================================================================
// RATINGS
// ================================================================

export type RatingContext = { kind: 'delivery' | 'order'; ref: ID };

export type Rating = {
  id: ID;
  targetIdentityId: ID;
  authorIdentityId: ID;
  context: RatingContext;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: Timestamp;
};

// ================================================================
// SUPPORT
// ================================================================

export type SupportContext = {
  orderId?: ID;
  deliveryId?: ID;
  paymentId?: ID;
  merchantId?: ID;
  deliveryPartnerId?: ID;
};

export type SupportTicketState = 'open' | 'waiting' | 'resolved' | 'closed';

export type SupportPriority = 'low' | 'normal' | 'high';

export type SupportMessage = {
  id: ID;
  author: { kind: 'customer' | 'merchant' | 'delivery_partner' | 'support_agent'; ref: ID };
  body: string;
  sentAt: Timestamp;
};

export type SupportTicket = {
  id: ID;
  customerIdentityId: ID;
  context: SupportContext;
  subject: string;
  state: SupportTicketState;
  priority?: SupportPriority;
  messages: SupportMessage[];
};

// ================================================================
// NOTIFICATIONS
// ================================================================

export type NotificationSource = 'order' | 'delivery' | 'payment' | 'security' | 'support';

export type NotificationChannel = 'push' | 'in_app' | 'sms' | 'email';

export type Notification = {
  id: ID;
  identityId: ID;
  source: NotificationSource;
  channel: NotificationChannel;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: Timestamp;
};

// ================================================================
// VERIFICATION DOCUMENTS
// ================================================================

export type DocumentKind = 'national_id' | 'driving_license' | 'business_registration' | 'tax_clearance';

export type DocumentState = 'pending' | 'verified' | 'rejected' | 'expired';

export type Document = {
  id: ID;
  ownerIdentityId: ID;
  kind: DocumentKind;
  state: DocumentState;
  uploadedAt: Timestamp;
  verifiedAt?: Timestamp;
  storageRef?: string;
};