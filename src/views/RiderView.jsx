import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  AlertCircle,
  Bike,
  ChevronRight,
  CircleHelp,
  ArrowLeft,
  MessageCircle,
  CreditCard,
  HandCoins,
  History,
  MapPin,
  Navigation,
  Package,
  User,
  Phone,
  Power,
  ReceiptText,
  ShieldAlert,
  ShoppingBag,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const ACTIVE_STATUSES = ['ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION'];
const STATUS_LABELS = {
  ACCEPTED: 'A caminho da recolha',
  ARRIVED_PICKUP: 'Chegaste à recolha',
  PICKED_UP: 'Encomenda contigo',
  IN_TRANSIT: 'A caminho da entrega',
  ARRIVED_DESTINATION: 'Chegaste ao destino',
};

function money(value) {
  return `Kz ${Number(value || 0).toLocaleString('pt-AO', { maximumFractionDigits: 0 })}`;
}

function addressParts(row, prefix) {
  return [
    row?.[`${prefix}_address_line_1`],
    row?.[`${prefix}_address_line_2`],
    row?.[`${prefix}_neighborhood`],
    row?.[`${prefix}_municipality`],
    row?.[`${prefix}_city`],
  ].filter(Boolean);
}

function formatAddress(parts) {
  return parts.filter(Boolean).join(', ');
}

function getOrderKind(job) {
  if (job?.source_type === 'ENVIAR' || job?.enviar_shipment_id) return 'ENVIAR';
  if (job?.source_type === 'ORDER') {
    const category = String(job?.business?.marketplace_category || '').toLowerCase();
    return category === 'comida' || category === 'food' ? 'FOME' : 'COMPRAS';
  }
  return job?.kind || 'FOME';
}

function getOrderTypeIcon(kind) {
  if (kind === 'ENVIAR') return Package;
  if (kind === 'COMPRAS') return ShoppingBag;
  return ReceiptText;
}

function mapJob(job, order, shipment, business) {
  const pickup = formatAddress(addressParts(job, 'pickup'));
  const destination = formatAddress(addressParts(job, 'destination'));
  const kind = getOrderKind({ ...job, order, business, enviar_shipment_id: job?.enviar_shipment_id });
  return {
    ...job,
    order,
    shipment,
    business,
    kind,
    typeLabel: kind === 'ENVIAR' ? 'Enviar' : kind === 'COMPRAS' ? 'Compras' : 'Fome',
    pickupAddress: pickup || 'Ponto de recolha',
    destinationAddress: destination || 'Ponto de entrega',
    recipientName: job?.recipient_name || shipment?.recipient_name || order?.recipient_name || '',
    recipientPhone: job?.recipient_phone || shipment?.recipient_phone || order?.recipient_phone || '',
    senderName: shipment?.sender_name || business?.name || order?.business_name || '',
    senderPhone: shipment?.sender_phone || business?.phone || '',
    instructions: job?.delivery_instructions || shipment?.customer_note || order?.delivery_instructions || order?.customer_note || '',
    paymentMethod: String(order?.payment_method || (shipment ? 'PREPAID' : '')).toUpperCase(),
    totalAmount: Number(order?.total_amount ?? shipment?.total_amount ?? 0),
    riderPay: Number(job?.rider_total_pay_aoa ?? 0),
    tipAmount: Number(order?.tip_amount ?? shipment?.tip_amount ?? 0),
    pickupKm: Number(job?.pickup_distance_km ?? 0),
    deliveryKm: Number(job?.delivery_distance_km ?? 0),
  };
}

export default function RiderView() {
  const {
    setActiveRole,
    riderTab,
    setRiderTab,
    userProfile,
    currentUser,
    riders,
    openChatWindow,
    isDarkMode,
    toggleDarkMode,
    supabase,
  } = useApp();

  const uid = userProfile?.id || currentUser?.id;
  const rider = useMemo(() => riders.find((item) => item.userId === uid), [riders, uid]);

  const [availability, setAvailability] = useState(rider?.availabilityStatus || 'OFFLINE');
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gps, setGps] = useState(null);
  const [offer, setOffer] = useState(null);
  const [offerSeconds, setOfferSeconds] = useState(0);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [todayPay, setTodayPay] = useState(0);
  const [history, setHistory] = useState([]);
  const offerTimerRef = useRef(null);
  const offerDeadlineRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);

  const isOnline = availability === 'AVAILABLE';
  const isBusy = availability === 'BUSY';

  const loadJob = useCallback(async (jobId) => {
    if (!jobId) return null;
    const { data: job, error: jobError } = await supabase
      .from('delivery_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) return null;

    let order = null;
    let shipment = null;
    let business = null;

    if (job.order_id) {
      const orderResult = await supabase
        .from('orders')
        .select('id,business_id,payment_method,payment_status,total_amount,tip_amount,delivery_instructions,customer_note,recipient_name,recipient_phone,order_reference')
        .eq('id', job.order_id)
        .maybeSingle();
      if (orderResult.error) throw orderResult.error;
      order = orderResult.data;
      if (order?.business_id) {
        const businessResult = await supabase
          .from('businesses')
          .select('id,name,phone,marketplace_category')
          .eq('id', order.business_id)
          .maybeSingle();
        if (!businessResult.error) business = businessResult.data;
      }
    }

    if (job.enviar_shipment_id) {
      const shipmentResult = await supabase
        .from('enviar_shipments')
        .select('id,total_amount,delivery_fee,sender_name,sender_phone,recipient_name,recipient_phone,customer_note')
        .eq('id', job.enviar_shipment_id)
        .maybeSingle();
      if (shipmentResult.error) throw shipmentResult.error;
      shipment = shipmentResult.data;
    }

    return mapJob(job, order, shipment, business);
  }, [supabase]);

  const loadActive = useCallback(async () => {
    if (!rider?.id) return;
    const { data: assignments, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .select('delivery_job_id,status,offer_expires_at,accepted_at,proposed_at')
      .eq('rider_id', rider.id)
      .in('status', ['ACCEPTED'])
      .order('accepted_at', { ascending: false })
      .limit(3);
    if (assignmentError) throw assignmentError;

    const jobIds = (assignments || []).map((a) => a.delivery_job_id);
    if (!jobIds.length) {
      setActiveJob(null);
      return;
    }

    for (const jobId of jobIds) {
      const job = await loadJob(jobId);
      if (job && ACTIVE_STATUSES.includes(job.status)) {
        setActiveJob(job);
        return;
      }
    }
    setActiveJob(null);
  }, [loadJob, rider?.id, supabase]);

  const loadHistory = useCallback(async () => {
    if (!rider?.id) return;

    const { data: assignments, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .select('delivery_job_id,status,accepted_at,updated_at')
      .eq('rider_id', rider.id)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (assignmentError) throw assignmentError;

    const jobIds = [...new Set((assignments || []).map((row) => row.delivery_job_id).filter(Boolean))];
    if (!jobIds.length) {
      setHistory([]);
      setTodayPay(0);
      return;
    }

    const { data: jobs, error: jobsError } = await supabase
      .from('delivery_jobs')
      .select('id,status,rider_total_pay_aoa,created_at,updated_at,pickup_distance_km,delivery_distance_km')
      .in('id', jobIds)
      .eq('status', 'DELIVERED')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (jobsError) throw jobsError;

    const rows = (jobs || []).map((job) => ({
      ...job,
      pay: Number(job.rider_total_pay_aoa || 0),
    }));

    setHistory(rows);
    const today = new Date().toDateString();
    setTodayPay(
      rows
        .filter((row) => new Date(row.updated_at || row.created_at).toDateString() === today)
        .reduce((sum, row) => sum + row.pay, 0),
    );
  }, [rider?.id, supabase]);

  const loadState = useCallback(async () => {
    if (!rider?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: riderRow, error: riderError } = await supabase
        .from('riders')
        .select('availability_status')
        .eq('id', rider.id)
        .maybeSingle();
      if (riderError) throw riderError;
      setAvailability(riderRow?.availability_status || 'OFFLINE');
      await Promise.all([loadActive(), loadHistory()]);
    } catch (err) {
      console.error('[RiderView] load state', err);
      setError('Não foi possível actualizar o estado do estafeta.');
    } finally {
      setLoading(false);
    }
  }, [loadActive, loadHistory, rider?.id, supabase]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const hydrateOffer = useCallback(async (assignment) => {
    if (!assignment?.delivery_job_id) return;
    const job = await loadJob(assignment.delivery_job_id);
    if (!job) return;

    const expires = new Date(assignment.offer_expires_at || Date.now()).getTime();
    const seconds = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
    if (!seconds) return;

    setOffer({ ...assignment, job });
    offerDeadlineRef.current = expires;
    setOfferSeconds(seconds);
    clearInterval(offerTimerRef.current);
    offerTimerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((offerDeadlineRef.current - Date.now()) / 1000));
      setOfferSeconds(left);
      if (!left) {
        clearInterval(offerTimerRef.current);
        setOffer(null);
      }
    }, 250);
  }, [loadJob]);

  useEffect(() => () => clearInterval(offerTimerRef.current), []);

  useEffect(() => {
    if (!rider?.id) return undefined;

    const channel = supabase
      .channel(`rider-delivery-assignments-${rider.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_assignments',
        filter: `rider_id=eq.${rider.id}`,
      }, async (payload) => {
        const row = payload.new;
        if (row?.status === 'PROPOSED') {
          await hydrateOffer(row);
        } else if (row?.status === 'ACCEPTED') {
          clearInterval(offerTimerRef.current);
          setOffer(null);
          const job = await loadJob(row.delivery_job_id);
          if (job) setActiveJob(job);
          setAvailability('BUSY');
        } else if (['REJECTED', 'EXPIRED', 'REVOKED'].includes(row?.status)) {
          setOffer(null);
        }
      })
      .subscribe();

    return () => {
      clearInterval(offerTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [hydrateOffer, loadJob, rider?.id, supabase]);

  useEffect(() => {
    if (!rider?.id) return undefined;

    let cancelled = false;
    const refresh = async () => {
      const { data, error: assignmentError } = await supabase
        .from('delivery_assignments')
        .select('delivery_job_id,status,offer_expires_at,proposed_at')
        .eq('rider_id', rider.id)
        .in('status', ['PROPOSED', 'ACCEPTED'])
        .order('proposed_at', { ascending: false })
        .limit(5);
      if (assignmentError || cancelled) return;

      const proposed = (data || []).find((row) =>
        row.status === 'PROPOSED' && new Date(row.offer_expires_at || 0).getTime() > Date.now()
      );
      if (proposed) await hydrateOffer(proposed);
    };
    refresh();
    return () => { cancelled = true; };
  }, [hydrateOffer, rider?.id, supabase]);

  useEffect(() => {
    if (!navigator.geolocation || !rider?.id) {
      setGpsStatus('unavailable');
      return undefined;
    }

    const options = { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 };
    const onSuccess = (position) => {
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setGps(next);
      setGpsStatus('tracking');
      supabase.rpc('rider_update_location', {
        p_latitude: next.lat,
        p_longitude: next.lng,
      }).then(({ error: rpcError }) => {
        if (rpcError) console.error('[RiderView] rider_update_location', rpcError);
      });
    };
    const onError = (geoError) => {
      if (geoError.code === 1) setGpsStatus('denied');
      else setGpsStatus('unavailable');
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
    return () => navigator.geolocation.clearWatch(watchId);
  }, [rider?.id, supabase]);

  const setOnline = async (nextOnline) => {
    setActionLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('rider_set_availability', {
        p_status: nextOnline ? 'AVAILABLE' : 'OFFLINE',
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error('AVAILABILITY_NOT_CHANGED');
      setAvailability(nextOnline ? 'AVAILABLE' : 'OFFLINE');
    } catch (err) {
      console.error('[RiderView] availability', err);
      setError(err?.message === 'RIDER_NOT_VERIFIED'
        ? 'A conta de estafeta ainda não está verificada.'
        : err?.message === 'ACTIVE_DELIVERY_EXISTS'
          ? 'Conclua a entrega activa antes de ficar offline.'
          : 'Não foi possível alterar a disponibilidade.');
    } finally {
      setActionLoading(false);
    }
  };

  const acceptOffer = async () => {
    if (!offer?.job?.id || actionLoading || offerSeconds <= 0) return;
    setActionLoading(true);
    setError('');
    try {
      await supabase.rpc('rider_accept_delivery', { p_delivery_job_id: offer.job.id }).then(({ error: rpcError }) => {
        if (rpcError) throw rpcError;
      });
      const job = await loadJob(offer.job.id);
      setOffer(null);
      clearInterval(offerTimerRef.current);
      setActiveJob(job);
      setAvailability('BUSY');
      setRiderTab('active');
    } catch (err) {
      console.error('[RiderView] accept', err);
      setError(err?.message === 'OFFER_EXPIRED' || err?.message?.includes('OFFER_EXPIRED')
        ? 'Esta entrega já expirou.'
        : 'Não foi possível aceitar esta entrega.');
      setOffer(null);
    } finally {
      setActionLoading(false);
    }
  };

  const rejectOffer = async () => {
    if (!offer?.job?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('rider_reject_delivery', {
        p_delivery_job_id: offer.job.id,
        p_reason: 'Rider recusou a oferta',
      });
      if (rpcError) throw rpcError;
      setOffer(null);
      clearInterval(offerTimerRef.current);
    } catch (err) {
      console.error('[RiderView] reject', err);
      setError('Não foi possível recusar esta entrega.');
    } finally {
      setActionLoading(false);
    }
  };

  const advance = async (action) => {
    if (!activeJob?.id || actionLoading) return;
    setActionLoading(true);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('rider_advance_delivery', {
        p_delivery_job_id: activeJob.id,
        p_action: action,
      });
      if (rpcError) throw rpcError;
      const job = await loadJob(activeJob.id);
      if (job?.status === 'DELIVERED') {
        setActiveJob(null);
        setAvailability('AVAILABLE');
        await loadHistory();
        setRiderTab('home');
      } else {
        setActiveJob(job);
      }
    } catch (err) {
      console.error('[RiderView] advance', err);
      const message = err?.message || '';
      if (message.includes('CASH_PAYMENT_REQUIRED') || message.includes('ORDER_PAYMENT_REQUIRED')) {
        setError('O pagamento desta entrega ainda não foi confirmado.');
      } else if (message.includes('PICKUP_WAIT_EXCEEDED')) {
        setError('O tempo máximo de espera na recolha foi atingido. Contacte o suporte.');
      } else {
        setError('Não foi possível actualizar a entrega. O servidor manteve o estado anterior.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const navigationUrl = useCallback((location, address) => {
    if (location?.coordinates?.length === 2) {
      const [lng, lat] = location.coordinates;
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '#';
  }, []);

  const help = useCallback(() => {
    openChatWindow(
      activeJob ? `support-${activeJob.id}` : `support-${uid}`,
      'Suporte Pedejá',
      'rider',
    );
  }, [activeJob, openChatWindow, uid]);

  if (!rider) {
    return (
      <div className="min-h-screen bg-violet-950 text-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <ShieldAlert size={40} className="mx-auto mb-4 text-violet-200" />
          <h1 className="text-xl font-bold">Conta de estafeta não disponível</h1>
          <p className="text-sm text-slate-500 mt-2">A tua conta ainda não tem um perfil de estafeta activo.</p>
          <button onClick={() => setActiveRole('customer')} className="mt-6 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const shell = 'bg-[#F7F5FF] text-slate-900';
  const panel = 'bg-white border-slate-200';
  const muted = 'text-slate-500';

  const renderOffer = () => {
    if (!offer) return null;
    const job = offer.job;
    const TypeIcon = getOrderTypeIcon(job.kind);
    const cash = ['CASH', 'NUMERARIO', 'CASH_ON_DELIVERY'].includes(job.paymentMethod);
    const tip = Number(job.tipAmount || 0);

    return (
      <div className="fixed inset-0 z-[200] bg-slate-950/45 backdrop-blur-sm flex items-end justify-center">
        <div className={`${panel} w-full max-w-md rounded-t-3xl border p-5 pb-7 shadow-2xl`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Nova entrega</p>
              <p className="text-3xl font-black mt-1">{money(job.riderPay)}</p>
            </div>
            <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-lg ${offerSeconds <= 5 ? 'border-red-500 text-red-400' : 'border-violet-500 text-violet-300'}`}>
              {offerSeconds}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-xl border border-slate-700 px-3 py-2 flex items-center gap-2">
              <TypeIcon size={17} />
              <span className="text-sm font-bold">{job.typeLabel}</span>
            </div>
            <div className="rounded-xl border border-slate-700 px-3 py-2 flex items-center gap-2">
              {cash ? <HandCoins size={17} /> : <CreditCard size={17} />}
              <span className="text-sm font-bold">{cash ? 'Numerário' : 'Pago'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold mb-4">
            <span>{job.pickupKm ? `${job.pickupKm.toFixed(1)} km` : '—'}</span>
            <span>{job.expected_pickup_at ? `até ${new Date(job.expected_pickup_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}` : 'tempo estimado'}</span>
            {tip > 0 && <span className="text-violet-700">Gorjeta {money(tip)}</span>}
          </div>

          <div className="space-y-3 mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-violet-300/45 font-bold">Recolha</p>
              <p className="font-bold mt-1">{job.senderName || 'Ponto de recolha'}</p>
              <p className={`text-sm ${muted}`}>{job.pickupAddress}</p>
            </div>
            <div className="h-px bg-violet-900" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Entrega</p>
              <p className="font-bold mt-1">{job.recipientName || 'Destinatário'}</p>
              <p className={`text-sm ${muted}`}>{job.destinationAddress}</p>
              {job.instructions && <p className="text-sm mt-1 text-violet-700">{job.instructions}</p>}
            </div>
          </div>

          {cash && job.totalAmount > 0 && (
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-2 text-sm mb-4">
              Cobrar no destino: <strong>{money(job.totalAmount)}</strong>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={rejectOffer} disabled={actionLoading} className="flex-1 py-3.5 rounded-xl border border-slate-700 font-bold disabled:opacity-40">
              Recusar
            </button>
            <button onClick={acceptOffer} disabled={actionLoading || offerSeconds <= 0} className="flex-[1.4] py-3.5 rounded-xl bg-violet-600 text-white font-black disabled:opacity-40">
              {actionLoading ? 'A processar...' : 'Aceitar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

    useEffect(() => {
      if (riderTab !== 'home') return undefined;
      if (!mapRef.current || mapInstanceRef.current) return undefined;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: true,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        touchZoom: true,
      }).setView(gps ? [gps.lat, gps.lng] : [-8.8383, 13.2344], gps ? 15 : 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;

      return () => {
        map.remove();
        mapInstanceRef.current = null;
        riderMarkerRef.current = null;
      };
    }, [riderTab]);

    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !gps) return;
      const point = [gps.lat, gps.lng];
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = L.circleMarker(point, {
          radius: 8,
          color: '#6D28D9',
          weight: 4,
          fillColor: '#FFFFFF',
          fillOpacity: 1,
        }).addTo(map);
      } else {
        riderMarkerRef.current.setLatLng(point);
      }
      map.setView(point, Math.max(map.getZoom(), 15), { animate: true });
    }, [gps]);
  useEffect(() => {
    if (riderTab !== 'home') return undefined;
    if (!mapRef.current || mapInstanceRef.current) return undefined;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      touchZoom: true,
    }).setView(gps ? [gps.lat, gps.lng] : [-8.8383, 13.2344], gps ? 15 : 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      riderMarkerRef.current = null;
    };
  }, [riderTab]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !gps) return;
    const point = [gps.lat, gps.lng];
    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.circleMarker(point, {
        radius: 8,
        color: '#6D28D9',
        weight: 4,
        fillColor: '#FFFFFF',
        fillOpacity: 1,
      }).addTo(map);
    } else {
      riderMarkerRef.current.setLatLng(point);
    }
    map.setView(point, Math.max(map.getZoom(), 15), { animate: true });
  }, [gps]);

  const renderHome = () => {
    return (
      <div className="relative h-[calc(100dvh-5rem)] min-h-[620px] overflow-hidden bg-[#F7F5FF]">
        <div ref={mapRef} className="absolute inset-0 z-0" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-white/90 via-white/45 to-transparent" />

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => setActiveRole('customer')}
            aria-label="Perfil do estafeta"
            className="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_4px_18px_rgba(38,20,72,0.18)]"
          >
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="Foto do estafeta" className="h-full w-full object-cover" />
            ) : (
              <User size={21} className="mx-auto text-violet-700" />
            )}
          </button>

          <button
            onClick={help}
            aria-label="Ajuda"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white text-violet-800 shadow-[0_4px_18px_rgba(38,20,72,0.16)]"
          >
            <CircleHelp size={20} />
          </button>
        </div>

        {isBusy && (
          <div className="absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-full border border-white bg-white/95 px-4 py-2 text-xs font-black tracking-[0.12em] text-violet-800 shadow-[0_4px_18px_rgba(38,20,72,0.14)] backdrop-blur">
            EM ENTREGA
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4">
          <div className="mx-auto max-w-md">
            {!isBusy && (
              <button
                onClick={() => setOnline(!isOnline)}
                disabled={actionLoading}
                className="mb-3 w-full rounded-2xl bg-violet-600 py-4 text-base font-black text-white shadow-[0_8px_24px_rgba(109,40,217,0.30)] transition hover:bg-violet-700 active:scale-[0.985] disabled:opacity-60"
              >
                {actionLoading ? 'A actualizar...' : isOnline ? 'INDISPONÍVEL' : 'DISPONÍVEL'}
              </button>
            )}

            <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_8px_30px_rgba(38,20,72,0.16)] backdrop-blur">
              <div className="px-3 py-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Hoje</p>
                <p className="mt-1 text-sm font-black text-slate-900">{money(todayPay)}</p>
              </div>
              <div className="border-l border-slate-100 px-3 py-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Entregas</p>
                <p className="mt-1 text-sm font-black text-slate-900">{history.length}</p>
              </div>
              <div className="border-l border-slate-100 px-3 py-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Duração</p>
                <p className="mt-1 text-sm font-black text-slate-900">—</p>
              </div>
              <div className="border-l border-slate-100 px-3 py-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Km</p>
                <p className="mt-1 text-sm font-black text-slate-900">—</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActive = () => {
    if (!activeJob) {
      return (
        <section className={`rounded-3xl border p-8 text-center ${panel}`}>
          <Bike size={36} className="mx-auto text-slate-500 mb-3" />
          <h2 className="font-bold text-lg">Nenhuma entrega activa</h2>
          <p className={`text-sm mt-1 ${muted}`}>Quando aceitares uma entrega, ela aparece aqui.</p>
        </section>
      );
    }

    const pickupPhase = ['ACCEPTED', 'ARRIVED_PICKUP'].includes(activeJob.status);
    const destinationPhase = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DESTINATION'].includes(activeJob.status);
    const cash = ['CASH', 'NUMERARIO', 'CASH_ON_DELIVERY'].includes(activeJob.paymentMethod);
    const targetLocation = pickupPhase ? activeJob.pickup_location : activeJob.destination_location;
    const targetAddress = pickupPhase ? activeJob.pickupAddress : activeJob.destinationAddress;
    const contactName = pickupPhase ? activeJob.senderName : activeJob.recipientName;
    const contactPhone = pickupPhase ? activeJob.senderPhone : activeJob.recipientPhone;
    const nextAction = activeJob.status === 'ACCEPTED'
      ? 'ARRIVED_PICKUP'
      : activeJob.status === 'ARRIVED_PICKUP'
        ? 'PICKED_UP'
        : activeJob.status === 'PICKED_UP'
          ? 'IN_TRANSIT'
          : activeJob.status === 'IN_TRANSIT'
            ? 'ARRIVED_DESTINATION'
            : 'DELIVERED';
    const actionLabel = activeJob.status === 'ACCEPTED'
      ? 'Cheguei à recolha'
      : activeJob.status === 'ARRIVED_PICKUP'
        ? 'Confirmar recolha'
        : activeJob.status === 'PICKED_UP'
          ? 'Começar entrega'
          : activeJob.status === 'IN_TRANSIT'
            ? 'Cheguei ao destino'
            : 'Confirmar entrega';

    return (
      <div className="space-y-4">
        <section className={`rounded-3xl border p-5 ${panel}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className={`text-xs uppercase tracking-wider font-bold ${muted}`}>{STATUS_LABELS[activeJob.status]}</p>
              <p className="font-black text-lg mt-1">#{activeJob.order?.order_reference || activeJob.id.slice(0, 8)}</p>
            </div>
            <p className="font-black text-emerald-400">{money(activeJob.riderPay)}</p>
          </div>

          <div className="relative pl-7">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-700" />
            <div className="relative mb-7">
              <div className="absolute -left-7 top-0 w-4 h-4 rounded-full border-2 border-violet-500 bg-violet-950" />
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Recolha</p>
              <p className="font-bold mt-1">{activeJob.senderName || 'Ponto de recolha'}</p>
              <p className={`text-sm mt-1 ${muted}`}>{activeJob.pickupAddress}</p>
            </div>
            <div className="relative">
              <div className="absolute -left-7 top-0 w-4 h-4 rounded-full border-2 border-slate-500 bg-white" />
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Entrega</p>
              <p className="font-bold mt-1">{activeJob.recipientName || 'Destinatário'}</p>
              <p className={`text-sm mt-1 ${muted}`}>{activeJob.destinationAddress}</p>
              {activeJob.instructions && <p className="text-sm text-amber-400 mt-2">{activeJob.instructions}</p>}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <a href={navigationUrl(targetLocation, targetAddress)} target="_blank" rel="noreferrer" className="py-3 rounded-2xl bg-violet-600 text-white font-bold flex items-center justify-center gap-2">
            <Navigation size={18} /> Navegar
          </a>
          {contactPhone ? (
            <a href={`tel:${contactPhone}`} className={`py-3 rounded-2xl border ${panel} font-bold flex items-center justify-center gap-2`}>
              <Phone size={18} /> Contactar
            </a>
          ) : (
            <button onClick={help} className={`py-3 rounded-2xl border ${panel} font-bold flex items-center justify-center gap-2`}>
              <CircleHelp size={18} /> Contactar suporte
            </button>
          )}
        </div>

        <button onClick={help} className="w-full py-3 rounded-2xl border border-slate-700 text-sm font-bold flex items-center justify-center gap-2">
          <CircleHelp size={17} /> Ajuda
        </button>

        {cash && activeJob.status === 'ARRIVED_DESTINATION' && activeJob.totalAmount > 0 && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-50 p-4">
            <p className="text-xs uppercase tracking-wider text-amber-400 font-bold">Cobrança</p>
            <p className="text-xl font-black mt-1">{money(activeJob.totalAmount)}</p>
            <p className={`text-xs mt-1 ${muted}`}>Confirma a entrega depois de o pagamento ser registado.</p>
          </div>
        )}

        <button
          onClick={() => advance(nextAction)}
          disabled={actionLoading}
          className="w-full py-4 rounded-2xl bg-violet-600 text-white font-black text-base disabled:opacity-50"
        >
          {actionLoading ? 'A actualizar...' : actionLabel}
        </button>

        {destinationPhase && (
          <div className="text-center text-xs text-slate-500">
            {activeJob.status === 'PICKED_UP' ? 'A encomenda está contigo.' : 'Segue o próximo passo indicado acima.'}
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="space-y-3">
      <section className={`rounded-2xl border p-4 ${panel}`}>
        <p className={`text-xs ${muted}`}>Ganhos de hoje</p>
        <p className="text-2xl font-black mt-1">{money(todayPay)}</p>
      </section>
      {history.length === 0 ? (
        <section className={`rounded-2xl border p-8 text-center ${panel}`}>
          <History size={32} className="mx-auto text-slate-500 mb-3" />
          <p className="font-bold">Ainda sem entregas concluídas</p>
        </section>
      ) : history.map((item) => (
        <div key={item.id} className={`rounded-2xl border p-4 ${panel} flex items-center justify-between`}>
          <div>
            <p className="font-bold">Entrega concluída</p>
            <p className={`text-xs mt-1 ${muted}`}>{new Date(item.delivered_at || item.updated_at || item.created_at).toLocaleString('pt-AO')}</p>
          </div>
          <p className="font-black text-emerald-400">+{money(item.pay)}</p>
        </div>
      ))}
    </div>
  );

  const renderWallet = () => (
    <section className={`rounded-3xl border p-6 ${panel}`}>
      <WalletCards size={28} className="text-emerald-400 mb-4" />
      <p className={`text-sm ${muted}`}>Ganhos registados</p>
      <p className="text-3xl font-black mt-1">{money(todayPay)}</p>
      <p className={`text-xs mt-3 ${muted}`}>Os valores de cada entrega são calculados e liquidados pelo servidor.</p>
    </section>
  );

  const renderProfile = () => (
    <div className="space-y-3">
      <section className={`rounded-3xl border p-5 ${panel}`}>
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <User size={26} />
        </div>
        <p className="font-black text-xl">{userProfile?.name || 'Estafeta'}</p>
        <p className={`text-sm mt-1 ${muted}`}>{userProfile?.phone || userProfile?.email || ''}</p>
      </section>
      <button onClick={() => toggleDarkMode()} className={`w-full rounded-2xl border p-4 ${panel} flex items-center justify-between font-bold`}>
        <span>Modo {isDarkMode ? 'escuro' : 'claro'}</span>
        <ChevronRight size={18} />
      </button>
      <button onClick={help} className={`w-full rounded-2xl border p-4 ${panel} flex items-center justify-between font-bold`}>
        <span>Suporte Pedejá</span>
        <MessageCircle size={18} />
      </button>
      <button onClick={() => setActiveRole('customer')} className="w-full rounded-2xl bg-slate-800 text-white p-4 font-bold flex items-center justify-center gap-2">
        <ArrowLeft size={18} /> Voltar
      </button>
    </div>
  );

  let content = null;
  if (loading) {
    content = (
      <div className="space-y-3">
        <div className={`h-40 rounded-3xl border ${panel} animate-pulse`} />
        <div className={`h-24 rounded-2xl border ${panel} animate-pulse`} />
      </div>
    );
  } else if (riderTab === 'active') {
    content = renderActive();
  } else if (riderTab === 'history') {
    content = renderHistory();
  } else if (riderTab === 'wallet') {
    content = renderWallet();
  } else if (riderTab === 'profile') {
    content = renderProfile();
  } else {
    content = renderHome();
  }

  return (
    <div className={`min-h-screen ${shell} pb-20`}>
      {renderOffer()}

      <main className="mx-auto w-full max-w-md">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2 text-sm text-red-300">
            <XCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
          </div>
        )}
        {content}
      </main>

      <nav className={`fixed bottom-0 inset-x-0 z-50 border-t backdrop-blur-xl ${'bg-white/95 border-slate-200'}`}>
        <div className="max-w-md mx-auto grid grid-cols-4 h-20">
          {[
            ['home', Power, 'Início'],
            ['active', Bike, 'Entregas'],
            ['wallet', WalletCards, 'Ganhos'],
            ['profile', User, 'Perfil'],
          ].map(([tab, Icon, label]) => {
            const selected = (tab === 'home' && ['home', 'jobs'].includes(riderTab)) || riderTab === tab;
            return (
              <button key={tab} onClick={() => setRiderTab(tab)} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${selected ? 'text-violet-700' : muted}`}>
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
