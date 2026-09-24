import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, ChevronRight, Clock3, Headphones, MapPin,
  MessageSquare, Package, RefreshCw, ShoppingBag, Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import InteractiveMap from '../InteractiveMap';

const ACTIVE_STATUSES = new Set([
  'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERING',
]);

const STATUS_COPY = {
  READY: {
    title: 'A aguardar estafeta',
    subtitle: 'Estamos a encontrar um estafeta para esta entrega.',
    step: 1,
  },
  ASSIGNED: {
    title: 'Estafeta atribuído',
    subtitle: 'O estafeta está a caminho do ponto de recolha.',
    step: 2,
  },
  PICKED_UP: {
    title: 'A tua encomenda está a caminho',
    subtitle: 'O estafeta já recolheu a tua encomenda.',
    step: 3,
  },
  DELIVERING: {
    title: 'A tua encomenda está a caminho',
    subtitle: 'O estafeta está a dirigir-se à tua morada.',
    step: 3,
  },
};

const formatKz = (value) => `Kz ${Number(value || 0).toLocaleString('pt-AO')}`;

const pointFromGeoJson = (value) => {
  const coordinates = value?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lng, lat] = coordinates.map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const addressText = (address = {}) =>
  [address.line1, address.line2, address.neighborhood, address.municipality, address.city]
    .filter(Boolean)
    .join(', ');

const vehicleText = (vehicle) => {
  if (!vehicle) return 'Veículo não disponível';
  const typeMap = {
    MOTORBIKE: 'Mota',
    BICYCLE: 'Bicicleta',
    CAR: 'Carro',
    VAN: 'Carrinha',
    TRUCK: 'Camião',
  };
  const type = typeMap[vehicle.type] || vehicle.type || 'Veículo';
  const model = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return [type, model, vehicle.registration].filter(Boolean).join(' · ');
};

function Progress({ step }) {
  const labels = ['Pedido confirmado', 'Estafeta atribuído', 'Recolhido', 'Entregue'];
  return (
    <div className="px-4 py-4 border-t border-gray-100">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 mb-3">Estado da entrega</p>
      <div className="flex items-start">
        {labels.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                  done ? 'bg-violet-600 border-violet-600 text-white' :
                  current ? 'border-violet-600 text-violet-600 bg-white' :
                  'border-gray-200 text-gray-300 bg-white'
                }`}>
                  {done ? <Check size={14} strokeWidth={3} /> : <span className="text-[9px] font-black">{index + 1}</span>}
                </div>
                <span className={`text-[9px] text-center mt-1 leading-tight ${
                  done || current ? 'text-gray-700 font-semibold' : 'text-gray-300'
                }`}>{label}</span>
              </div>
              {index < labels.length - 1 && (
                <div className={`h-0.5 flex-1 mt-3.5 mx-1 ${index < step ? 'bg-violet-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function ActivityCard({ activity, onOpen }) {
  const copy = STATUS_COPY[activity.status] || STATUS_COPY.READY;
  const isParcel = activity.sourceType !== 'ORDER';
  const rider = activity.rider;
  const eta = activity.expectedDeliveryAt
    ? new Date(activity.expectedDeliveryAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button onClick={() => onOpen(activity.id)} className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.995] transition-transform">
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          {isParcel ? <Package size={21} /> : <ShoppingBag size={21} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400 font-bold">{isParcel ? 'Pacote' : 'Pedido'}</p>
          <h3 className="font-bold text-gray-900 truncate">
            {isParcel ? 'Entrega de pacote' : activity.order?.businessName || 'Comerciante'}
          </h3>
          <p className="text-xs text-violet-600 font-semibold mt-0.5">{copy.title}</p>
        </div>
        <ChevronRight size={19} className="text-gray-300 mt-2 shrink-0" />
      </div>
      <div className="px-4 pb-4 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500 truncate">
          {isParcel ? addressText(activity.destinationAddress) : activity.orderReference || activity.orderId?.slice(0, 8)}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
          <Clock3 size={13} />
          {eta || 'Em acompanhamento'}
        </div>
      </div>
      {rider && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-[10px]">
            {rider.avatarUrl ? <img src={rider.avatarUrl} alt="" className="w-full h-full object-cover" /> : '🛵'}
          </span>
          <span className="text-xs text-gray-600">{rider.name || 'Estafeta'}</span>
          <span className="text-[10px] text-gray-400">·</span>
          <span className="text-[10px] text-gray-400 truncate">{vehicleText(rider.vehicle)}</span>
        </div>
      )}
    </button>
  );
}

function ActivityDetail({ activity, onBack, onRefresh }) {
  const { openChatWindow, userProfile } = useApp();
  const isParcel = activity.sourceType !== 'ORDER';
  const rider = activity.rider;
  const copy = STATUS_COPY[activity.status] || STATUS_COPY.READY;
  const pickup = pointFromGeoJson(activity.pickupLocation);
  const destination = pointFromGeoJson(activity.destinationLocation);
  const riderLocation = pointFromGeoJson(rider?.location);

  const mapUser = destination;
  const mapShop = pickup;
  const total = activity.order?.totalAmount ?? activity.shipment?.totalAmount;
  const currency = activity.order?.currency || activity.shipment?.currency || 'AOA';

  const chatRider = () => {
    if (!rider?.id) return;
    openChatWindow(
      `delivery-rider-${rider.id}`,
      rider.name || 'Estafeta',
      'rider',
    );
  };

  const openSupport = () => {
    openChatWindow(
      `support-delivery-${activity.id}-${userProfile?.id || 'customer'}`,
      'Suporte Pedejá',
      'customer',
    );
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100" aria-label="Voltar">
          <ArrowLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-black text-gray-900">Actividade</p>
          <p className="text-[10px] text-gray-400 truncate">
            {isParcel ? 'Pacote' : activity.orderReference || activity.orderId}
          </p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Actualizar">
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="relative rounded-2xl overflow-hidden bg-gray-200">
          <InteractiveMap
            mode="view"
            userLocation={mapUser}
            shopLocation={mapShop}
            riderLocation={riderLocation}
            trackingMode
            autoFollow={Boolean(riderLocation)}
            className="h-[46vh] min-h-[320px] !mb-0 !border-0 !rounded-none"
          />
          <div className="absolute left-3 right-3 bottom-3 z-[1000] bg-white/95 backdrop-blur rounded-2xl shadow-lg px-4 py-3">
            <p className="font-black text-gray-900 text-sm">{copy.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-violet-600 font-black">
              {isParcel ? 'Pacote' : 'Pedido'}
            </p>
            <h1 className="text-xl font-black text-gray-900 mt-1">
              {isParcel ? 'Entrega de pacote' : activity.order?.businessName || 'Comerciante'}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {activity.orderReference ? `Pedido ${activity.orderReference}` : activity.id}
            </p>
          </div>
          {total != null && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Total</p>
              <p className="font-black text-gray-900">{formatKz(total)}</p>
              <p className="text-[10px] text-gray-400">{currency}</p>
            </div>
          )}
        </div>

        <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-black mb-3">
            {isParcel ? 'Percurso' : 'Entrega'}
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <MapPin size={17} className="text-violet-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Recolha</p>
                <p className="text-sm text-gray-700">{addressText(activity.pickupAddress) || 'Ponto de recolha'}</p>
              </div>
            </div>
            <div className="w-px h-3 bg-gray-200 ml-2" />
            <div className="flex gap-3">
              <MapPin size={17} className="text-green-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Destino</p>
                <p className="text-sm text-gray-700">{addressText(activity.destinationAddress) || 'Morada de entrega'}</p>
              </div>
            </div>
          </div>
        </div>

        {rider && (
          <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-black mb-3">Estafeta</p>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xl shrink-0">
                {rider.avatarUrl ? <img src={rider.avatarUrl} alt="" className="w-full h-full object-cover" /> : '🛵'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900">{rider.name || 'Estafeta'}</p>
                <p className="text-xs text-gray-500 mt-1">{vehicleText(rider.vehicle)}</p>
                {rider.lastLocationAt && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Localização actualizada {new Date(rider.lastLocationAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={chatRider}
                className="py-3 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <MessageSquare size={17} /> Chat
              </button>
              <button
                onClick={openSupport}
                className="py-3 rounded-xl bg-gray-100 text-gray-800 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Headphones size={17} /> Suporte
              </button>
            </div>
          </div>
        )}

        {!rider && (
          <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4">
            <p className="font-bold text-gray-900">Ainda não há estafeta atribuído</p>
            <p className="text-xs text-gray-500 mt-1">{copy.subtitle}</p>
            <button onClick={openSupport} className="mt-3 w-full py-3 rounded-xl bg-gray-100 text-gray-800 font-bold text-sm flex items-center justify-center gap-2">
              <Headphones size={17} /> Suporte
            </button>
          </div>
        )}

        {activity.order && (
          <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-black mb-3">Itens do pedido</p>
            <div className="divide-y divide-gray-100">
              {(activity.order.items || []).map(item => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{item.quantity} × {item.name}</p>
                    {item.sku && <p className="text-[10px] text-gray-400">{item.sku}</p>}
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{formatKz(item.lineTotal)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-2 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span>{formatKz(activity.order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Entrega</span><span>{formatKz(activity.order.deliveryFee)}</span></div>
              {Number(activity.order.serviceFee) > 0 && <div className="flex justify-between"><span className="text-gray-400">Serviço</span><span>{formatKz(activity.order.serviceFee)}</span></div>}
              {Number(activity.order.discountAmount) > 0 && <div className="flex justify-between"><span className="text-gray-400">Desconto</span><span>- {formatKz(activity.order.discountAmount)}</span></div>}
              <div className="flex justify-between pt-2 border-t border-gray-100 font-black text-sm"><span>Total</span><span>{formatKz(activity.order.totalAmount)}</span></div>
            </div>
          </div>
        )}

        {activity.shipment && (
          <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-black mb-3">Detalhes do pacote</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] text-gray-400 uppercase">Descrição</p><p className="text-gray-800 mt-0.5">{activity.shipment.packageDescription || '—'}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Peso</p><p className="text-gray-800 mt-0.5">{activity.shipment.packageWeightKg ? `${activity.shipment.packageWeightKg} kg` : '—'}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Tamanho</p><p className="text-gray-800 mt-0.5">{activity.shipment.packageSize || '—'}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Veículo</p><p className="text-gray-800 mt-0.5">{activity.shipment.vehicleType || '—'}</p></div>
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between font-black text-sm">
              <span>Total</span><span>{formatKz(activity.shipment.totalAmount)}</span>
            </div>
          </div>
        )}

        <Progress step={copy.step} />

        <div className="mt-2 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <Truck size={12} />
          A actividade é actualizada directamente a partir do estado da entrega.
        </div>
      </div>
    </div>
  );
}

export default function ActivityTab() {
  const { setActiveTab } = useApp();
  const [activities, setActivities] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadActivities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const { data, error: rpcError } = await supabase.rpc('customer_activity_snapshot');
    if (rpcError) {
      console.error('customer_activity_snapshot:', rpcError);
      setError('Não foi possível actualizar a actividade.');
    } else {
      setError('');
      const rows = Array.isArray(data) ? data : [];
      setActivities(rows);
      setSelectedId(current => current && rows.some(row => row.id === current) ? current : null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadActivities();
    const interval = window.setInterval(() => loadActivities(true), 5000);
    return () => window.clearInterval(interval);
  }, [loadActivities]);

  const selected = useMemo(
    () => activities.find(activity => activity.id === selectedId) || null,
    [activities, selectedId],
  );

  if (selected) {
    return (
      <ActivityDetail
        activity={selected}
        onBack={() => setSelectedId(null)}
        onRefresh={() => loadActivities(true)}
      />
    );
  }

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="px-4 pt-5 pb-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-violet-600 font-black">Pedejá</p>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Actividade</h1>
          <p className="text-xs text-gray-500 mt-1">Acompanha as tuas entregas em curso.</p>
        </div>
        <button onClick={() => loadActivities(true)} disabled={refreshing} className="p-2.5 rounded-full bg-gray-100 text-gray-500">
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-4">
        {loading && (
          <div className="py-20 text-center text-gray-400">
            <RefreshCw size={24} className="mx-auto animate-spin mb-3" />
            <p className="text-sm">A carregar actividade...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-100 p-5 text-center">
            <p className="font-bold text-gray-900">Não foi possível carregar a actividade</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
            <button onClick={() => loadActivities()} className="mt-4 px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm">Tentar novamente</button>
          </div>
        )}

        {!loading && !error && activities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-black text-gray-900">{activities.length} {activities.length === 1 ? 'entrega activa' : 'entregas activas'}</p>
              <span className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Live</span>
            </div>
            {activities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} onOpen={setSelectedId} />
            ))}
          </div>
        )}

        {!loading && !error && activities.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-4">
              <Truck size={28} />
            </div>
            <p className="font-bold text-gray-900">Não tens entregas activas</p>
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Quando um pedido ou pacote estiver em curso, aparecerá aqui.</p>
            <button onClick={() => setActiveTab('home')} className="mt-5 px-5 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm">
              Voltar ao início
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
