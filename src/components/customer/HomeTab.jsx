import React, { useMemo, useState } from 'react';
import {
  Utensils,
  ShoppingBag,
  Package,
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  Navigation,
  Plus,
  Minus,
  X,
  Banknote,
  Crosshair,
  CheckCircle,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getDistanceFromLatLonInKm, isValidCoordinate } from '../../utils';
import { DEFAULT_CATEGORIES, PEDEJA_SERVICE_TYPES } from '../../constants';
import { filterPedejaMarketplaceBusinesses } from '../../domain/pedejaMarketplace';
import RestaurantCard from '../RestaurantCard';
import InteractiveMap from '../InteractiveMap';

const SERVICE_OPTIONS = [
  { id: PEDEJA_SERVICE_TYPES.FOME, label: 'Fome', description: 'Comida e restaurantes', icon: Utensils },
  { id: PEDEJA_SERVICE_TYPES.COMPRAS, label: 'Compras', description: 'Lojas, mercados e compras', icon: ShoppingBag },
  { id: PEDEJA_SERVICE_TYPES.ENVIAR, label: 'Enviar', description: 'Entregas e encomendas', icon: Package },
];

export default function HomeTab() {
  const {
    serviceType, setServiceType,
    restaurants, menuItems, appConfig, orders,
    userProfile, userAddresses,
    cart, setCart,
    parcelDetails, setParcelDetails,
    setPaymentMethod,
    parcelMapTarget, setParcelMapTarget,
    parcelDistance, parcelEstimate,
    placeOrder, placeParcelOrder,
    addToCart, calculateFoodTotal, calculateDeliveryFee,
    handleParcelMapSelect, getCurrentLocationForParcel,
    notifySystem, selectedRestaurant, setSelectedRestaurant, setActiveTab,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  const businessesWithDistance = useMemo(() => restaurants.map(business => ({
    ...business,
    distance: isValidCoordinate(userProfile?.location) && isValidCoordinate(business.location)
      ? Number(getDistanceFromLatLonInKm(
          userProfile.location.lat, userProfile.location.lng,
          business.location.lat, business.location.lng,
        ).toFixed(1))
      : null,
  })), [restaurants, userProfile?.location]);

  const visibleBusinesses = useMemo(() => {
    let list = filterPedejaMarketplaceBusinesses(businessesWithDistance, serviceType)
      .filter(business => business.status === 'open');

    if (serviceType === PEDEJA_SERVICE_TYPES.FOME && selectedCategory !== 'Todos') {
      list = list.filter(business => business.category === selectedCategory);
    }

    return list;
  }, [businessesWithDistance, serviceType, selectedCategory]);

  const categories = useMemo(() => {
    if (serviceType !== PEDEJA_SERVICE_TYPES.FOME) return ['Todos'];
    const shopCategories = restaurants.filter(b => b.category).map(b => b.category);
    return ['Todos', ...new Set([...DEFAULT_CATEGORIES, ...shopCategories])];
  }, [restaurants, serviceType]);

  const activeOrders = useMemo(() => (orders || []).filter(order =>
    order.customerId === userProfile?.id &&
    ['pending', 'accepted', 'preparing', 'ready_to_pickup', 'rider_accepted', 'picking_up', 'delivering', 'delivered'].includes(order.status)
  ), [orders, userProfile?.id]);

  const activeDelivery = useMemo(() =>
    activeOrders.find(order => ['rider_accepted', 'picking_up', 'delivering', 'delivered'].includes(order.status)) || activeOrders[0] || null,
    [activeOrders],
  );

  const activeDeliveryDistance = useMemo(() => {
    if (!activeDelivery?.riderLocation) return null;
    const destination = activeDelivery.status === 'picking_up'
      ? activeDelivery.pickupLocation
      : activeDelivery.location;
    if (!destination) return null;
    const km = getDistanceFromLatLonInKm(
      activeDelivery.riderLocation.lat,
      activeDelivery.riderLocation.lng,
      destination.lat,
      destination.lng,
    );
    return Number(km.toFixed(1));
  }, [activeDelivery]);

  const handleOpenItem = (item) => {
    if (item.options?.length) {
      setSelectedMenuItem(item);
      setSelectedOptions([]);
      return;
    }
    addToCart(item, selectedRestaurant.id, selectedRestaurant.name, selectedRestaurant.distance ?? 0);
  };

  const handleConfirmAdd = () => {
    if (!selectedMenuItem || !selectedRestaurant) return;
    const extraPrice = selectedOptions.reduce((sum, option) => sum + Number(option.price || 0), 0);
    addToCart(
      selectedMenuItem,
      selectedRestaurant.id,
      selectedRestaurant.name,
      selectedRestaurant.distance ?? 0,
      selectedOptions,
      extraPrice,
    );
    setSelectedMenuItem(null);
    setSelectedOptions([]);
  };

  const handleCartQty = (itemId, delta) => {
    setCart(previous => previous
      .map(item => item.id === itemId ? { ...item, qty: item.qty + delta } : item)
      .filter(item => item.qty > 0));
  };

  const usePrimaryAddress = () => {
    if (!primaryAddress) {
      notifySystem('Morada necessária', 'Adicione primeiro uma morada no seu perfil.', 'error');
      return;
    }

    setParcelDetails(previous => ({
      ...previous,
      dropoff: [
        primaryAddress.addressLine1,
        primaryAddress.addressLine2,
        primaryAddress.neighborhood,
        primaryAddress.municipality,
        primaryAddress.city,
        primaryAddress.province,
      ].filter(Boolean).join(', '),
      dropoffLocation: isValidCoordinate(primaryAddress.location) ? primaryAddress.location : null,
    }));
  };

  const handleUseCurrentLocation = async (target) => {
    setParcelMapTarget(target);
    await getCurrentLocationForParcel(target);
  };

  const handleParcelSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await placeParcelOrder();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedRestaurant) {
    const items = menuItems[selectedRestaurant.id] || [];

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in">
        <div className="relative h-52">
          <img src={selectedRestaurant.image} className="w-full h-full object-cover bg-gray-200" alt={selectedRestaurant.name} loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          <button onClick={() => setSelectedRestaurant(null)} className="absolute top-4 left-4 bg-white/95 p-2 rounded-full shadow-lg" aria-label="Voltar">
            <ArrowLeft size={20} className="text-gray-800" />
          </button>
          <div className="absolute bottom-3 right-3 bg-white/95 px-3 py-1 rounded-full flex items-center gap-1 shadow">
            <Star size={13} className="text-yellow-500 fill-current" />
            <span className="text-sm font-bold">{selectedRestaurant.rating}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{selectedRestaurant.name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1"><Clock size={13} /> {selectedRestaurant.time}</span>
            {selectedRestaurant.distance != null && <><span>•</span><span>{selectedRestaurant.distance} km</span></>}
          </div>
        </div>

        <div className="px-4 pt-4 pb-40">
          <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-3">Produtos</h2>
          <div className="space-y-3">
            {items.length ? items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                {item.image && <img src={item.image} className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-gray-100" alt={item.name} loading="lazy" />}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</h3>
                  {item.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{item.description}</p>}
                  <p className="font-bold text-gray-900 dark:text-white mt-1.5">Kz {Number(item.price || 0).toLocaleString()}</p>
                </div>
                <button disabled={item.available === false} onClick={() => handleOpenItem(item)} className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center disabled:opacity-40" aria-label={`Adicionar ${item.name}`}>
                  <Plus size={18} />
                </button>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-400"><Package size={40} className="mx-auto mb-2 opacity-30" /><p>Ainda não existem produtos disponíveis.</p></div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] px-4 pt-3 pb-safe rounded-t-3xl z-50">
            <div className="max-h-28 overflow-y-auto mb-3 space-y-1.5">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCartQty(item.id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><Minus size={14} /></button>
                    <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                    <button onClick={() => handleCartQty(item.id, 1)} className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <label htmlFor="cart-order-notes" className="sr-only">Observação para o comerciante</label>
            <textarea id="cart-order-notes" name="orderNotes" value={orderNotes} onChange={event => setOrderNotes(event.target.value)} placeholder="Observação para o comerciante" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none h-14 mb-2 bg-white dark:bg-gray-700" maxLength={200} />
            <div className="flex justify-between text-sm text-gray-500 mb-1"><span>Subtotal</span><span>Kz {calculateFoodTotal().toLocaleString()}</span></div>
            <div className="flex justify-between text-sm text-gray-500 mb-2"><span>Entrega</span><span>Kz {calculateDeliveryFee(cart[0].distance || 0).toLocaleString()}</span></div>
            <div className="flex justify-between font-black text-lg mb-2"><span>Estimativa</span><span className="text-orange-600">Kz {(calculateFoodTotal() + calculateDeliveryFee(cart[0].distance || 0)).toLocaleString()}</span></div>
            <p className="text-[11px] text-gray-400 mb-3">O total final é calculado pelo servidor no checkout.</p>
            <div className="flex items-center gap-2 mb-3"><span className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Banknote size={13} /> Pagamento</span><button onClick={() => setPaymentMethod('cash')} className="flex-1 py-2 text-sm rounded-xl border bg-blue-500 text-white border-blue-500 font-bold">Numerário</button></div>
            <button onClick={() => placeOrder(0, orderNotes)} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-md">Confirmar pedido</button>
          </div>
        )}

        {selectedMenuItem && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4"><div><h3 className="font-black text-lg">{selectedMenuItem.name}</h3><p className="text-sm text-gray-500">Escolha as opções</p></div><button onClick={() => setSelectedMenuItem(null)} aria-label="Fechar"><X /></button></div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(selectedMenuItem.options || []).map(option => {
                  const selected = selectedOptions.some(item => item.name === option.name);
                  return (
                    <button key={option.name} onClick={() => setSelectedOptions(previous => selected ? previous.filter(item => item.name !== option.name) : [...previous, option])} className={`w-full flex items-center justify-between p-3 rounded-xl border ${selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                      <span>{option.name}</span><span className="font-bold">+Kz {Number(option.price || 0).toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleConfirmAdd} className="w-full mt-4 bg-orange-500 text-white py-3 rounded-xl font-bold">Adicionar ao pedido</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (serviceType === PEDEJA_SERVICE_TYPES.ENVIAR) {
    const hasPickup = isValidCoordinate(parcelDetails?.pickupLocation);
    const hasDropoff = isValidCoordinate(parcelDetails?.dropoffLocation);

    return (
      <div className="p-4 pb-28">
        <ServiceSwitcher serviceType={serviceType} setServiceType={setServiceType} />
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Package size={22} /></div>
            <div><h2 className="font-black text-lg">Enviar uma encomenda</h2><p className="text-sm text-gray-500">Use uma morada normal. Coordenadas nunca são digitadas pelo cliente.</p></div>
          </div>

          <AddressPoint title="Ponto de recolha" value={parcelDetails.pickup || ''} onChange={value => setParcelDetails(previous => ({ ...previous, pickup: value, pickupLocation: null }))} placeholder="Rua, bairro, referência..." location={parcelDetails.pickupLocation} active={parcelMapTarget === 'pickup'} onActivate={() => setParcelMapTarget('pickup')} onUseCurrent={() => handleUseCurrentLocation('pickup')} />
          <AddressPoint title="Ponto de entrega" value={parcelDetails.dropoff || ''} onChange={value => setParcelDetails(previous => ({ ...previous, dropoff: value, dropoffLocation: null }))} placeholder="Rua, bairro, referência..." location={parcelDetails.dropoffLocation} active={parcelMapTarget === 'dropoff'} onActivate={() => setParcelMapTarget('dropoff')} onUseCurrent={() => handleUseCurrentLocation('dropoff')} />

          <div className="flex gap-2 mb-4">
            <button type="button" onClick={usePrimaryAddress} disabled={!primaryAddress} className="flex-1 text-xs font-bold py-2 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-40">Usar minha morada</button>
            <button type="button" onClick={() => setParcelMapTarget(parcelMapTarget === 'pickup' ? 'dropoff' : 'pickup')} className="flex-1 text-xs font-bold py-2 rounded-xl bg-gray-100 text-gray-700">Ajustar localização</button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-gray-100">
            <InteractiveMap mode="select" isParcel activeParcelTarget={parcelMapTarget || 'pickup'} shopLocation={parcelDetails.pickupLocation} userLocation={parcelDetails.dropoffLocation} centerOverride={parcelMapTarget === 'dropoff' ? parcelDetails.dropoffLocation || undefined : parcelDetails.pickupLocation || undefined} onLocationSelect={handleParcelMapSelect} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">O mapa/GPS ajuda o sistema a obter a localização. A morada humana continua a ser a referência operacional.</p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Field label="Peso (kg)" value={parcelDetails.weight || '1'} onChange={value => setParcelDetails(previous => ({ ...previous, weight: value }))} type="number" />
            <Field label="Telefone do destinatário" value={parcelDetails.receiverPhone || ''} onChange={value => setParcelDetails(previous => ({ ...previous, receiverPhone: value }))} type="tel" placeholder="9xx xxx xxx" />
          </div>
          <div className="mt-3"><Field label="Nome do destinatário" value={parcelDetails.receiverName || ''} onChange={value => setParcelDetails(previous => ({ ...previous, receiverName: value }))} placeholder="Nome completo" /></div>

          {parcelDistance > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center mt-4">
              <p className="text-sm font-bold text-blue-800">{parcelDistance.toFixed(1)} km · Estimativa Kz {Number(parcelEstimate || 0).toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-0.5">O preço final será confirmado pelo servidor.</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 p-2 bg-gray-50 rounded-xl"><Banknote size={16} className="text-gray-500" /><span className="text-sm font-bold">Pagamento</span><button onClick={() => setPaymentMethod('cash')} className="flex-1 py-2 text-xs rounded-lg bg-blue-500 text-white font-bold">Numerário</button></div>

          {!hasPickup || !hasDropoff ? (
            <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">Confirme a localização de recolha e entrega no mapa ou através da localização actual.</div>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl p-3"><CheckCircle size={14} /> Localização confirmada</div>
          )}

          <button onClick={handleParcelSubmit} disabled={isSubmitting || !parcelDetails.pickup || !parcelDetails.dropoff || !hasPickup || !hasDropoff} className="w-full mt-4 bg-red-500 text-white py-3.5 rounded-xl font-black disabled:opacity-40">{isSubmitting ? 'A preparar...' : 'Calcular e enviar'}</button>
        </div>
      </div>
    );
  }

  const firstName = (userProfile?.name || 'Utilizador').trim().split(/\\s+/)[0];
  const addressLabel = primaryAddress
    ? [primaryAddress.addressLine1, primaryAddress.neighborhood, primaryAddress.municipality || primaryAddress.city]
      .filter(Boolean).slice(0, 2).join(', ')
    : 'Adicionar morada';

  const discoverBusinesses = (restaurants || []).filter(business => business.status === 'open').slice(0, 6);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 text-gray-900 dark:text-white pb-24">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setActiveTab('profile')} className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm" aria-label="Abrir perfil">
            {userProfile?.avatarUrl
              ? <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center bg-violet-100 text-violet-700 font-black text-sm">{firstName.slice(0, 1).toUpperCase()}</div>}
          </button>
          <button type="button" className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm" aria-label="Notificações">
            <Bell size={19} strokeWidth={1.9} />
          </button>
        </div>

        <div className="mt-5">
          <p className="text-[15px] text-gray-500 dark:text-gray-400">Olá, <span className="font-semibold text-gray-800 dark:text-gray-100">{firstName}</span></p>
          <h1 className="text-[27px] leading-tight font-black tracking-tight mt-0.5">O que precisas?</h1>
        </div>

        <button type="button" onClick={() => setShowAddressPicker(true)} className="w-full mt-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left shadow-sm active:scale-[0.99] transition-transform">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0"><MapPin size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-gray-400">Entregar em</p>
            <p className="text-sm font-bold truncate mt-0.5">{primaryAddress?.label || 'Casa'} <span className="text-gray-400 font-normal">·</span> {addressLabel}</p>
          </div>
          <ChevronRight size={19} className="text-gray-400 shrink-0" />
        </button>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button type="button" onClick={() => { setServiceType(PEDEJA_SERVICE_TYPES.FOME); setActiveTab('home'); }} className="relative h-36 rounded-2xl overflow-hidden text-left shadow-sm border border-black/5 active:scale-[0.985] transition-transform" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />
            <div className="relative h-full flex flex-col justify-end p-4"><span className="text-white text-lg font-black">Pedir algo</span><span className="text-white/80 text-xs mt-0.5">Comida e compras</span></div>
          </button>

          <button type="button" onClick={() => { setServiceType(PEDEJA_SERVICE_TYPES.ENVIAR); setActiveTab('home'); }} className="relative h-36 rounded-2xl overflow-hidden text-left shadow-sm border border-black/5 active:scale-[0.985] transition-transform" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />
            <div className="relative h-full flex flex-col justify-end p-4"><span className="text-white text-lg font-black">Enviar pacote</span><span className="text-white/80 text-xs mt-0.5">De um ponto para outro</span></div>
          </button>
        </div>

        <section className="mt-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black">Actividade</h2>
            {activeDelivery && <button type="button" onClick={() => setActiveTab('activity')} className="text-xs font-bold text-violet-700">Ver pedidos</button>}
          </div>
          {activeDelivery ? (
            <button type="button" onClick={() => setActiveTab('activity')} className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-transform">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-sm truncate">{activeDelivery.status === 'delivered' ? 'A tua entrega chegou' : 'A tua entrega está a caminho'}</p>
                  <p className="text-xs text-gray-500 mt-1">{activeDelivery.riderName || 'Estafeta'} · {activeDeliveryDistance != null ? activeDeliveryDistance + ' km' : 'A actualizar localização'}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 flex items-center justify-center shrink-0"><ChevronRight size={18} /></div>
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full w-2/3 bg-violet-600 rounded-full" /></div>
            </button>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-4">
              <p className="text-sm font-semibold">Ainda não tens entregas activas.</p>
              <p className="text-xs text-gray-500 mt-1">Quando houver uma entrega em curso, o estado aparece aqui.</p>
            </div>
          )}
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between mb-3"><h2 className="text-base font-black">Descobre</h2></div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { label: 'Perto de ti', action: () => setServiceType(PEDEJA_SERVICE_TYPES.FOME) },
              { label: 'Fome', action: () => setServiceType(PEDEJA_SERVICE_TYPES.FOME) },
              { label: 'Compras', action: () => setServiceType(PEDEJA_SERVICE_TYPES.COMPRAS) },
            ].map(item => <button key={item.label} type="button" onClick={item.action} className="shrink-0 px-4 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200">{item.label}</button>)}
          </div>

          {discoverBusinesses.length > 0 && (
            <div className="flex gap-3 overflow-x-auto mt-4 pb-2">
              {discoverBusinesses.map(business => (
                <button key={business.id} type="button" onClick={() => setSelectedRestaurant(business)} className="w-40 shrink-0 text-left bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="h-24 bg-gray-100 dark:bg-gray-800">{business.image ? <img src={business.image} alt="" className="w-full h-full object-cover" loading="lazy" /> : null}</div>
                  <div className="p-3"><p className="font-bold text-sm truncate">{business.name}</p><p className="text-[11px] text-gray-500 mt-1 truncate">{business.category || 'Perto de ti'}</p></div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {showAddressPicker && (
        <div className="fixed inset-0 z-[80] bg-black/35 flex items-end sm:items-center justify-center" onClick={() => setShowAddressPicker(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 pb-7 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-black">Entregar em</h3><p className="text-xs text-gray-500 mt-0.5">Escolhe uma morada guardada.</p></div>
              <button type="button" onClick={() => setShowAddressPicker(false)} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {(userAddresses || []).map(address => (
                <button key={address.id} type="button" onClick={() => { setShowAddressPicker(false); notifySystem('Morada seleccionada', 'A morada seleccionada será usada como destino principal.', 'success'); }} className="w-full text-left p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-3">
                  <MapPin size={18} className="text-violet-600 shrink-0" />
                  <div className="min-w-0 flex-1"><p className="font-bold text-sm">{address.label || 'Morada'}</p><p className="text-xs text-gray-500 truncate">{[address.addressLine1, address.neighborhood, address.municipality || address.city].filter(Boolean).join(', ')}</p></div>
                  {address.id === primaryAddress?.id && <span className="text-[10px] font-black text-violet-700">ACTUAL</span>}
                </button>
              ))}
            </div>
            {(userAddresses || []).length === 0 && <p className="text-sm text-gray-500 py-6 text-center">Ainda não tens uma morada guardada.</p>}
            <button type="button" onClick={() => { setShowAddressPicker(false); setActiveTab('profile'); }} className="w-full mt-4 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm">Gerir moradas</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceSwitcher({ serviceType, setServiceType }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-sm mb-4 grid grid-cols-3 gap-2">
      {SERVICE_OPTIONS.map(option => {
        const Icon = option.icon;
        const active = serviceType === option.id;
        return (
          <button key={option.id} onClick={() => setServiceType(option.id)} className={`rounded-xl p-3 text-left transition-all ${active ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 text-gray-600'}`}>
            <Icon size={19} className="mb-2" />
            <span className="block text-sm font-black">{option.label}</span>
            <span className={`block text-[10px] mt-0.5 ${active ? 'text-orange-100' : 'text-gray-400'}`}>{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function AddressPoint({ title, value, onChange, placeholder, location, active, onActivate, onUseCurrent }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-gray-600">{title}</label>
        <button type="button" onClick={onUseCurrent} className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><Crosshair size={11} /> Localização actual</button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center border rounded-xl p-2.5 bg-gray-50">
          <MapPin size={17} className="text-red-500 mr-2 flex-shrink-0" />
          <input value={value} onChange={event => onChange(event.target.value)} onFocus={onActivate} type="text" placeholder={placeholder} className="w-full outline-none bg-transparent text-sm" autoComplete="street-address" />
        </div>
        <button type="button" onClick={onActivate} className={`p-2.5 rounded-xl border ${active ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500'}`} title="Ajustar localização no mapa" aria-label="Ajustar localização no mapa"><Navigation size={17} /></button>
      </div>
      {location && <p className="text-[10px] text-green-600 mt-1 font-semibold">Localização interna confirmada.</p>}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500">{label}</label>
      <input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full border rounded-xl p-2.5 mt-1 bg-gray-50 outline-none text-sm" autoComplete="off" />
    </div>
  );
}
