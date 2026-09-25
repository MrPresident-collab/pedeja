import React from 'react';
import { Home, ShoppingBag, Package, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function BottomNav() {
  const { activeTab, setActiveTab, setProfileSubView, orders, userProfile, currentUser, selectedRestaurant } = useApp();
  if (selectedRestaurant) return null;

  const liveStatuses = ['pending', 'accepted', 'preparing', 'ready_to_pickup', 'rider_accepted', 'picking_up', 'delivering', 'delivered'];
  const orderBadge = orders.filter(order =>
    order.type !== 'parcel' && liveStatuses.includes(order.status) &&
    (order.customerId === userProfile.id || order.customerId === currentUser?.id),
  ).length;
  const packageBadge = orders.filter(order =>
    order.type === 'parcel' && liveStatuses.includes(order.status) &&
    (order.customerId === userProfile.id || order.customerId === currentUser?.id),
  ).length;

  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'orders', icon: ShoppingBag, label: 'Pedidos', badge: orderBadge },
    { id: 'packages', icon: Package, label: 'Pacotes', badge: packageBadge },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-700 flex justify-around z-40 bottom-nav-bar shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {tabs.map(({ id, icon, label, badge }) => (
        <button key={id} onClick={() => { setActiveTab(id); setProfileSubView('main'); }} className={`bottom-nav-item ${activeTab === id ? 'active' : 'text-gray-400 dark:text-gray-400'}`}>
          <div className="relative">
            {React.createElement(icon, { size: 22, strokeWidth: activeTab === id ? 2.5 : 1.8 })}
            {badge > 0 && <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">{badge > 9 ? '9+' : badge}</span>}
          </div>
          <span className={`text-[10px] font-${activeTab === id ? 'bold' : 'medium'} mt-0.5`}>{label}</span>
          <div className="nav-dot" />
        </button>
      ))}
    </div>
  );
}
