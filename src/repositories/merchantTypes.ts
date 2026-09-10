export type MerchantOrderStatus = 'novo' | 'em_preparacao' | 'pronto' | 'em_entrega' | 'concluido' | 'cancelado';

export type MerchantOrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type MerchantOrder = {
  id: string;
  customer: string;
  customerPhone: string;
  items: MerchantOrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tip: number;
  total: number;
  status: MerchantOrderStatus;
  paymentMethod: 'cash' | 'multicaixa';
  createdAt: string;
  preparationTime?: number;
  assignedRider?: string;
  instructions?: string;
  timeline: { status: string; label: string; time: string; done: boolean }[];
};

export type MerchantProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  prepTime: number;
  available: boolean;
  description?: string;
};

export type MerchantCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type MerchantReport = {
  totalOrders: number;
  totalRevenue: number;
  avgPrepTime: number;
  targetPrepTime: number;
  lateOrders: number;
  topProducts: { name: string; orders: number; revenue: number }[];
  revenueByDay: { label: string; amount: number }[];
};

export type MerchantSettings = {
  businessName: string;
  address: string;
  phone: string;
  nif: string;
  open: boolean;
  ordersPaused: boolean;
  basePrepTime: number;
  soundEnabled: boolean;
  notificationEnabled: boolean;
  riderInstructions: string;
};

export type MerchantProfile = {
  name: string;
  phone: string;
  initials: string;
  businessName: string;
  businessType: string;
  joinedDate: string;
};

export interface MerchantRepository {
  getProfile(): MerchantProfile;
  getSettings(): MerchantSettings;
  updateSettings(partial: Partial<MerchantSettings>): void;
  isOpen(): boolean;
  setOpen(value: boolean): void;
  listOrders(): MerchantOrder[];
  getOrder(id: string): MerchantOrder | null;
  updateOrderStatus(id: string, status: MerchantOrderStatus): void;
  listProducts(): MerchantProduct[];
  listCategories(): MerchantCategory[];
  addProduct(product: Omit<MerchantProduct, 'id'>): MerchantProduct;
  updateProduct(id: string, partial: Partial<MerchantProduct>): void;
  toggleProductAvailability(id: string): void;
  setProductAvailability(id: string, available: boolean): void;
  getReport(): MerchantReport;
  isOrdersPaused(): boolean;
  setOrdersPaused(value: boolean): void;
  pauseOrders(): void;
  resumeOrders(): void;
  signOut(): void;
}
