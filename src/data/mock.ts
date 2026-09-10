import type {
  Address,
  Business,
  DeliveryInstruction,
  Order,
  Product,
  Profile,
  Vehicle,
} from '@/types';
import type { Identity, PaymentMethod } from '@/types/domain';

export const mockProfile: Profile = {
  name: 'Amélia Manuel',
  phone: '+244 923 456 789',
  email: 'amelia.manuel@email.ao',
  memberSince: 'Setembro 2026',
  initials: 'AM',
};

export const mockIdentity: Identity = {
  id: 'id-amelia',
  status: 'active',
  capabilities: [
    { capability: 'customer', approval: 'approved', approvedAt: '2026-09-01T00:00:00Z' },
    { capability: 'delivery_partner', approval: 'pending' },
  ],
  internal: null,
};

export const mockAddresses: Address[] = [
  {
    id: 'a1',
    label: 'Casa',
    line: 'Talatona, Luanda',
    current: true,
    coordinates: { latitude: -8.9692, longitude: 13.1819 },
    province: 'Luanda',
    municipality: 'Belas',
    neighborhood: 'Talatona',
    deliveryInstructions: 'Casa perto do mercado, portão branco.',
  },
  {
    id: 'a2',
    label: 'Trabalho',
    line: 'Marginal, Luanda',
    coordinates: { latitude: -8.8137, longitude: 13.2283 },
    province: 'Luanda',
    municipality: 'Luanda',
    neighborhood: 'Ingombota',
  },
];

export const mockBusinesses: Business[] = [
  { id: 'b1', name: 'Cantinho da Belita', type: 'Comida angolana', category: 'comida', rating: 4.8, deliveryMin: 25, deliveryMax: 35, priceFrom: 3500, priceLabel: 'A partir de 3.500 Kz', tone: 'purple', icon: 'utensils', promo: true, open: true },
  { id: 'b2', name: 'Sabores da Vila', type: 'Comida caseira', category: 'comida', rating: 4.6, deliveryMin: 20, deliveryMax: 30, priceFrom: 2500, priceLabel: 'A partir de 2.500 Kz', tone: 'purple', icon: 'utensils', open: true },
  { id: 'b3', name: 'Meu Super', type: 'Compras do dia a dia', category: 'compras', rating: 4.6, deliveryMin: 20, deliveryMax: 30, priceFrom: 700, priceLabel: 'Entrega desde 700 Kz', tone: 'cream', icon: 'store', open: true },
  { id: 'b4', name: 'Farmácia Vitalidade', type: 'Farmácia', category: 'compras', rating: 4.7, deliveryMin: 15, deliveryMax: 25, priceFrom: 500, priceLabel: 'Entrega desde 500 Kz', tone: 'green', icon: 'shopping-bag', open: true },
  { id: 'b5', name: 'Kero Supermercado', type: 'Supermercado', category: 'lojas', rating: 4.5, deliveryMin: 30, deliveryMax: 45, priceFrom: 1000, priceLabel: 'Entrega desde 1.000 Kz', tone: 'blue', icon: 'store', open: true },
  { id: 'b6', name: 'Game Shopping', type: 'Centro comercial', category: 'lojas', rating: 4.4, deliveryMin: 35, deliveryMax: 50, priceFrom: 1200, priceLabel: 'Entrega desde 1.200 Kz', tone: 'blue', icon: 'store', open: false },
];

export const mockOrders: Order[] = [
  {
    id: 'PJD-2048',
    merchant: 'Cantinho da Belita',
    type: 'Comida',
    date: 'Hoje, 12:08',
    total: 6100,
    status: 'preparando',
    items: 2,
    distance: '2.3 km',
    duration: '28 min',
    icon: 'utensils',
    active: true,
    subtotal: 6300,
    deliveryFee: 700,
    discount: 900,
    rider: 'João Marcos',
    riderPhone: '+244 933 000 201',
    merchantPhone: '+244 922 410 350',
    lines: [
      { productId: 'p1', name: 'Calulu com funge', unitPrice: 4500, quantity: 1 },
      { productId: 'p3', name: 'Encharcado', unitPrice: 1800, quantity: 1 },
    ],
    timeline: [
      { status: 'novo', label: 'Pedido confirmado', timestamp: '12:08', done: true },
      { status: 'preparando', label: 'A preparar o teu pedido', timestamp: 'Agora', done: true },
      { status: 'pronto', label: 'A caminho de ti', timestamp: '—', done: false },
      { status: 'entregue', label: 'Entregue', timestamp: '—', done: false },
    ],
  },
  {
    id: 'PJD-2044',
    merchant: 'Aki Tem Tudo',
    type: 'Compras',
    date: 'Ontem, 18:42',
    total: 12800,
    status: 'entregue',
    items: 7,
    distance: '3.1 km',
    duration: '35 min',
    icon: 'shopping-bag',
    active: false,
    subtotal: 11200,
    deliveryFee: 900,
    rider: 'Nelson Kiala',
    riderPhone: '+244 933 000 402',
    lines: [
      { productId: 'c1', name: 'Arroz de primeira', unitPrice: 3200, quantity: 1 },
      { productId: 'c2', name: 'Óleo de palma', unitPrice: 2500, quantity: 1 },
    ],
  },
  {
    id: 'PJD-2031',
    merchant: 'Sabores da Vila',
    type: 'Comida',
    date: '08 Set, 13:10',
    total: 4900,
    status: 'entregue',
    items: 2,
    distance: '1.8 km',
    duration: '22 min',
    icon: 'utensils',
    active: false,
    subtotal: 4200,
    deliveryFee: 700,
    rider: 'Luzia Andrade',
    riderPhone: '+244 935 118 770',
    lines: [
      { productId: 'p4', name: 'Feijoada à moda da casa', unitPrice: 2500, quantity: 1 },
      { productId: 'p8', name: 'Sumo natural de cajú', unitPrice: 1700, quantity: 1 },
    ],
  },
];

export const mockVehicles: Vehicle[] = [
  { type: 'mota', name: 'Mota', icon: 'bike', eta: '~12 min', price: 500, recommended: true },
  { type: 'carro', name: 'Carro', icon: 'car', eta: '~18 min', price: 1200 },
  { type: 'van', name: 'Van', icon: 'truck', eta: '~25 min', price: 2500 },
];

export const mockDeliveryInstructions: DeliveryInstruction[] = [
  { id: 'door', label: 'Deixar à porta', description: 'Deixar a encomenda à porta do destinatário.' },
  { id: 'contact', label: 'Contactar antes', description: 'Ligar ao destinatário antes de entregar.' },
  { id: 'neighbour', label: 'Entregar ao vizinho', description: 'Entregar a encomenda ao vizinho indicado.' },
  { id: 'custom', label: 'Instrução personalizada', description: 'Escrever uma instrução à medida.' },
];

export const mockExploreGroups = [
  {
    title: 'Sobre Pedejá',
    links: ['O que é Pedejá', 'A promessa que se move'],
  },
  {
    title: 'Como funciona',
    links: ['Como pedir', 'Como enviar', 'Acompanhar pedido'],
  },
  {
    title: 'Negócios',
    links: ['Restaurantes', 'Comerciantes', 'Lojas'],
  },
  {
    title: 'Torna-te parte da rede',
    links: ['Tornar-se Estafeta', 'Tornar-se Parceiro', 'Registar negócio'],
  },
  {
    title: 'Suporte',
    links: ['FAQ', 'Ajuda', 'Contactar suporte'],
  },
  {
    title: 'Legal',
    links: ['Política de Privacidade', 'Termos de Uso', 'Responsabilidade', 'Reembolsos'],
  },
];

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Calulu com funge', description: 'Calulu de peixe fresco com funge.', price: 4500, prepTime: 20, available: true, category: 'Pratos' },
  { id: 'p2', name: 'Mufete de corvina', description: 'Corvina grelhada com feijão de óleo de palma.', price: 6000, prepTime: 25, available: true, category: 'Pratos' },
  { id: 'p3', name: 'Encharcado', description: 'Sobremesa tradicional.', price: 1800, prepTime: 5, available: true, category: 'Sobremesas' },
  { id: 'p4', name: 'Feijoada à moda da casa', description: 'Feijoada completa servida com arroz e farinha.', price: 5200, prepTime: 22, available: true, category: 'Pratos' },
  { id: 'p5', name: 'Frango grelhado', description: 'Frango grelhado com mandioca e feijão de óleo de palma.', price: 4700, prepTime: 20, available: true, category: 'Pratos' },
  { id: 'p6', name: 'Funge de bombo', description: 'Funge de bombo para acompanhar.', price: 2500, prepTime: 15, available: true, category: 'Acompanhamentos' },
  { id: 'p7', name: 'Arroz branco', description: 'Arroz branco, porção individual.', price: 1200, prepTime: 10, available: true, category: 'Acompanhamentos' },
  { id: 'p8', name: 'Sumo natural de cajú', description: 'Sumo fresco de cajú, 500 ml.', price: 1500, prepTime: 3, available: true, category: 'Bebidas' },
  { id: 'p9', name: 'Água mineral 1.5L', description: 'Água mineral, engarrafada em Luanda.', price: 700, prepTime: 2, available: true, category: 'Bebidas' },
  { id: 'p10', name: 'Doce de ginguba', description: 'Sobremesa à base de amendoim.', price: 1500, prepTime: 5, available: true, category: 'Sobremesas' },
];

export const mockShopProducts: Product[] = [
  { id: 's1', name: 'Paracetamol 500mg', description: 'Bilster de 20 comprimidos.', price: 1200, prepTime: 2, available: true, category: 'Medicamentos' },
  { id: 's2', name: 'Sumo Manga 1L', description: 'Sumo de manga, embalagem 1 litro.', price: 950, prepTime: 2, available: true, category: 'Mercearia' },
  { id: 's3', name: 'Sabão em pó', description: 'Sabão em pó 1kg.', price: 1800, prepTime: 3, available: true, category: 'Higiene' },
  { id: 's4', name: 'Água 1.5L', description: 'Água mineral 1.5 litros.', price: 500, prepTime: 2, available: true, category: 'Mercearia' },
];

export const mockStoreProducts: Product[] = [
  { id: 'l1', name: 'Arroz de primeira 5kg', description: 'Saco de arroz de 5 kg.', price: 7800, prepTime: 5, available: true, category: 'Mercearia' },
  { id: 'l2', name: 'Feijão manteiga 1kg', description: 'Feijão manteiga, 1 kg.', price: 1500, prepTime: 5, available: true, category: 'Mercearia' },
  { id: 'l3', name: 'Óleo de palma 1L', description: 'Óleo de palma, 1 litro.', price: 2200, prepTime: 5, available: true, category: 'Mercearia' },
  { id: 'l4', name: 'Leite em pó 400g', description: 'Leite em pó integral, 400 g.', price: 2600, prepTime: 5, available: true, category: 'Lacticínios' },
];

export const mockRatings: { orderId: string; score: number; comment?: string; createdAt: string }[] = [
  { orderId: 'PJD-2044', score: 5, comment: 'Tudo chegou rápido e em ordem.', createdAt: '2026-09-09T12:00:00Z' },
];

export const mockPaymentMethods: { id: PaymentMethod; label: string; available: boolean }[] = [
  { id: 'cash', label: 'Dinheiro', available: true },
  { id: 'multicaixa', label: 'Multicaixa', available: true },
  { id: 'future', label: 'Mais métodos em breve', available: false },
];
