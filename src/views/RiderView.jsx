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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    themeMode,
    setThemeMode,
    handleLogout,
    supabase,
  } = useApp();

  const uid = userProfile?.id || currentUser?.id;
  const accountStatus = String(currentUser?.account_status || userProfile?.accountStatus || 'ACTIVE').toUpperCase();
  const accountRestricted = ['SUSPENDED', 'DEACTIVATED', 'DELETED'].includes(accountStatus);
  const rider = useMemo(() => riders.find((item) => item.userId === uid), [riders, uid]);

  const [availability, setAvailability] = useState(rider?.availabilityStatus || 'OFFLINE');
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gps, setGps] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [networkOnline, setNetworkOnline] = useState(() => navigator.onLine !== false);
  const [offer, setOffer] = useState(null);
  const [offerSeconds, setOfferSeconds] = useState(0);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [todayPay, setTodayPay] = useState(0);
  const [profileSnapshot, setProfileSnapshot] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [profileDetail, setProfileDetail] = useState(null);
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem('pedeja_language');
    return ['pt', 'en', 'fr'].includes(stored) ? stored : 'pt';
  });
  const [history, setHistory] = useState([]);
  const offerTimerRef = useRef(null);
  const offerDeadlineRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);

  const isOnline = availability === 'AVAILABLE';
  const isBusy = availability === 'BUSY';
  const isAccountSuspended = accountStatus === 'SUSPENDED';
  const isAccountDeactivated = accountStatus === 'DEACTIVATED';

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
          if (job) {
            setActiveJob(job);
            setRiderTab('active');
          }
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

    let cancelled = false;
    let retryTimer = null;
    let heartbeatTimer = null;
    let watchId = null;

    const onNetworkOnline = () => setNetworkOnline(true);
    const onNetworkOffline = () => setNetworkOnline(false);
    window.addEventListener('online', onNetworkOnline);
    window.addEventListener('offline', onNetworkOffline);

    const options = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    };

    const reportLocation = (position) => {
      if (cancelled) return;
      const { latitude, longitude, accuracy } = position.coords;
      const next = { lat: latitude, lng: longitude };
      setGps(next);
      setGpsAccuracy(Number.isFinite(accuracy) ? accuracy : null);
      setGpsStatus('tracking');

      supabase.rpc('rider_update_location', {
        p_latitude: next.lat,
        p_longitude: next.lng,
      }).then(({ error: rpcError }) => {
        if (rpcError) console.error('[RiderView] rider_update_location', rpcError);
      });
    };

    const onError = (geoError) => {
      if (cancelled) return;
      if (geoError.code === 1) {
        setGpsStatus('denied');
        if (retryTimer) window.clearTimeout(retryTimer);
        return;
      }

      setGpsStatus('recovering');
      if (!retryTimer) {
        retryTimer = window.setTimeout(() => {
          retryTimer = null;
          navigator.geolocation.getCurrentPosition(reportLocation, onError, options);
        }, 5000);
      }
    };

    const acquire = () => {
      if (cancelled) return;
      setGpsStatus('locating');
      navigator.geolocation.getCurrentPosition(reportLocation, onError, options);
    };

    acquire();
    watchId = navigator.geolocation.watchPosition(reportLocation, onError, options);

    // watchPosition remains event-driven while the rider is moving.
    // A 15-minute heartbeat is only a fallback for an otherwise stationary rider.
    heartbeatTimer = window.setInterval(acquire, 15 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (retryTimer) window.clearTimeout(retryTimer);
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onNetworkOnline);
      window.removeEventListener('offline', onNetworkOffline);
    };
  }, [rider?.id, supabase]);

  const loadProfileSnapshot = useCallback(async () => {
    if (!uid) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      const [{ data, error: snapshotError }, { data: authData, error: authError }] = await Promise.all([
        supabase.rpc('rider_get_profile_snapshot'),
        supabase.auth.getUser(),
      ]);
      if (snapshotError) throw snapshotError;
      if (authError) throw authError;
      setProfileSnapshot({
        ...(data || {}),
        email: authData?.user?.email || userProfile?.email || '',
        emailVerified: Boolean(authData?.user?.email_confirmed_at),
      });
    } catch (err) {
      console.error('[RiderView] profile snapshot', err);
      setProfileError('Não foi possível carregar os dados do perfil.');
    } finally {
      setProfileLoading(false);
    }
  }, [supabase, uid, userProfile?.email]);

  useEffect(() => {
    if (riderTab === 'profile') loadProfileSnapshot();
  }, [loadProfileSnapshot, riderTab]);

  const updateNotificationPreferences = useCallback(async (key, value) => {
    const current = profileSnapshot?.profile;
    if (!current || notificationSaving) return;
    const next = {
      newOffers: Boolean(current.is_offer_notification),
      deliveryStatus: Boolean(current.is_delivery_status_notification),
      earnings: Boolean(current.is_payment_notification),
    };
    next[key] = value;
    setNotificationSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc('rider_update_notification_preferences', {
        p_new_delivery_offers: next.newOffers,
        p_delivery_status: next.deliveryStatus,
        p_earnings_payments: next.earnings,
      });
      if (rpcError) throw rpcError;
      setProfileSnapshot(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          is_offer_notification: next.newOffers,
          is_delivery_status_notification: next.deliveryStatus,
          is_payment_notification: next.earnings,
        },
      }));
    } catch (err) {
      console.error('[RiderView] notification preferences', err);
      setProfileError('Não foi possível guardar as preferências.');
    } finally {
      setNotificationSaving(false);
    }
  }, [notificationSaving, profileSnapshot, supabase]);

  const setProfileTheme = useCallback((mode) => {
    setThemeMode(mode);
  }, [setThemeMode]);

  const setProfileLanguage = useCallback((value) => {
    if (!['pt', 'en', 'fr'].includes(value)) return;
    setLanguage(value);
    localStorage.setItem('pedeja_language', value);
  }, []);

  const startEmailEdit = useCallback(() => {
    if (profileSnapshot?.emailVerified) return;
    setEmailDraft(profileSnapshot?.email || userProfile?.email || '');
    setEmailEditing(true);
  }, [profileSnapshot?.email, profileSnapshot?.emailVerified, userProfile?.email]);

  const saveEmail = useCallback(async () => {
    const email = emailDraft.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setProfileError('Indica um endereço de email válido.');
      return;
    }
    setEmailSaving(true);
    setProfileError('');
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ email });
      if (updateError) throw updateError;
      setProfileSnapshot(prev => ({
        ...prev,
        email: data?.user?.email || email,
        emailVerified: false,
      }));
      setEmailEditing(false);
    } catch (err) {
      console.error('[RiderView] email update', err);
      setProfileError('Não foi possível actualizar o email.');
    } finally {
      setEmailSaving(false);
    }
  }, [emailDraft, supabase]);

  const handleRiderLogout = useCallback(async () => {
    setActionLoading(true);
    try {
      if (handleLogout) {
        await handleLogout();
      } else {
        await supabase.auth.signOut();
      }
      setActiveRole('customer');
    } catch (err) {
      console.error('[RiderView] logout', err);
      setError('Não foi possível terminar a sessão.');
    } finally {
      setActionLoading(false);
    }
  }, [handleLogout, setActiveRole, supabase]);

  const setOnline = async (nextOnline) => {
    if (accountRestricted) {
      setError('A conta não está autorizada a operar entregas neste momento.');
      return;
    }
    // Location is not required to stay available. It only controls whether
    // the rider can receive new delivery offers on the dispatch side.
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
    if (!offer || accountRestricted) return null;
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

  const createRiderMarkerIcon = useCallback(() => {
    const avatarUrl = userProfile?.avatarUrl ? escapeHtml(userProfile.avatarUrl) : '';
    const avatarMarkup = avatarUrl
      ? '<img src="' + avatarUrl + '" alt="" draggable="false" style="display:block;width:54px;height:54px;object-fit:cover;border-radius:50%;" />'
      : '<div style="width:54px;height:54px;border-radius:50%;background:#F7F5FF;display:flex;align-items:center;justify-content:center;color:#6D28D9;"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg></div>';

    const radarMarkup = isOnline && !isBusy
      ? '<span class="pedeja-rider-radar"></span><span class="pedeja-rider-radar pedeja-rider-radar-delay"></span>'
      : '';

    return L.divIcon({
      className: 'pedeja-rider-map-icon',
      html: '<style>' +
        '@keyframes pedeja-rider-radar { 0% { transform:scale(.48); opacity:.34; } 70% { opacity:.10; } 100% { transform:scale(1.42); opacity:0; } }' +
        '.pedeja-rider-map-icon{background:transparent!important;border:0!important;}' +
        '.pedeja-rider-map-icon .pedeja-rider-radar{position:absolute;left:9px;top:9px;width:72px;height:72px;border:2px solid #6D28D9;border-radius:50%;box-sizing:border-box;animation:pedeja-rider-radar 2.6s ease-out infinite;pointer-events:none;}' +
        '.pedeja-rider-map-icon .pedeja-rider-radar-delay{animation-delay:1.3s;}' +
        '</style>' +
        '<div style="width:90px;height:90px;position:relative;background:transparent;">' +
        radarMarkup +
        '<div style="position:absolute;left:18px;top:18px;width:54px;height:54px;border-radius:50%;background:#FFFFFF;border:3px solid #6D28D9;box-shadow:0 2px 8px rgba(38,20,72,.18);display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
        avatarMarkup +
        '</div>' +
        '</div>',
      iconSize: [90, 90],
      iconAnchor: [45, 45],
    });
  }, [isBusy, isOnline, userProfile?.avatarUrl]);

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
    if (riderTab !== 'home' || !map || !gps) return;

    const point = [gps.lat, gps.lng];
    const icon = createRiderMarkerIcon();

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker(point, {
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(map);
    } else {
      riderMarkerRef.current.setLatLng(point);
      riderMarkerRef.current.setIcon(icon);
    }

    map.setView(point, Math.max(map.getZoom(), 15), { animate: true });
  }, [createRiderMarkerIcon, gps, riderTab]);
  const renderAccountState = () => {
    if (!accountRestricted) return null;
    const title = isAccountSuspended ? 'CONTA SUSPENSA' : isAccountDeactivated ? 'CONTA DESACTIVADA' : 'CONTA ENCERRADA';
    const message = isAccountSuspended
      ? 'A tua conta está temporariamente impedida de operar entregas.'
      : isAccountDeactivated
        ? 'O acesso operacional desta conta está desactivado.'
        : 'Esta conta já não pode operar na plataforma.';
    return (
      <div className="absolute inset-x-4 bottom-32 z-30 mx-auto max-w-md rounded-3xl border border-white/90 bg-white/95 p-5 shadow-[0_12px_40px_rgba(38,20,72,0.20)] backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <ShieldAlert size={21} />
          </div>
          <div>
            <p className="text-sm font-black tracking-wide text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">{message}</p>
            <div className="my-4 h-px bg-slate-100" />
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-700">
              {isAccountSuspended ? 'Verificação necessária' : 'Contacta o suporte'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={help} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-800">VER DETALHES</button>
          <button type="button" onClick={help} className="rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white">SUPORTE</button>
        </div>
      </div>
    );
  };

  const renderHome = () => {
    return (
      <div className="relative h-[calc(100dvh-5rem)] min-h-[620px] overflow-hidden bg-[#F7F5FF]">
        <div ref={mapRef} className="absolute inset-0 z-0" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-white/90 via-white/45 to-transparent" />

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => setRiderTab('profile')}
            aria-label="Definições do estafeta"
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
            aria-label="Suporte, SOS e emergência"
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

        {!isBusy && gpsStatus !== 'tracking' && (
          <div className="absolute left-16 right-16 top-20 z-20 flex justify-center">
            <div className="flex max-w-sm items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-left shadow-[0_4px_14px_rgba(120,80,0,0.10)] backdrop-blur">
              <AlertCircle size={15} className="shrink-0 text-amber-700" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-800">
                  {gpsStatus === 'denied' ? 'LOCALIZAÇÃO DESACTIVADA' : !networkOnline ? 'SEM COBERTURA DE REDE' : 'LOCALIZAÇÃO INDISPONÍVEL'}
                </p>
                <p className="text-[10px] leading-tight text-amber-900/75">
                  {gpsStatus === 'denied'
                    ? 'Ativa a localização para receber novas entregas.'
                    : !networkOnline
                      ? 'Não foi possível actualizar a tua localização.'
                      : 'Não foi possível obter a tua localização.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {accountRestricted && renderAccountState()}

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

  const renderProfile = () => {
    const snapshot = profileSnapshot || {};
    const profile = snapshot.profile || {};
    const riderProfile = snapshot.rider || {};
    const activeVehicle = snapshot.vehicle || null;
    const vehicles = Array.isArray(snapshot.vehicles) ? snapshot.vehicles : [];
    const documents = snapshot.documents || {};
    const zone = snapshot.zone || null;

    const verificationLabels = {
      PENDING: 'Em análise',
      UNDER_REVIEW: 'Em verificação',
      VERIFIED: 'Verificado',
      REJECTED: 'Rejeitado',
      SUSPENDED: 'Suspenso',
    };
    const vehicleTypes = {
      MOTORBIKE: 'Mota',
      BICYCLE: 'Bicicleta',
      CAR: 'Carro',
      VAN: 'Carrinha',
      TRUCK: 'Camião',
    };
    const vehicleVerification = verificationLabels[activeVehicle?.verification_status] || 'Pendente';
    const riderVerification = verificationLabels[riderProfile.verification_status] || 'Pendente';

    const Row = ({ children, trailing = true, onClick, disabled = false }) => (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full min-h-14 px-4 py-3 flex items-center justify-between text-left border-b border-slate-100 last:border-b-0 ${disabled ? 'opacity-60' : onClick ? 'active:bg-slate-50' : ''}`}
      >
        <span className="min-w-0">{children}</span>
        {trailing && <ChevronRight size={18} className="shrink-0 text-slate-400" />}
      </button>
    );

    const Toggle = ({ value, onChange, locked = false }) => (
      <button
        type="button"
        onClick={locked ? undefined : onChange}
        disabled={locked || notificationSaving}
        aria-pressed={value}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-violet-700' : 'bg-slate-300'} ${locked ? 'opacity-70' : ''}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    );

    const ThemeChoice = ({ value, label }) => (
      <button
        type="button"
        onClick={() => setProfileTheme(value)}
        className="w-full min-h-12 px-4 flex items-center justify-between border-b border-slate-100 last:border-b-0 text-left"
      >
        <span className="text-sm font-semibold">{label}</span>
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${themeMode === value ? 'border-violet-700' : 'border-slate-300'}`}>
          {themeMode === value && <span className="w-2.5 h-2.5 rounded-full bg-violet-700" />}
        </span>
      </button>
    );

    const LanguageChoice = ({ value, label }) => (
      <button
        type="button"
        onClick={() => setProfileLanguage(value)}
        className="w-full min-h-12 px-4 flex items-center justify-between border-b border-slate-100 last:border-b-0 text-left"
      >
        <span className="text-sm font-semibold">{label}</span>
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${language === value ? 'border-violet-700' : 'border-slate-300'}`}>
          {language === value && <span className="w-2.5 h-2.5 rounded-full bg-violet-700" />}
        </span>
      </button>
    );

    if (profileLoading && !profileSnapshot) {
      return (
        <div className="space-y-3 px-3">
          <div className={`h-36 rounded-3xl animate-pulse ${panel}`} />
          <div className={`h-48 rounded-3xl animate-pulse ${panel}`} />
          <div className={`h-48 rounded-3xl animate-pulse ${panel}`} />
        </div>
      );
    }

    if (profileDetail) {
      const detailTitles = {
        personal: 'Dados pessoais',
        identity: 'Documento de identificação',
        licence: 'Carta de condução',
        vehicles: 'Os meus veículos',
        security: 'Segurança da conta',
        sessions: 'Sessões e dispositivos',
        terms: 'Termos e privacidade',
      };
      const detailTitle = detailTitles[profileDetail] || 'Perfil';
      const mask = (value) => {
        const text = String(value || '');
        if (text.length < 5) return text || '—';
        return `${text.slice(0, 3)}••••${text.slice(-2)}`;
      };
      return (
        <div className="space-y-4 px-3 pb-28 h-[calc(100dvh-1px)] overflow-y-auto touch-pan-y overscroll-contain">
          <button type="button" onClick={() => setProfileDetail(null)} className="flex items-center gap-2 py-2 text-sm font-bold text-violet-700">
            <ArrowLeft size={18} /> Perfil
          </button>
          <section className={`rounded-3xl border overflow-hidden ${panel}`}>
            <div className="px-4 py-5 border-b border-slate-100">
              <p className="font-black text-xl">{detailTitle}</p>
            </div>
            {profileDetail === 'personal' && <>
              <Row trailing={false}><p className="font-semibold">Nome completo</p><p className={`text-sm mt-1 ${muted}`}>{profile.full_name || '—'}</p></Row>
              <Row trailing={false}><p className="font-semibold">Telefone</p><p className={`text-sm mt-1 ${muted}`}>{profile.phone || '—'}</p></Row>
              <Row trailing={false}><p className="font-semibold">Estado de verificação</p><p className="text-sm mt-1 text-violet-700 font-bold">{riderVerification}</p></Row>
            </>}
            {profileDetail === 'identity' && <>
              <Row trailing={false}><p className="font-semibold">Estado</p><p className="text-sm mt-1 text-violet-700 font-bold">{verificationLabels[documents.identity?.status] || 'Não disponível'}</p></Row>
              <Row trailing={false}><p className="font-semibold">Número</p><p className={`text-sm mt-1 ${muted}`}>{mask(documents.identity?.document_number)}</p></Row>
            </>}
            {profileDetail === 'licence' && <>
              <Row trailing={false}><p className="font-semibold">Estado</p><p className="text-sm mt-1 text-violet-700 font-bold">{verificationLabels[documents.driving_license?.status] || 'Não disponível'}</p></Row>
              <Row trailing={false}><p className="font-semibold">Número</p><p className={`text-sm mt-1 ${muted}`}>{mask(documents.driving_license?.document_number)}</p></Row>
            </>}
            {profileDetail === 'vehicles' && (vehicles.length ? vehicles.map((vehicle) => (
              <Row key={vehicle.id} trailing={false}>
                <p className="font-semibold">{vehicleTypes[vehicle.vehicle_type] || vehicle.vehicle_type}</p>
                <p className={`text-sm mt-1 ${muted}`}>{[vehicle.registration_number, vehicle.make, vehicle.model].filter(Boolean).join(' · ') || 'Sem detalhes'}</p>
                <p className="text-xs mt-1 text-violet-700 font-bold">{vehicle.status === 'ACTIVE' ? 'Actual' : verificationLabels[vehicle.verification_status] || 'Pendente'}</p>
              </Row>
            )) : <div className="px-4 py-6 text-sm text-slate-500">Ainda não existem veículos registados.</div>)}
            {profileDetail === 'security' && <>
              <Row trailing={false}><p className="font-semibold">Telefone</p><p className={`text-sm mt-1 ${muted}`}>Verificado através da autenticação Pedejá</p></Row>
              <Row trailing={false}><p className="font-semibold">Email</p><p className={`text-sm mt-1 ${muted}`}>{snapshot.email ? (snapshot.emailVerified ? 'Verificado' : 'Não verificado') : 'Não configurado'}</p></Row>
            </>}
            {profileDetail === 'sessions' && <div className="px-4 py-6 text-sm text-slate-500">A gestão de sessões e dispositivos será ligada ao controlo de sessões do Supabase Auth.</div>}
            {profileDetail === 'terms' && <>
              <Row trailing={false}><p className="font-semibold">Termos de serviço</p><p className={`text-sm mt-1 ${muted}`}>Versão apresentada no processo de adesão</p></Row>
              <Row trailing={false}><p className="font-semibold">Privacidade</p><p className={`text-sm mt-1 ${muted}`}>Política de privacidade Pedejá</p></Row>
            </>}
          </section>
        </div>
      );
    }

    return (
      <div className="space-y-5 px-3 pb-28 h-[calc(100dvh-1px)] overflow-y-auto touch-pan-y overscroll-contain">
        {profileError && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            {profileError}
          </div>
        )}

        <section className={`rounded-3xl border p-5 ${panel}`}>
          <div className="flex items-center gap-4">
            {profile.avatar_url || userProfile?.avatarUrl ? (
              <img src={profile.avatar_url || userProfile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-white shadow" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
                <User size={30} />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-black text-xl truncate">{profile.full_name || userProfile?.name || 'Estafeta'}</p>
              <p className={`text-sm mt-1 ${muted}`}>{profile.phone || userProfile?.phone || '—'}</p>
              <p className="text-xs font-bold text-violet-700 mt-2">{riderVerification}</p>
            </div>
          </div>
        </section>

        <section className={`rounded-3xl border overflow-hidden ${panel}`}>
          <p className="px-4 pt-5 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">A MINHA CONTA</p>
          <Row onClick={() => setProfileDetail('personal')}><p className="font-semibold">Dados pessoais</p></Row>
          <Row onClick={() => setProfileDetail('identity')}><p className="font-semibold">Documento de identificação</p><p className={`text-xs mt-1 ${muted}`}>{verificationLabels[documents.identity?.status] || 'Não disponível'}</p></Row>
          <Row onClick={() => setProfileDetail('licence')}><p className="font-semibold">Carta de condução</p><p className={`text-xs mt-1 ${muted}`}>{verificationLabels[documents.driving_license?.status] || 'Não disponível'}</p></Row>
          {emailEditing ? (
            <div className="px-4 py-4 border-b border-slate-100">
              <p className="font-semibold mb-2">Email</p>
              <input
                type="email"
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                placeholder="nome@exemplo.com"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <p className="text-xs text-slate-500 mt-2">Será enviado um link de verificação para o novo email.</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={saveEmail} disabled={emailSaving} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">
                  {emailSaving ? 'A guardar…' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setEmailEditing(false)} disabled={emailSaving} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <Row onClick={profileSnapshot?.emailVerified ? undefined : startEmailEdit}>
              <p className="font-semibold">Email</p>
              <p className={`text-xs mt-1 ${profileSnapshot?.emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {snapshot.email || userProfile?.email || 'Adicionar email'} · {profileSnapshot?.emailVerified ? 'Verificado' : 'Não verificado · Editar'}
              </p>
            </Row>
          )}
        </section>

        <section className={`rounded-3xl border overflow-hidden ${panel}`}>
          <p className="px-4 pt-5 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">VEÍCULO</p>
          {activeVehicle ? (
            <>
              <div className="px-4 py-4 border-b border-slate-100">
                <p className="text-xs text-slate-400">Veículo actual</p>
                <p className="font-black text-lg mt-1">{vehicleTypes[activeVehicle.vehicle_type] || activeVehicle.vehicle_type}</p>
                <p className={`text-sm mt-1 ${muted}`}>{activeVehicle.registration_number || 'Sem matrícula'}</p>
              </div>
              <Row trailing={false}>
                <p className="font-semibold">Matrícula</p><p className={`text-sm mt-1 ${muted}`}>{activeVehicle.registration_number || '—'}</p>
              </Row>
              <Row trailing={false}>
                <p className="font-semibold">Marca / modelo</p><p className={`text-sm mt-1 ${muted}`}>{[activeVehicle.make, activeVehicle.model].filter(Boolean).join(' / ') || '—'}</p>
              </Row>
              <Row trailing={false}>
                <p className="font-semibold">Cor</p><p className={`text-sm mt-1 ${muted}`}>{activeVehicle.color || '—'}</p>
              </Row>
              <Row trailing={false}>
                <p className="font-semibold">Documento do veículo</p><p className={`text-sm mt-1 ${muted}`}>{activeVehicle.document_storage_path ? 'Recebido' : 'Não disponível'}</p>
              </Row>
              <Row trailing={false}>
                <p className="font-semibold">Estado de verificação</p><p className="text-sm mt-1 text-violet-700 font-bold">{vehicleVerification}</p>
              </Row>
            </>
          ) : (
            <div className="px-4 py-5 text-sm text-slate-500 border-b border-slate-100">Ainda não existe um veículo activo.</div>
          )}
          <Row onClick={() => setProfileDetail('vehicles')}>
            <p className="font-semibold">Os meus veículos</p><p className={`text-xs mt-1 ${muted}`}>{vehicles.length} registado(s)</p>
          </Row>
          <Row onClick={() => setProfileError('Adicionar veículos será ligado ao fluxo de aprovação de veículos.') }>
            <p className="font-semibold">Adicionar veículo</p>
          </Row>
        </section>

        <section className={`rounded-3xl border overflow-hidden ${panel}`}>
          <p className="px-4 pt-5 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">OPERAÇÃO</p>
          <Row trailing={false}>
            <p className="font-semibold">Zona de operação</p>
            <p className={`text-sm mt-1 ${muted}`}>{zone ? [zone.name, zone.province].filter(Boolean).join(' · ') : 'Não atribuída'}</p>
          </Row>
        </section>

        <section className={`rounded-3xl border overflow-hidden ${panel}`}>
          <p className="px-4 pt-5 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">NOTIFICAÇÕES & PREFERÊNCIAS</p>
          <div className="min-h-14 px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <span className="font-semibold">Novas entregas</span>
            <Toggle value={Boolean(profile.is_offer_notification)} onChange={() => updateNotificationPreferences('newOffers', !profile.is_offer_notification)} />
          </div>
          <div className="min-h-14 px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <span className="font-semibold">Estado das entregas</span>
            <Toggle value={Boolean(profile.is_delivery_status_notification)} onChange={() => updateNotificationPreferences('deliveryStatus', !profile.is_delivery_status_notification)} />
          </div>
          <div className="min-h-14 px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <span className="font-semibold">Ganhos e pagamentos</span>
            <Toggle value={Boolean(profile.is_payment_notification)} onChange={() => updateNotificationPreferences('earnings', !profile.is_payment_notification)} />
          </div>
          <div className="min-h-14 px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <span className="font-semibold">Avisos importantes</span>
            <Toggle value locked />
          </div>
          <div className="pt-2">
            <p className="px-4 pt-3 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">IDIOMA</p>
            <LanguageChoice value="pt" label="Português" />
            <LanguageChoice value="en" label="English" />
            <LanguageChoice value="fr" label="Français" />
          </div>
          <div className="pt-2">
            <p className="px-4 pt-3 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">APARÊNCIA</p>
            <ThemeChoice value="system" label="Sistema" />
            <ThemeChoice value="dark" label="Modo escuro" />
            <ThemeChoice value="light" label="Modo claro" />
          </div>
        </section>

        <section className={`rounded-3xl border overflow-hidden ${panel}`}>
          <p className="px-4 pt-5 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">SEGURANÇA</p>
          <Row onClick={() => setProfileDetail('security')}><p className="font-semibold">Segurança da conta</p></Row>
          <Row onClick={() => setProfileDetail('sessions')}><p className="font-semibold">Sessões e dispositivos</p></Row>
          <Row onClick={() => setProfileDetail('terms')}><p className="font-semibold">Termos e privacidade</p></Row>
        </section>

        <div className="space-y-2 pt-1">
          <button type="button" onClick={handleRiderLogout} disabled={actionLoading} className="w-full rounded-2xl border border-slate-200 bg-white p-4 font-black text-slate-700">
            SAIR
          </button>
          <button type="button" disabled className="w-full p-3 text-sm font-bold text-red-600 opacity-60">
            APAGAR A MINHA CONTA
          </button>
          <p className="text-center text-xs text-slate-400">Pedejá v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0'}</p>
        </div>
      </div>
    );
  };


  let content = null;
  if (accountRestricted) {
    content = renderHome();
  } else if (loading) {
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
