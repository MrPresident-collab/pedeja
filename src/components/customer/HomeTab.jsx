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
    restaurants, menuItems, appConfig,
    userProfile, userAddresses,
    cart, setCart,
    parcelDetails, setParcelDetails,
    setPaymentMethod,
    parcelMapTarget, setParcelMapTarget,
    parcelDistance, parcelEstimate,
    placeOrder, placeParcelOrder,
    addToCart, calculateFoodTotal, calculateDeliveryFee,
    handleParcelMapSelect, getCurrentLocationForParcel,
    notifySystem, selectedRestaurant, setSelectedRestaurant,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryAddress = useMemo(
    () => userAddresses?.find(address => address.isDefault) || userAddresses?.[0] || null,
    [userAddresses],
  );

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

  return (
    <div className="p-4 pb-28">
      <ServiceSwitcher serviceType={serviceType} setServiceType={setServiceType} />

      {serviceType === PEDEJA_SERVICE_TYPES.FOME && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {categories.map(category => (
            <button key={category} onClick={() => setSelectedCategory(category)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold ${selectedCategory === category ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-xl font-black text-gray-900 dark:text-white">{serviceType === PEDEJA_SERVICE_TYPES.FOME ? 'Comida perto de si' : 'Compras perto de si'}</h1>
        <p className="text-sm text-gray-500 mt-1">Escolha um estabelecimento e faça o pedido.</p>
      </div>

      {visibleBusinesses.length ? visibleBusinesses.map(business => (
        <RestaurantCard key={business.id} rest={business} appConfig={appConfig} userProfile={userProfile} onSelect={setSelectedRestaurant} />
      )) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400">
          <ShoppingBag size={38} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhum estabelecimento disponível.</p>
          <p className="text-xs mt-1">Tente outra pesquisa ou categoria.</p>
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] px-4 py-3 z-50">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-400">Carrinho</p><p className="font-black">Kz {calculateFoodTotal().toLocaleString()}</p></div>
            <button onClick={() => setSelectedRestaurant(restaurants.find(item => item.id === cart[0].restaurantId) || null)} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold">Rever pedido</button>
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
