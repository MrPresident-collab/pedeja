import React, { useMemo, useState } from 'react';
import RiderView from './RiderView';
import { AppContext } from '../context/AppContext';

const demoUserId = 'preview-estafeta-user';

const previewSupabase = {
  channel() {
    return {
      on() { return this; },
      subscribe() { return this; },
      unsubscribe() {},
    };
  },
  removeChannel() {},
  rpc() {
    return Promise.resolve({ data: { ok: true }, error: null });
  },
  from() {
    const chain = {
      update() { return chain; },
      insert() { return chain; },
      upsert() { return chain; },
      delete() { return chain; },
      select() { return chain; },
      eq() { return chain; },
      maybeSingle() { return Promise.resolve({ data: null, error: null }); },
      single() { return Promise.resolve({ data: null, error: null }); },
      then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
    };
    return chain;
  },
};

export default function RiderPreviewView() {
  const [riderTab, setRiderTab] = useState('jobs');
  const [orders, setOrders] = useState([
    {
      id: 'preview-order-001',
      status: 'ready_to_pickup',
      type: 'food',
      restaurantName: 'Cantinho da Vila',
      grandTotal: 4850,
      deliveryFee: 500,
      paymentMethod: 'cash',
      customerId: 'preview-customer',
      pickupLocation: { lat: -8.8383, lng: 13.2344 },
      address: 'Rua Comandante Valódia, Bairro Maianga',
    },
    {
      id: 'preview-order-002',
      status: 'delivering',
      type: 'parcel',
      restaurantName: '',
      grandTotal: 3200,
      deliveryFee: 800,
      paymentMethod: 'multicaixa',
      customerId: 'preview-customer-2',
      riderId: 'preview-rider-001',
      pickup: 'Rua Amílcar Cabral, Ingombota',
      dropoff: 'Bairro Alvalade, Luanda',
      pickupLocation: { lat: -8.8121, lng: 13.2312 },
    },
  ]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [riders, setRiders] = useState([{
    id: 'preview-rider-001',
    userId: demoUserId,
    status: 'active',
    is_available: true,
    availabilityStatus: 'AVAILABLE',
    location: { lat: -8.8383, lng: 13.2344 },
  }]);

  const value = useMemo(() => {
    const noop = () => {};
    return {
      isDarkMode,
      toggleDarkMode: () => setIsDarkMode(v => !v),
      activeRole: 'rider',
      setActiveRole: noop,
      riderTab,
      setRiderTab,
      orders,
      setOrders,
      riders,
      setRiders,
      restaurants: [],
      appConfig: { riderRadius: 5, riderFee: 500, deliveryFee: 500 },
      userProfile: { id: demoUserId, name: 'Estafeta de demonstração', phone: '900 000 000', email: 'preview@pedeja.local' },
      currentUser: { id: demoUserId, email: 'preview@pedeja.local' },
      acceptOrder: noop,
      updateOrderStatus: noop,
      requestCancelByRole: noop,
      hasPendingCancelRequest: () => false,
      openChatWindow: noop,
      setProfileSubView: noop,
      setActiveTab: noop,
      updateRiderWorkingLocation: noop,
      userWallet: 12500,
      walletHistory: [],
      pendingRequests: [],
      requestTopUp: noop,
      requestWithdraw: noop,
      isDataLoading: false,
      supabase: previewSupabase,
      notifySystem: noop,
    };
  }, [isDarkMode, orders, riders, riderTab]);

  return (
    <AppContext.Provider value={value}>
      <div className="relative">
        <div className="fixed top-2 left-2 z-[10000] rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-black text-black shadow-lg">
          ESTAFETA — PRÉ-VISUALIZAÇÃO
        </div>
        <RiderView />
      </div>
    </AppContext.Provider>
  );
}
