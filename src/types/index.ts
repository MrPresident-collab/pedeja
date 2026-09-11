import type { Category, GeoPoint, ID, PaymentMethod, VehicleType } from './common';
import type { ParcelOrder } from './parcel';
export * from './common';
export * from './parcel';

export type OrderStatus =
  | 'novo'
  | 'aceite'
  | 'preparando'
  | 'pronto'
  | 'recolhido'
  | 'entregue'
  | 'cancelado';

export type OrderKind = 'marketplace' | 'parcel';

export type OrderEvent = {
  status: OrderStatus;
  label: string;
  timestamp: string;
  done: boolean;
};

export type Business = {
  id: ID;
  name: string;
  type: string;
  category: Category;
  rating: number;
  deliveryMin: number;
  deliveryMax: number;
  priceFrom: number;
  priceLabel: string;
  tone: 'purple' | 'cream' | 'blue' | 'green';
  icon: 'utensils' | 'store' | 'shopping-bag' | 'send';
  promo?: boolean;
  open: boolean;
};

export type Product = {
  id: ID;
  name: string;
  description: string;
  price: number;
  prepTime: number;
  available: boolean;
  category: string;
};

export type CartLine = {
  productId: ID;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type Order = {
  id: ID;
  kind?: OrderKind;
  merchant: string;
  type: string;
  date: string;
  createdAt?: string;
  total: number;
  status: OrderStatus;
  items: number;
  distance: string;
  duration: string;
  icon: 'utensils' | 'store' | 'shopping-bag' | 'send';
  active: boolean;
  timeline?: OrderEvent[];
  lines?: CartLine[];
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  tip?: number;
  rider?: string;
  riderPhone?: string;
  merchantPhone?: string;
  paymentMethod?: PaymentMethod;
  deliveryTo?: string;
  deliveryAddressId?: ID;
  parcel?: ParcelOrder;
};

export type Address = {
  id: ID;
  label: string;
  line: string;
  current?: boolean;
  coordinates?: GeoPoint;
  province?: string;
  municipality?: string;
  neighborhood?: string;
  landmark?: string;
  deliveryInstructions?: string;
};

export type Vehicle = {
  type: VehicleType;
  name: string;
  icon: 'bike' | 'car' | 'truck';
  eta: string;
  price: number;
  recommended?: boolean;
};

export type DeliveryInstruction = {
  id: string;
  label: string;
  description: string;
};

export type Profile = {
  name: string;
  phone: string;
  email: string;
  memberSince: string;
  initials: string;
};