// ===== App Constants =====

export const INITIAL_CONFIG = {
  appRadius: 15,          // km
  restaurantRadius: 10,   // km
  riderRadius: 5,         // km
  baseFee: 20,            // AOA
  perKmFee: 10,           // AOA/km
  rideBaseFee: 20,        // AOA (viagem)
  ridePerKmFee: 10,       // AOA/km (viagem)
  gpFood: 30,             // % GP comerciante (entrega de comida)
  gpDelivery: 15,         // % GP estafeta (entrega de encomendas)
  gpRide: 15,             // % GP viagem
  gpService: 15,          // % GP serviço
  // Extra Service options for Service Category
  extraServices: [
    { name: "Limpeza doméstica", price: 350 },
    { name: "Limpeza e reparação de ar condicionado", price: 500 },
    { name: "Reparação de canalização e electricidade", price: 400 },
    { name: "Transporte de bens", price: 600 }
  ],
  // Admin Payment Info
  adminBankName: "",
  adminBankAccount: "",
  adminAccountName: "",
  adminQrCode: "",
  adminPromptPayId: ""
};

export const USER_LOCATION = { lat: -8.8383, lng: 13.2344 };

export const DEFAULT_CATEGORIES = [
  "Refeições", 

  "Massas e arroz",
  "Bebidas",
  "Sobremesas",
  "Cozinha internacional",
  "Fast food",
  "Comida local",
  "Petiscos"
];

export const MENU_TAGS = [
  "Recomendado",
  "Mais vendido",
  "Picante",
  "Vegetariano",
  "Promoção"
];

export const INITIAL_RESTAURANTS = [];
export const INITIAL_RIDERS = [];
export const INITIAL_MENU_ITEMS = {};

export const STATUS_LABELS = {
  pending: { label: "A aguardar confirmação do comerciante", color: "text-orange-500", bg: "bg-orange-100" },
  preparing: { label: "A preparar", color: "text-blue-500", bg: "bg-blue-100" },
  ready_to_pickup: { label: "A aguardar estafeta", color: "text-purple-500", bg: "bg-purple-100" },
  rider_accepted: { label: "Estafeta a caminho da recolha", color: "text-indigo-500", bg: "bg-indigo-100" },
  picking_up: { label: "Estafeta no ponto de recolha", color: "text-purple-600", bg: "bg-purple-100" },
  delivering: { label: "A caminho do cliente", color: "text-blue-600", bg: "bg-blue-100" },
  delivered: { label: "Chegou ao destino — aguarda confirmação", color: "text-teal-600", bg: "bg-teal-100" },
  completed: { label: "Concluído ✓", color: "text-emerald-700", bg: "bg-emerald-100" },
  cancelled: { label: "Cancelado", color: "text-red-500", bg: "bg-red-100" },
};

// ===== Admin Config =====
export const ADMIN_EMAIL = import.meta?.env?.VITE_ADMIN_EMAIL || '';

