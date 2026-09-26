import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarClock, Check, ChevronRight, Clock3, Headphones,
  MapPin, MessageSquare, Package, RefreshCw, ShoppingBag, Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import InteractiveMap from '../InteractiveMap';

const ORDER_TERMINAL = new Set(['DELIVERED', 'CANCELLED', 'FAILED']);
const SHIPMENT_TERMINAL = new Set(['DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED']);
const ACTIVE_DELIVERY = new Set(['READY', 'ASSIGNED', 'PICKUP_PENDING', 'PICKED_UP', 'DELIVERING', 'ARRIVED_AT_PICKUP', 'ARRIVED_AT_DESTINATION']);

const formatKz = value => `Kz ${Number(value || 0).toLocaleString('pt-AO')}`;
const upper = value => String(value || '').toUpperCase();

const addressText = (address = {}) => [
  address.line1 || address.addressLine1,
  address.line2 || address.addressLine2,
  address.neighborhood,
  address.municipality,
  address.city,
  address.province,
].filter(Boolean).join(', ');

const pointFromGeoJson = value => {
  const coordinates = value?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lng, lat] = coordinates.map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const vehicleText = vehicle => {
  if (!vehicle) return 'Veículo não disponível';
  const types = { MOTORBIKE: 'Mota', BICYCLE: 'Bicicleta', CAR: 'Carro', VAN: 'Carrinha', TRUCK: 'Camião' };
  const type = types[upper(vehicle.type || vehicle.vehicleType)] || vehicle.type || vehicle.vehicleType || 'Veículo';
  return [type, vehicle.make, vehicle.model, vehicle.registration || vehicle.registrationNumber].filter(Boolean).join(' · ');
};

const statusCopy = (status, isParcel) => {
  const code = upper(status);
  const map = isParcel ? {
    DRAFT: ['Rascunho', 'O envio ainda não foi confirmado.'],
    REQUESTED: ['A aguardar confirmação', 'Estamos a preparar o teu envio.'],
    PAYMENT_PENDING: ['Pagamento pendente', 'Conclui o pagamento para continuar.'],
    CONFIRMED: ['Confirmado', 'O envio está confirmado.'],
    READY: ['À procura de estafeta', 'Estamos a encontrar um estafeta.'],
    ASSIGNED: ['Estafeta encontrado', 'O estafeta está a caminho do levantamento.'],
    PICKUP_PENDING: ['A caminho do levantamento', 'O estafeta vai recolher o pacote.'],
    PICKED_UP: ['Pacote levantado', 'O pacote já foi recolhido.'],
    DELIVERING: ['Em trânsito', 'O pacote está a caminho do destino.'],
    ARRIVED_AT_DESTINATION: ['Entrega', 'O estafeta chegou ao destino.'],
    DELIVERED: ['Entregue', 'O pacote foi entregue.'],
    CANCELLED: ['Cancelado', 'Este envio foi cancelado.'],
    FAILED: ['Falhou', 'O envio não foi concluído.'],
    RETURNED: ['Devolvido', 'O pacote foi devolvido.'],
  } : {
    DRAFT: ['Rascunho', 'O pedido ainda não foi confirmado.'],
    PENDING: ['Pedido confirmado', 'Aguardamos a confirmação do comerciante.'],
    ACCEPTED: ['Pedido confirmado', 'O comerciante aceitou o pedido.'],
    PREPARING: ['A preparar', 'Restaurante/Loja a preparar o pedido.'],
    READY: ['À procura de estafeta', 'Estamos a encontrar um estafeta.'],
    ASSIGNED: ['Estafeta encontrado', 'O estafeta está a caminho do levantamento.'],
    PICKED_UP: ['Pedido levantado', 'O pedido já foi recolhido.'],
    DELIVERING: ['A caminho', 'O pedido está a caminho da tua morada.'],
    DELIVERED: ['Entregue', 'O pedido foi entregue.'],
    CANCELLED: ['Cancelado', 'Este pedido foi cancelado.'],
    FAILED: ['Falhou', 'O pedido não foi concluído.'],
  };
  return map[code] || ['Estado actualizado', 'O estado vem directamente do servidor.'];
};

const isActive = (activity, isParcel) => {
  const shipmentStatus = upper(activity.shipment?.status);
  const orderStatus = upper(activity.order?.status || activity.orderStatus);
  const deliveryStatus = upper(activity.deliveryStatus || activity.status);
  if (isParcel) return !SHIPMENT_TERMINAL.has(shipmentStatus || upper(activity.status));
  return !ORDER_TERMINAL.has(orderStatus) && !ORDER_TERMINAL.has(deliveryStatus);
};

const dateMs = value => {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? ms : 0;
};

const historyBucket = value => {
  const age = Math.max(0, Date.now() - dateMs(value));
  const hours = age / 3600000;
  if (hours < 24) return 'Hoje';
  if (hours < 168) return 'Ontem';
  if (hours < 600) return 'Esta semana';
  if (hours < 24 * 31) return 'Este mês';
  return null;
};

const mapOrderHistory = row => ({
  id: row.delivery_job_id || row.order_id,
  entityId: row.order_id,
  sourceType: 'ORDER',
  status: row.delivery_status || row.status,
  deliveryStatus: row.delivery_status,
  orderStatus: row.status,
  orderReference: row.order_reference,
  createdAt: row.placed_at,
  order: {
    businessName: row.business_name,
    businessCategory: row.business_category,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    serviceFee: row.service_fee,
    discountAmount: row.discount_amount,
    totalAmount: row.total_amount,
    currency: row.currency_code || 'AOA',
    items: [],
  },
  rider: row.rider_id ? {
    id: row.rider_id,
    name: row.rider_name,
    phone: row.rider_phone,
    vehicle: row.vehicle_id ? {
      id: row.vehicle_id,
      type: row.vehicle_type,
      make: row.vehicle_make,
      model: row.vehicle_model,
      registration: row.vehicle_registration,
    } : null,
  } : null,
});

const mapShipmentHistory = row => ({
  id: row.delivery_job_id || row.shipment_id,
  entityId: row.shipment_id,
  sourceType: 'ENVIAR',
  status: row.delivery_status || row.status,
  deliveryStatus: row.delivery_status,
  shipmentStatus: row.status,
  createdAt: row.requested_at,
  shipment: {
    status: row.status,
    paymentStatus: row.payment_status,
    totalAmount: row.total_amount,
    currency: row.currency_code || 'AOA',
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    recipientAddress: {
      line1: row.recipient_address_line_1,
      neighborhood: row.recipient_neighborhood,
      municipality: row.recipient_municipality,
      city: row.recipient_city,
      province: row.recipient_province,
    },
    packageDescription: row.package_description,
    packageWeightKg: row.package_weight_kg,
    packageSize: row.package_size,
    vehicleType: row.vehicle_type,
    scheduledFor: row.scheduled_for,
    deliveredAt: row.delivered_at,
  },
  rider: row.rider_id ? {
    id: row.rider_id,
    name: row.rider_name,
    phone: row.rider_phone,
    vehicle: row.vehicle_id ? {
      id: row.vehicle_id,
      make: row.vehicle_make,
      model: row.vehicle_model,
      registration: row.vehicle_registration,
    } : null,
  } : null,
});

const mergeActivity = (historyRows, activeRows, domain) => {
  const parcel = domain === 'packages';
  const rows = new Map();
  historyRows.forEach(row => {
    const key = parcel ? `P:${row.entityId}` : `O:${row.entityId}`;
    rows.set(key, row);
  });
  activeRows.forEach(row => {
    const normalized = { ...row, sourceType: upper(row.sourceType || row.source_type) || 'ORDER' };
    const entityId = normalized.shipmentId || normalized.orderId || normalized.id;
    const key = normalized.sourceType === 'ORDER' ? `O:${entityId}` : `P:${entityId}`;
    const existing = rows.get(key);
    rows.set(key, existing ? { ...existing, ...normalized, order: normalized.order || existing.order, shipment: normalized.shipment || existing.shipment, rider: normalized.rider || existing.rider } : normalized);
  });
  return [...rows.values()]
    .filter(row => (parcel ? upper(row.sourceType) !== 'ORDER' : upper(row.sourceType) === 'ORDER'))
    .sort((a, b) => dateMs(b.createdAt || b.requestedAt) - dateMs(a.createdAt || a.requestedAt));
};

function Progress({ status, isParcel }) {
  const steps = isParcel
    ? ['Confirmado', 'Estafeta', 'Levantado', 'Em trânsito', 'Entregue']
    : ['Confirmado', 'A preparar', 'Estafeta', 'A caminho', 'Entregue'];
  const code = upper(status);
  const step = code === 'DELIVERED' ? 4 : code === 'DELIVERING' ? 3 : code === 'PICKED_UP' ? 2 : code === 'ASSIGNED' || code === 'READY' || code === 'PICKUP_PENDING' ? 2 : code === 'PREPARING' ? 1 : 0;
  return (
    <div className="px-4 py-4 border-t border-gray-100">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 mb-3">Progresso</p>
      <div className="flex items-start">
        {steps.map((label, index) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${index < step ? 'bg-violet-600 border-violet-600 text-white' : index === step ? 'border-violet-600 text-violet-600 bg-white' : 'border-gray-200 text-gray-300 bg-white'}`}>
                {index < step ? <Check size={14} strokeWidth={3} /> : <span className="text-[9px] font-black">{index + 1}</span>}
              </div>
              <span className={`text-[9px] text-center mt-1 leading-tight ${index <= step ? 'text-gray-700 font-semibold' : 'text-gray-300'}`}>{label}</span>
            </div>
            {index < steps.length - 1 && <div className={`h-0.5 flex-1 mt-3.5 mx-1 ${index < step ? 'bg-violet-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ activity, onOpen }) {
  const isParcel = upper(activity.sourceType) !== 'ORDER';
  const [title] = statusCopy(activity.shipment?.status || activity.orderStatus || activity.status, isParcel);
  const scheduled = activity.shipment?.scheduledFor;
  const summary = isParcel
    ? `Para: ${activity.shipment?.recipientName || 'Destinatário'}`
    : activity.order?.items?.length
      ? activity.order.items.slice(0, 2).map(item => `${item.quantity || item.qty}× ${item.name}`).join(' · ')
      : activity.order?.businessName || `Pedido ${activity.orderReference || ''}`;
  return (
    <button onClick={() => onOpen(activity)} className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.995] transition-transform">
      <div className="px-4 pt-4 pb-2 flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">{isParcel ? <Package size={21} /> : <ShoppingBag size={21} />}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400 font-bold">{isParcel ? 'Pacote' : activity.order?.businessName || 'Pedido'}</p>
          <h3 className="font-bold text-gray-900 truncate">{isParcel ? summary : summary}</h3>
          <p className="text-xs text-violet-600 font-semibold mt-0.5">{scheduled ? `${new Date(scheduled).toLocaleDateString('pt-AO')} · ${new Date(scheduled).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}` : title}</p>
        </div>
        <ChevronRight size={19} className="text-gray-300 mt-2 shrink-0" />
      </div>
      <div className="px-4 pb-4 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500 truncate">{isParcel ? addressText(activity.shipment?.recipientAddress) : activity.order?.businessName || activity.orderReference}</div>
        <div className="flex items-center gap-2 shrink-0">
          {!isParcel && <span className="font-black text-sm text-gray-900">{formatKz(activity.order?.totalAmount)}</span>}
          {isParcel && activity.shipment?.totalAmount != null && <span className="font-black text-sm text-gray-900">{formatKz(activity.shipment.totalAmount)}</span>}
          <span className="text-violet-600 text-xs font-bold">Ver&nbsp;›</span>
        </div>
      </div>
      {activity.rider && <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2"><span className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-[10px]">{activity.rider.avatarUrl ? <img src={activity.rider.avatarUrl} alt="" className="w-full h-full object-cover" /> : <Truck size={13} />}</span><span className="text-xs text-gray-600">{activity.rider.name || 'Estafeta'}</span><span className="text-[10px] text-gray-400">·</span><span className="text-[10px] text-gray-400 truncate">{vehicleText(activity.rider.vehicle)}</span></div>}
    </button>
  );
}

function CancelShipment({ activity, onDone }) {
  const shipment = activity.shipment || {};
  const status = upper(shipment.status || activity.shipmentStatus || activity.status);
  const cancellable = ['DRAFT', 'REQUESTED', 'PAYMENT_PENDING', 'CONFIRMED', 'ASSIGNED', 'PICKUP_PENDING'].includes(status);
  const [step, setStep] = useState('idle');
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  if (!cancellable) return null;
  const scheduled = Boolean(shipment.scheduledFor);
  const addressChange = reason === 'ADDRESS_CHANGED';
  const reasonOptions = [
    ['NO_LONGER_NEEDED', 'Já não preciso de enviar'],
    ['RECIPIENT_NO_LONGER_INTERESTED', 'O destinatário já não precisa'],
    ['PACKAGE_NO_LONGER_VALID', 'O pacote já não está disponível'],
    ...(status !== 'CONFIRMED' ? [['NO_RIDER_FOUND', 'Não foi encontrado nenhum Estafeta']] : []),
    ...(status === 'ASSIGNED' || status === 'PICKUP_PENDING' ? [['RIDER_DELAY', 'O Estafeta está a demorar demasiado'], ['ADDRESS_CHANGED', 'A morada de entrega mudou']] : []),
    ['CUSTOM', 'Outro motivo'],
  ];
  const submit = async () => {
    if (!reason || (reason === 'CUSTOM' && !custom.trim())) return setMessage('Indica o motivo do cancelamento.');
    if (addressChange) return;
    setMessage('');
    const code = ['NO_LONGER_NEEDED', 'RIDER_DELAY'].includes(reason) ? 'CUSTOM' : reason;
    const text = custom.trim() || reasonOptions.find(([value]) => value === reason)?.[1] || '';
    const rpc = scheduled ? 'cancel_customer_enviar_schedule' : 'cancel_customer_enviar_shipment';
    const args = scheduled ? { p_shipment_id: activity.entityId, p_reason_code: code, p_reason_text: text } : { p_shipment_id: activity.entityId, p_reason: text };
    const { error } = await supabase.rpc(rpc, args);
    if (error) return setMessage(error.message || 'O servidor não permitiu cancelar este envio.');
    onDone();
  };
  if (step === 'idle') return <button onClick={() => setStep('confirm')} className="w-full mt-3 py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm">Cancelar envio</button>;
  return (
    <div className="mt-3 bg-white rounded-2xl border border-red-100 p-4">
      {step === 'confirm' ? <><p className="font-black text-gray-900">Cancelar envio?</p><p className="text-sm text-gray-500 mt-1">Tens a certeza de que queres cancelar este envio?</p><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={() => setStep('reason')} className="py-3 rounded-xl bg-red-500 text-white font-bold">Continuar</button><button onClick={() => setStep('idle')} className="py-3 rounded-xl bg-gray-100 text-gray-700 font-bold">Voltar</button></div></> : <><p className="font-black text-gray-900">Por que estás a cancelar?</p><div className="space-y-2 mt-3">{reasonOptions.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name={`cancel-${activity.entityId}`} checked={reason === value} onChange={() => setReason(value)} /> {label}</label>)}</div>{reason === 'CUSTOM' && <textarea value={custom} onChange={event => setCustom(event.target.value)} placeholder="Conta-nos o motivo..." className="w-full mt-3 border rounded-xl p-3 text-sm" rows={3} />}{addressChange && <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">A nova morada exige validação de coordenadas, posse, área de serviço e revalidação do envio. Essa operação ainda não existe no backend live.</div>}{message && <p className="mt-3 text-xs text-red-600">{message}</p>}<div className="grid grid-cols-2 gap-2 mt-4"><button onClick={submit} className="py-3 rounded-xl bg-red-500 text-white font-bold">Confirmar cancelamento</button><button onClick={() => setStep('confirm')} className="py-3 rounded-xl bg-gray-100 text-gray-700 font-bold">Voltar</button></div></>}
    </div>
  );
}

function DestinationChange({ activity, onDone }) {
  const current = activity.shipment || {};
  const point = pointFromGeoJson(activity.destinationLocation);
  const [form,setForm]=useState({line1:current.recipientAddress?.line1||'',reference:'',neighborhood:current.recipientAddress?.neighborhood||'',municipality:current.recipientAddress?.municipality||'',city:current.recipientAddress?.city||'',province:current.recipientAddress?.province||''});
  const [location,setLocation]=useState(point); const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false);
  const capture=()=>{if(!navigator.geolocation)return setMessage('O navegador não suporta localização.');navigator.geolocation.getCurrentPosition(p=>setLocation({lat:p.coords.latitude,lng:p.coords.longitude}),()=>setMessage('Não foi possível obter a localização do destino.'),{enableHighAccuracy:true,timeout:10000})};
  const save=async()=>{if(!form.line1||!form.neighborhood||!form.municipality||!form.city||!form.province||!location)return setMessage('Preenche a morada e confirma a localização.');setSaving(true);setMessage('');const {error}=await supabase.rpc('update_customer_enviar_destination',{p_shipment_id:activity.entityId,p_address_line_1:form.line1,p_address_line_2:null,p_reference:form.reference||null,p_neighborhood:form.neighborhood,p_municipality:form.municipality,p_city:form.city,p_province:form.province,p_latitude:Number(location.lat),p_longitude:Number(location.lng)});setSaving(false);if(error)return setMessage(error.message||'A morada não foi actualizada.');onDone()};
  return <div className="mt-3 bg-white rounded-2xl border border-violet-100 p-4"><p className="font-black">Qual é a nova morada de entrega?</p><div className="space-y-2 mt-3"><input value={form.line1} onChange={e=>setForm({...form,line1:e.target.value})} placeholder="Rua e número" className="w-full border rounded-xl p-3 text-sm"/><input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})} placeholder="Referência" className="w-full border rounded-xl p-3 text-sm"/><input value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})} placeholder="Bairro" className="w-full border rounded-xl p-3 text-sm"/><input value={form.municipality} onChange={e=>setForm({...form,municipality:e.target.value})} placeholder="Município" className="w-full border rounded-xl p-3 text-sm"/><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Cidade" className="w-full border rounded-xl p-3 text-sm"/><input value={form.province} onChange={e=>setForm({...form,province:e.target.value})} placeholder="Província" className="w-full border rounded-xl p-3 text-sm"/></div><button onClick={capture} className="w-full mt-3 py-3 rounded-xl border border-violet-200 text-violet-700 font-bold text-sm">{location?'Localização confirmada':'Confirmar localização'}</button>{message&&<p className="mt-3 text-xs text-red-600">{message}</p>}<button disabled={saving} onClick={save} className="w-full mt-3 py-3 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-50">{saving?'A actualizar...':'Confirmar nova morada'}</button></div>;
}

function EditSchedule({ activity, onDone }) {
  const scheduledFor = activity.shipment?.scheduledFor;
  const status = upper(activity.shipment?.status || activity.shipmentStatus || activity.status);
  const editable = Boolean(scheduledFor) && ['PAYMENT_PENDING', 'CONFIRMED'].includes(status);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => scheduledFor ? new Date(scheduledFor).toISOString().slice(0, 16) : '');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  if (!editable) return null;
  const submit = async () => {
    if (!value) return setMessage('Escolhe uma data e hora.');
    const { error } = await supabase.rpc('edit_customer_enviar_schedule', {
      p_shipment_id: activity.entityId,
      p_scheduled_for: new Date(value).toISOString(),
      p_customer_note: note.trim() || null,
    });
    if (error) return setMessage(error.message || 'O servidor não permitiu editar este envio.');
    onDone();
  };
  return (
    <div className="mt-3">
      {!open ? <button onClick={() => setOpen(true)} className="w-full py-3 rounded-xl border border-violet-200 text-violet-700 font-bold text-sm">Editar envio</button> : (
        <div className="bg-white rounded-2xl border border-violet-100 p-4">
          <p className="font-black text-gray-900">Editar envio</p>
          <label className="block text-xs text-gray-500 mt-3">Data e hora<input type="datetime-local" value={value} onChange={event => setValue(event.target.value)} className="w-full mt-1 border rounded-xl p-3 text-sm" /></label>
          <label className="block text-xs text-gray-500 mt-3">Instruções opcionais<textarea value={note} onChange={event => setNote(event.target.value)} className="w-full mt-1 border rounded-xl p-3 text-sm" rows={2} /></label>
          {message && <p className="mt-3 text-xs text-red-600">{message}</p>}
          <div className="grid grid-cols-2 gap-2 mt-4"><button onClick={submit} className="py-3 rounded-xl bg-violet-600 text-white font-bold">Guardar</button><button onClick={() => setOpen(false)} className="py-3 rounded-xl bg-gray-100 text-gray-700 font-bold">Voltar</button></div>
        </div>
      )}
    </div>
  );
}

function ActivityDetail({ activity, onBack, onRefresh, onCancelled }) {
  const { openChatWindow, userProfile } = useApp();
  const isParcel = upper(activity.sourceType) !== 'ORDER';
  const [title, subtitle] = statusCopy(activity.shipment?.status || activity.orderStatus || activity.status, isParcel);
  const pickup = pointFromGeoJson(activity.pickupLocation);
  const destination = pointFromGeoJson(activity.destinationLocation);
  const riderLocation = pointFromGeoJson(activity.rider?.location);
  const total = isParcel ? activity.shipment?.totalAmount : activity.order?.totalAmount;
  const chatRider = () => activity.rider?.id && openChatWindow(`delivery-rider-${activity.rider.id}`, activity.rider.name || 'Estafeta', 'rider');
  const openSupport = () => openChatWindow(`support-delivery-${activity.id}-${userProfile?.id || 'customer'}`, 'Suporte Pedejá', 'customer');
  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3"><button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100" aria-label="Voltar"><ArrowLeft size={21} /></button><div className="min-w-0 flex-1"><p className="font-black text-gray-900">{isParcel ? 'Pacote' : 'Pedido'}</p><p className="text-[10px] text-gray-400 truncate">{isParcel ? activity.entityId : activity.orderReference || activity.entityId}</p></div><button onClick={onRefresh} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Actualizar"><RefreshCw size={17} /></button></div>
      <div className="px-3 pt-3"><div className="relative rounded-2xl overflow-hidden bg-gray-200"><InteractiveMap mode="view" userLocation={destination} shopLocation={pickup} riderLocation={riderLocation} trackingMode autoFollow={Boolean(riderLocation)} className="h-[42vh] min-h-[280px] !mb-0 !border-0 !rounded-none" /><div className="absolute left-3 right-3 bottom-3 z-[1000] bg-white/95 backdrop-blur rounded-2xl shadow-lg px-4 py-3"><p className="font-black text-gray-900 text-sm">{title}</p><p className="text-xs text-gray-500 mt-0.5">{subtitle}</p></div></div></div>
      <div className="px-4 pt-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.14em] text-violet-600 font-black">{isParcel ? 'Pacote' : activity.order?.businessName || 'Pedido'}</p><h1 className="text-xl font-black text-gray-900 mt-1">{isParcel ? `Para: ${activity.shipment?.recipientName || 'Destinatário'}` : activity.order?.businessName || 'Pedido'}</h1><p className="text-xs text-gray-400 mt-1">{activity.orderReference || activity.entityId}</p></div>{total != null && <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Total</p><p className="font-black text-gray-900">{formatKz(total)}</p></div>}</div>
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-black mb-3">{isParcel ? 'Destino' : 'Entrega'}</p><div className="flex gap-3"><MapPin size={17} className="text-violet-600 mt-0.5 shrink-0" /><p className="text-sm text-gray-700">{addressText(isParcel ? activity.shipment?.recipientAddress : activity.destinationAddress) || 'Morada de entrega'}</p></div></div>
        {isParcel && activity.shipment?.deliveryCode && <div className="mt-3 bg-violet-50 border border-violet-100 rounded-2xl p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-violet-700 font-black">CÓDIGO DE ENTREGA</p><p className="font-bold text-gray-900 mt-2">O teu pacote foi aceite.</p><p className="text-xs text-gray-600 mt-1">Entrega este código ao destinatário.</p><p className="text-3xl tracking-[0.35em] font-black text-violet-700 mt-3">{activity.shipment.deliveryCode.code}</p><p className="text-xs text-red-600 mt-2">Não partilhes este código com o Estafeta.</p></div>}
        {activity.rider && <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-black mb-3">Estafeta</p><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xl shrink-0">{activity.rider.avatarUrl ? <img src={activity.rider.avatarUrl} alt="" className="w-full h-full object-cover" /> : <Truck size={22} />}</div><div className="min-w-0 flex-1"><p className="font-bold text-gray-900">{activity.rider.name || 'Estafeta'}</p><p className="text-xs text-gray-500 mt-1">{vehicleText(activity.rider.vehicle)}</p></div></div><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={chatRider} className="py-3 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2"><MessageSquare size={17} /> Chat</button><button onClick={openSupport} className="py-3 rounded-xl bg-gray-100 text-gray-800 font-bold text-sm flex items-center justify-center gap-2"><Headphones size={17} /> Suporte</button></div></div>}
        {activity.order?.items?.length > 0 && <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-black mb-3">Itens do pedido</p>{activity.order.items.map(item => <div key={item.id} className="py-2 flex items-center justify-between gap-3 border-b border-gray-100 last:border-0"><span className="text-sm text-gray-800">{item.quantity || item.qty} × {item.name}</span><span className="text-sm font-semibold text-gray-700">{formatKz(item.lineTotal)}</span></div>)}</div>}
        <Progress status={activity.shipment?.status || activity.orderStatus || activity.status} isParcel={isParcel} />
        {isParcel && <EditSchedule activity={activity} onDone={onCancelled} />}
        {isParcel && <CancelShipment activity={activity} onDone={onCancelled} />}
        {isParcel && upper(activity.shipment?.status) !== 'DELIVERED' && <DestinationChange activity={activity} onDone={onCancelled} />}
        <p className="mt-4 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1"><Truck size={12} /> Estado actualizado directamente pelo servidor.</p>
      </div>
    </div>
  );
}

export default function ActivityTab({ domain = 'orders' }) {
  const { setActiveTab, setServiceType, setParcelDetails } = useApp();
  const [activities, setActivities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isParcel = domain === 'packages';

  const loadActivities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const historyRpc = isParcel ? 'get_customer_enviar_history' : 'get_customer_orders_history';
    const [activeResult, historyResult] = await Promise.all([
      supabase.rpc('customer_activity_snapshot'),
      supabase.rpc(historyRpc),
    ]);
    if (activeResult.error || historyResult.error) {
      console.error('customer activity load:', activeResult.error || historyResult.error);
      setError('Não foi possível carregar os dados do servidor.');
    } else {
      const activeRows = Array.isArray(activeResult.data) ? activeResult.data : [];
      let historyRows = (Array.isArray(historyResult.data) ? historyResult.data : []).map(isParcel ? mapShipmentHistory : mapOrderHistory);
      if (!isParcel && historyRows.length) {
        // History stays as a projection. Full order details are fetched only when the customer opens an order.
      }
      setActivities(mergeActivity(historyRows, activeRows, domain));
      setError('');
    }
    setLoading(false); setRefreshing(false);
  }, [domain, isParcel]);

  useEffect(() => {
    // This effect synchronizes the screen with the authoritative Supabase snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActivities();
    return undefined;
  }, [loadActivities]);

  const openActivity = async activity => {
    setSelected(activity);
    if (activity.sourceType === 'ORDER' && !activity.order?.items?.length) {
      const { data, error: rpcError } = await supabase.rpc('get_customer_order_detail', { p_order_id: activity.entityId });
      if (!rpcError && data) {
        const order = data;
        setSelected(previous => previous ? { ...previous, order: { ...previous.order, businessName: order.businessName, totalAmount: Number(order.totalAmount || 0), subtotal: Number(order.subtotal || 0), deliveryFee: Number(order.deliveryFee || 0), items: (order.items || []).map(item => ({ ...item, quantity: item.quantity, lineTotal: Number(item.lineTotal || 0) })) }, destinationAddress: order.deliveryAddress, orderStatus: order.status, deliveryStatus: order.delivery?.status, rider: order.delivery?.riderId ? { id: order.delivery.riderId, name: order.delivery.riderName, vehicle: { type: order.delivery.vehicleType, make: order.delivery.vehicleMake, model: order.delivery.vehicleModel, registration: order.delivery.vehicleRegistration } } : previous.rider } : previous);
      }
    }
    if (isParcel) {
      const { data: tracking } = await supabase.rpc('get_customer_enviar_tracking', { p_shipment_id: activity.entityId });
      const { data: codeRows } = await supabase.rpc('get_customer_enviar_delivery_code', { p_shipment_id: activity.entityId });
      const trackingData = tracking || {};
      const code = Array.isArray(codeRows) && codeRows[0]?.code ? codeRows[0] : null;
      setSelected(previous => previous ? { ...previous, status: trackingData.deliveryStatus || trackingData.status || previous.status, deliveryStatus: trackingData.deliveryStatus, rider: trackingData.riderId ? { id: trackingData.riderId, name: trackingData.riderName, location: trackingData.riderLocation, lastLocationAt: trackingData.riderLocationUpdatedAt, vehicle: { make: trackingData.vehicleMake, model: trackingData.vehicleModel, registration: trackingData.vehicleRegistration } } : previous.rider, shipment: { ...previous.shipment, deliveryCode: code } } : previous);
    }
  };

  const grouped = useMemo(() => {
    const active = activities.filter(activity => isActive(activity, isParcel));
    const history = activities.filter(activity => !isActive(activity, isParcel)).map(activity => ({ ...activity, bucket: historyBucket(activity.createdAt) })).filter(activity => activity.bucket);
    return { active, history };
  }, [activities, isParcel]);

  const handleStart = scheduled => {
    setNotice('');
    setParcelDetails(previous => ({ ...previous, scheduledFor: scheduled ? (previous.scheduledFor || new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0,16)) : '' }));
    setServiceType('ENVIAR');
    setActiveTab('home');
  };

  const renderGroup = (label, rows) => rows.length > 0 && <section key={label} className="mt-5"><h2 className="text-[11px] uppercase tracking-[0.14em] text-gray-400 font-black mb-2">{label}</h2><div className="space-y-3">{rows.map(row => <ActivityCard key={row.id || row.entityId} activity={row} onOpen={openActivity} />)}</div></section>;

  if (selected) return <ActivityDetail activity={selected} onBack={() => setSelected(null)} onRefresh={() => loadActivities(true)} onCancelled={() => { setSelected(null); loadActivities(true); }} />;

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="px-4 pt-5 pb-4 bg-white border-b border-gray-100 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.14em] text-violet-600 font-black">Pedejá</p><h1 className="text-2xl font-black text-gray-900 mt-1">{isParcel ? 'Pacotes' : 'Pedidos'}</h1><p className="text-xs text-gray-500 mt-1">{isParcel ? 'Acompanha os teus envios.' : 'Os teus pedidos de Fome e Compras.'}</p></div><button onClick={() => loadActivities(true)} disabled={refreshing} className="p-2.5 rounded-full bg-gray-100 text-gray-500" aria-label="Actualizar"><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} /></button></div>
      {isParcel && <div className="px-4 pt-4 grid grid-cols-2 gap-3"><button onClick={() => handleStart(false)} className="py-3 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Package size={17} /> Enviar agora</button><button onClick={() => handleStart(true)} className="py-3 rounded-xl bg-white border border-violet-200 text-violet-700 font-bold text-sm flex items-center justify-center gap-2"><CalendarClock size={17} /> Agendar envio</button></div>}
      {notice && <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">{notice}</div>}
      <div className="p-4">
        {loading && <div className="py-20 text-center text-gray-400"><RefreshCw size={24} className="mx-auto animate-spin mb-3" /><p className="text-sm">A carregar {isParcel ? 'pacotes' : 'pedidos'}...</p></div>}
        {!loading && error && <div className="bg-white rounded-2xl border border-red-100 p-5 text-center"><p className="font-bold text-gray-900">Não foi possível carregar {isParcel ? 'os pacotes' : 'os pedidos'}</p><p className="text-xs text-gray-500 mt-1">{error}</p><button onClick={() => loadActivities()} className="mt-4 px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm">Tentar novamente</button></div>}
        {!loading && !error && grouped.active.length === 0 && grouped.history.length === 0 && <div className="py-16 text-center"><div className="w-16 h-16 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-4">{isParcel ? <Package size={28} /> : <ShoppingBag size={28} />}</div><p className="font-bold text-gray-900">{isParcel ? 'Ainda não tens pacotes.' : 'Ainda não tens pedidos.'}</p><p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">{isParcel ? 'Quando fizeres um envio, ele aparecerá aqui.' : 'Quando fizeres um pedido, ele aparecerá aqui.'}</p><button onClick={() => handleStart(false)} className="mt-5 px-5 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm">{isParcel ? 'Enviar agora' : 'Pedir Algo'}</button></div>}
        {!loading && !error && grouped.active.length > 0 && <section><h2 className="text-[11px] uppercase tracking-[0.14em] text-gray-400 font-black mb-2">Activos</h2><div className="space-y-3">{grouped.active.map(row => <ActivityCard key={row.id || row.entityId} activity={row} onOpen={openActivity} />)}</div></section>}
        {!loading && !error && grouped.history.length > 0 && ['Hoje', 'Ontem', 'Esta semana', 'Este mês'].map(label => renderGroup(label, grouped.history.filter(row => row.bucket === label)))}
      </div>
    </div>
  );
}
