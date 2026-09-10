import type {
  MerchantOrder,
  MerchantProduct,
  MerchantCategory,
  MerchantProfile,
  MerchantReport,
  MerchantSettings,
} from '@/repositories/merchantTypes';

export const mockMerchantProfile: MerchantProfile = {
  name: 'Maria José',
  phone: '+244 923 456 789',
  initials: 'MJ',
  businessName: 'Cantinho da Belita',
  businessType: 'Comida angolana',
  joinedDate: 'Julho 2026',
};

export const mockMerchantSettings: MerchantSettings = {
  businessName: 'Cantinho da Belita',
  address: 'Miramar, Luanda',
  open: true,
  basePrepTime: 20,
  soundEnabled: true,
  notificationEnabled: true,
  riderInstructions: 'Recolher no balcao principal. Pedido pronto em cima do balcao.',
};

export const mockMerchantCategories: MerchantCategory[] = [
  { id: 'cat-1', name: 'Pratos', sortOrder: 1 },
  { id: 'cat-2', name: 'Acompanhamentos', sortOrder: 2 },
  { id: 'cat-3', name: 'Bebidas', sortOrder: 3 },
  { id: 'cat-4', name: 'Sobremesas', sortOrder: 4 },
];

export const mockMerchantProducts: MerchantProduct[] = [
  { id: 'mp-1', name: 'Calulu com funge', category: 'Pratos', price: 4500, prepTime: 20, available: true, description: 'Calulu de peixe fresco com funge.' },
  { id: 'mp-2', name: 'Mufete de corvina', category: 'Pratos', price: 6000, prepTime: 25, available: true, description: 'Corvina grelhada com feijao de oleo de palma.' },
  { id: 'mp-3', name: 'Feijoada a moda da casa', category: 'Pratos', price: 5200, prepTime: 22, available: true, description: 'Feijoada completa servida com arroz e farinha.' },
  { id: 'mp-4', name: 'Frango grelhado', category: 'Pratos', price: 4700, prepTime: 20, available: true, description: 'Frango grelhado com mandioca e feijao.' },
  { id: 'mp-5', name: 'Funge de bombo', category: 'Acompanhamentos', price: 2500, prepTime: 15, available: true },
  { id: 'mp-6', name: 'Arroz branco', category: 'Acompanhamentos', price: 1200, prepTime: 10, available: true },
  { id: 'mp-7', name: 'Sumo natural de caju', category: 'Bebidas', price: 1500, prepTime: 3, available: true },
  { id: 'mp-8', name: 'Agua mineral 1.5L', category: 'Bebidas', price: 700, prepTime: 2, available: true },
  { id: 'mp-9', name: 'Encharcado', category: 'Sobremesas', price: 1800, prepTime: 5, available: true },
  { id: 'mp-10', name: 'Doce de ginguba', category: 'Sobremesas', price: 1500, prepTime: 5, available: false },
];

export const mockMerchantOrders: MerchantOrder[] = [
  {
    id: 'PJD-2052', customer: 'Joana S.', customerPhone: '+244 923 111 222',
    items: [
      { name: 'Calulu com funge', quantity: 1, unitPrice: 4500 },
      { name: 'Encharcado', quantity: 1, unitPrice: 1800 },
    ],
    subtotal: 6300, discount: 900, deliveryFee: 700, tip: 0, total: 6100,
    status: 'novo', paymentMethod: 'cash', createdAt: 'Hoje, 12:35', instructions: 'Sem picante, por favor.',
    assignedRider: 'Nelson K.',
    timeline: [
      { status: 'novo', label: 'Pedido recebido', time: '12:35', done: true },
      { status: 'em_preparacao', label: 'Em preparacao', time: '—', done: false },
      { status: 'pronto', label: 'Pronto para recolha', time: '—', done: false },
      { status: 'em_entrega', label: 'Em entrega', time: '—', done: false },
      { status: 'concluido', label: 'Concluido', time: '—', done: false },
    ],
  },
  {
    id: 'PJD-2051', customer: 'Antonio P.', customerPhone: '+244 923 333 444',
    items: [
      { name: 'Mufete de corvina', quantity: 2, unitPrice: 6000 },
      { name: 'Arroz branco', quantity: 2, unitPrice: 1200 },
      { name: 'Sumo natural de caju', quantity: 2, unitPrice: 1500 },
    ],
    subtotal: 17400, discount: 0, deliveryFee: 700, tip: 200, total: 18300,
    status: 'em_preparacao', paymentMethod: 'multicaixa', createdAt: 'Hoje, 12:18',
    assignedRider: 'Joao M.',
    timeline: [
      { status: 'novo', label: 'Pedido recebido', time: '12:18', done: true },
      { status: 'em_preparacao', label: 'Em preparacao', time: '12:20', done: true },
      { status: 'pronto', label: 'Pronto para recolha', time: '—', done: false },
      { status: 'em_entrega', label: 'Em entrega', time: '—', done: false },
      { status: 'concluido', label: 'Concluido', time: '—', done: false },
    ],
  },
  {
    id: 'PJD-2049', customer: 'Rosa M.', customerPhone: '+244 923 555 666',
    items: [
      { name: 'Feijoada a moda da casa', quantity: 1, unitPrice: 5200 },
      { name: 'Funge de bombo', quantity: 1, unitPrice: 2500 },
    ],
    subtotal: 7700, discount: 0, deliveryFee: 700, tip: 0, total: 8400,
    status: 'pronto', paymentMethod: 'cash', createdAt: 'Hoje, 11:55',
    assignedRider: 'Luzia A.',
    timeline: [
      { status: 'novo', label: 'Pedido recebido', time: '11:55', done: true },
      { status: 'em_preparacao', label: 'Em preparacao', time: '11:56', done: true },
      { status: 'pronto', label: 'Pronto para recolha', time: '12:15', done: true },
      { status: 'em_entrega', label: 'Em entrega', time: '—', done: false },
      { status: 'concluido', label: 'Concluido', time: '—', done: false },
    ],
  },
  {
    id: 'PJD-2047', customer: 'Carlos F.', customerPhone: '+244 923 777 888',
    items: [
      { name: 'Frango grelhado', quantity: 1, unitPrice: 4700 },
    ],
    subtotal: 4700, discount: 0, deliveryFee: 700, tip: 100, total: 5500,
    status: 'em_entrega', paymentMethod: 'multicaixa', createdAt: 'Hoje, 11:30',
    assignedRider: 'Nelson K.',
    timeline: [
      { status: 'novo', label: 'Pedido recebido', time: '11:30', done: true },
      { status: 'em_preparacao', label: 'Em preparacao', time: '11:31', done: true },
      { status: 'pronto', label: 'Pronto para recolha', time: '11:50', done: true },
      { status: 'em_entrega', label: 'Em entrega', time: '11:52', done: true },
      { status: 'concluido', label: 'Concluido', time: '—', done: false },
    ],
  },
  {
    id: 'PJD-2045', customer: 'Teresa L.', customerPhone: '+244 923 999 000',
    items: [
      { name: 'Calulu com funge', quantity: 2, unitPrice: 4500 },
      { name: 'Agua mineral 1.5L', quantity: 2, unitPrice: 700 },
    ],
    subtotal: 10400, discount: 1040, deliveryFee: 700, tip: 0, total: 10060,
    status: 'concluido', paymentMethod: 'cash', createdAt: 'Hoje, 10:45',
    assignedRider: 'Joao M.',
    timeline: [
      { status: 'novo', label: 'Pedido recebido', time: '10:45', done: true },
      { status: 'em_preparacao', label: 'Em preparacao', time: '10:46', done: true },
      { status: 'pronto', label: 'Pronto para recolha', time: '11:05', done: true },
      { status: 'em_entrega', label: 'Em entrega', time: '11:08', done: true },
      { status: 'concluido', label: 'Concluido', time: '11:25', done: true },
    ],
  },
  {
    id: 'PJD-2043', customer: 'Paulo D.', customerPhone: '+244 923 222 333',
    items: [
      { name: 'Mufete de corvina', quantity: 1, unitPrice: 6000 },
      { name: 'Encharcado', quantity: 1, unitPrice: 1800 },
    ],
    subtotal: 7800, discount: 0, deliveryFee: 700, tip: 500, total: 9000,
    status: 'concluido', paymentMethod: 'multicaixa', createdAt: 'Hoje, 10:10',
    assignedRider: 'Luzia A.',
    timeline: [
      { status: 'novo', label: 'Pedido recebido', time: '10:10', done: true },
      { status: 'em_preparacao', label: 'Em preparacao', time: '10:11', done: true },
      { status: 'pronto', label: 'Pronto para recolha', time: '10:30', done: true },
      { status: 'em_entrega', label: 'Em entrega', time: '10:33', done: true },
      { status: 'concluido', label: 'Concluido', time: '10:50', done: true },
    ],
  },
];

export const mockMerchantReport: MerchantReport = {
  totalOrders: 6,
  totalRevenue: 57360,
  avgPrepTime: 19,
  targetPrepTime: 20,
  lateOrders: 1,
  topProducts: [
    { name: 'Calulu com funge', orders: 3, revenue: 13500 },
    { name: 'Mufete de corvina', orders: 3, revenue: 18000 },
    { name: 'Feijoada a moda da casa', orders: 1, revenue: 5200 },
    { name: 'Encharcado', orders: 2, revenue: 3600 },
  ],
  revenueByDay: [
    { label: 'Seg', amount: 42000 },
    { label: 'Ter', amount: 38500 },
    { label: 'Qua', amount: 51200 },
    { label: 'Qui', amount: 44800 },
    { label: 'Sex', amount: 62300 },
    { label: 'Sab', amount: 71000 },
    { label: 'Dom', amount: 57360 },
  ],
};
