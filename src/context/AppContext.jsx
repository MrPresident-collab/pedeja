import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  INITIAL_CONFIG, INITIAL_RESTAURANTS, INITIAL_RIDERS, INITIAL_MENU_ITEMS,
  ADMIN_EMAIL, PEDEJA_SERVICE_TYPES,
} from '../constants';
import { generateId, getDistanceFromLatLonInKm, playNotificationSound, playOrderNotificationSound, initPushNotifications } from '../utils';
import { supabase } from '../lib/supabase';

import { useCarteiraActions }  from './hooks/usecarteiraActions';
import { useOrderActions }   from './hooks/useOrderActions';
import { useAdminActions }   from './hooks/useAdminActions';
import { usePhotoHandlers }  from './hooks/usePhotoHandlers';
import { useRegistration }   from './hooks/useRegistration';
import { usePromoActions }   from './hooks/usePromoActions';

const AppContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  // --- Theme State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('pedeja_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('pedeja_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  // --- Role & Navigation ---
  const [activeRole, setActiveRole] = useState('customer');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [merchantTab, setMerchantTab] = useState('orders');
  const [riderTab, setRiderTab] = useState('jobs');
  const [activeTab, setActiveTab] = useState('home');
  const [profileSubView, setProfileSubView] = useState('main');
  const [serviceType, setServiceType] = useState(PEDEJA_SERVICE_TYPES.FOME);

  // --- Data State ---
  const [orders, setOrders] = useState([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [appConfig, setAppConfig] = useState(INITIAL_CONFIG);
  const [restaurants, setRestaurants] = useState(INITIAL_RESTAURANTS);
  const [riders, setRiders] = useState(INITIAL_RIDERS);
  const [menuItems, setMenuItems] = useState(INITIAL_MENU_ITEMS);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ phone: '', email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ phone: '', email: '', password: '', confirmPassword: '', name: '' });
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);

  // --- User Profile State ---
  const [userProfile, setUserProfile] = useState({
    id: '', name: '', phone: '', email: '', location: null,
  });
  const [userRoles, setUserRoles] = useState(['customer']);
  const [userAddresses, setUserAddresses] = useState([]);
  const [usercarteira, setUsercarteira] = useState(0);
  const [walletAllEntries, setcarteiraAllEntries] = useState([]);
  const [walletClearedAt, setcarteiraClearedAt] = useState(null);
  const walletHistory = useMemo(() => {
    if (!walletClearedAt) return walletAllEntries;
    const ms = walletClearedAt instanceof Date ? walletClearedAt.getTime() : 0;
    return walletAllEntries.filter(e => (e.createdAtMs || 0) > ms);
  }, [walletAllEntries, walletClearedAt]);

  // --- Cart & Order State ---
  const [cart, setCart] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [parcelDetails, setParcelDetails] = useState({ pickup: '', dropoff: '', weight: '1', distance: 0, receiverName: '', receiverPhone: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // --- Form & Modal State ---
  const [newAddr, setNewAddr] = useState({ label: 'Casa', addressLine1: '', addressLine2: '', neighborhood: '', municipality: '', city: '', province: '', reference: '', latitude: null, longitude: null, location: null });
  const [withdrawMode, setWithdrawMode] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [tempProfile, setTempProfile] = useState({ id: '', name: '', phone: '', email: '', location: null });
  const [editConfig, setEditConfig] = useState(INITIAL_CONFIG);
  const [isConfigDirty, setIsConfigDirtyState] = useState(false);
  const isConfigDirtyRef = useRef(false);
  const setIsConfigDirty = useCallback((val) => {
    const nextVal = typeof val === 'function' ? val(isConfigDirtyRef.current) : val;
    isConfigDirtyRef.current = nextVal;
    setIsConfigDirtyState(nextVal);
  }, []);
  const [isEditingMenu, setIsEditingMenu] = useState(null);
  const [editingShop, setEditingShop] = useState(null);
  const [shopEditForm, setShopEditForm] = useState({});
  const [editForm, setEditForm] = useState({ name: '', price: '', desc: '', image: '' });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestToReject, setSelectedRequestToReject] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // --- TopUp Modal ---
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpSlip, setTopUpSlip] = useState(null);

  // --- Rating Modal ---
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingOrderData, setRatingOrderData] = useState(null);

  // --- Chat State ---
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState({});

  // --- Parcel Map State ---
  const [parcelMapTarget, setParcelMapTarget] = useState(null);
  const [parcelDistance, setParcelDistance] = useState(0);
  const [parcelEstimate, setParcelEstimate] = useState(0);

  // --- Toast State ---
  const [toasts, setToasts] = useState([]);

  // --- Admin Derived ---
  const isAdmin = userRoles.includes('admin');

  // --- Refs ---
  const currentUserRef = React.useRef(null);
  const fetchAppDataPromiseRef = useRef(null);
  const fetchAppDataAuthKeyRef = useRef(null);
  const loadUserSessionPromisesRef = useRef(new Map());
  const lastLoadedAuthUserIdRef = useRef(null);
  const lastcarteiraHistorySyncAtRef = useRef(0);
  const persistedProfileRef = useRef(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const seenOrderIdsRef         = React.useRef(new Set());
  const placingOrderRef         = React.useRef(false);
  const pendingLocalOrderIdsRef = React.useRef(new Set());
  const lastChatCountsRef       = React.useRef({});
  const prevOrdersRef           = React.useRef([]);
  const gpsSessionRef           = React.useRef('');
  const shownAdminNotifIds      = React.useRef(new Set());
  const pushTokenRef            = React.useRef('');
  const isClearingAuthRef       = React.useRef(false);

  // --- Global carteira Store (in-memory cache for all wallets) ---
  const [globalcarteiras, setGlobalcarteiras] = useState({});

  // --- Global User Roles Store ---
  const [globalUserRoles, setGlobalUserRoles] = useState({});

  // --- Toast / Notification ---
  const notifySystem = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    playNotificationSound('order');
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- Admin notification → Supabase insert ---
  const notifyAdmin = useCallback((title, message, type = 'warning') => {
    const signature = `${title}:${message}`;
    supabase.rpc('create_admin_notification', {
      p_title: title,
      p_message: message,
      p_type: type,
    }).then(({ error }) => {
      if (error) console.error('notifyAdmin error', error);
    });
    if (isAdmin) {
      shownAdminNotifIds.current.add(signature);
      notifySystem(title, message, type);
    }
  }, [isAdmin]);  

  // --- Role grant / revoke ---
  const grantRole = useCallback(async (userId, role) => {
    setGlobalUserRoles(prev => {
      const cur = prev[userId] || ['customer'];
      if (cur.includes(role)) return prev;
      return { ...prev, [userId]: [...cur, role] };
    });
    if (currentUser?.id === userId || userProfile?.id === userId) {
      setUserRoles(prev => prev.includes(role) ? prev : [...prev, role]);
    }
    const { error } = await supabase.rpc('admin_set_user_role', {
      p_user_id: userId,
      p_role: role,
      p_enabled: true,
    });
    if (error) {
      console.error('grantRole error', error);
      setGlobalUserRoles(prev => ({
        ...prev,
        [userId]: (prev[userId] || ['customer']).filter(r => r !== role),
      }));
      if (currentUser?.id === userId || userProfile?.id === userId) {
        setUserRoles(prev => prev.filter(r => r !== role));
      }
      notifySystem('Não foi possível', 'Sem permissão para alterar o papel do utilizador', 'error');
      return false;
    }
    return true;
  }, [currentUser?.id, userProfile?.id]);  

  const revokeRole = useCallback(async (userId, role) => {
    setGlobalUserRoles(prev => {
      const cur = prev[userId] || ['customer'];
      return { ...prev, [userId]: cur.filter(r => r !== role) };
    });
    if (currentUser?.id === userId || userProfile?.id === userId) {
      setUserRoles(prev => prev.filter(r => r !== role));
    }
    const { error } = await supabase.rpc('admin_set_user_role', {
      p_user_id: userId,
      p_role: role,
      p_enabled: false,
    });
    if (error) {
      console.error('revokeRole error', error);
      setGlobalUserRoles(prev => {
        const cur = prev[userId] || ['customer'];
        return { ...prev, [userId]: cur.includes(role) ? cur : [...cur, role] };
      });
      if (currentUser?.id === userId || userProfile?.id === userId) {
        setUserRoles(prev => prev.includes(role) ? prev : [...prev, role]);
      }
      notifySystem('Não foi possível', 'Sem permissão para alterar o papel do utilizador', 'error');
      return false;
    }
    return true;
  }, [currentUser?.id, userProfile?.id]);  

  // ── Fetch current user wallet from Supabase ─────────────────────────────
  const fetchUsercarteira = useCallback(async (targetUid) => {
    void targetUid;
    // The live financial model is payments + ledger RPCs, not a client-readable
    // wallets table. Leave the legacy wallet UI unchanged but never query a
    // table that does not exist.
  }, []);

  // ── carteira hook ─────────────────────────────────────────────────────────────
  const { creditcarteira, creditcarteiraLocal, processTransaction, requestTopUp, requestWithdraw, adminAdjustcarteira } = useCarteiraActions({
    currentUser, currentUserRef,
    userProfile, usercarteira, pendingRequests,
    setUsercarteira, setcarteiraAllEntries, setGlobalcarteiras, setPendingRequests,
    setShowTopUpModal, setTopUpSlip,
    setWithdrawAmount, setWithdrawBank, setWithdrawAccount, setWithdrawName, setWithdrawMode,
    notifySystem, notifyAdmin,
    supabase,
  });

  // ── Order hook ──────────────────────────────────────────────────────────────
  const {
    calculateDeliveryFee, calculateRideFee, calculateFoodTotal, isPending, hasPendingCancelRequest,
    addToCart, placeOrder, placeParcelOrder, placeRideOrder, placeServiceOrder, acceptOrder, updateOrderStatus,
    initiateCancelOrder, confirmCancelOrder, cancelOrderDirectly,
    requestCancelOrder, requestCancelByRole,
  } = useOrderActions({
    orders, setOrders,
    cart, setCart,
    restaurants, riders, appConfig,
    currentUser, userProfile, userAddresses, userWallet: usercarteira,
    parcelDetails, setParcelDetails,
    parcelDistance, parcelEstimate,
    paymentMethod, setPaymentMethod,
    pendingRequests, setPendingRequests,
    selectedOrderToCancel, setSelectedOrderToCancel,
    cancelReasonInput, setCancelReasonInput,
    setShowCancelModal,
    setSelectedRestaurant, setActiveTab,
    setParcelMapTarget, setParcelEstimate, setParcelDistance,
    placingOrderRef, pendingLocalOrderIdsRef,
    creditcarteira, creditcarteiraLocal, processTransaction, setUsercarteira, fetchUsercarteira,
    seenOrderIdsRef,
    notifySystem, notifyAdmin,
    supabase,
  });

  // ── Admin hook ──────────────────────────────────────────────────────────────
  const {
    handleApproveRequest, initiateRejectRequest, confirmRejectRequest,
    adminBanUser, toggleRestaurantStatus, toggleRiderBan, saveShopEdit, deleteRestaurant,
  } = useAdminActions({
    orders, setOrders,
    riders, setRiders,
    restaurants, setRestaurants,
    menuItems, setMenuItems,
    pendingRequests, setPendingRequests,
    globalcarteiras, setGlobalcarteiras,
    editingShop, shopEditForm, setEditingShop,
    selectedRequestToReject, setSelectedRequestToReject,
    setShowRejectModal,
    creditcarteira, creditcarteiraLocal, grantRole,
    notifySystem,
    supabase,
  });

  // ── Photo handlers hook ─────────────────────────────────────────────────
  const {
    profileUploading,
    handleProfilePhotoChange, handleShopPhotoChange, handleRegistrationPhotoSelect,
    handleTopUpSlipSelect, handleMenuPhotoSelect, openImagePreview,
  } = usePhotoHandlers({
    currentUser, userProfile, restaurants, isEditingMenu,
    setTempProfile, setRestaurants, setEditForm, setTopUpSlip,
    setShowImageModal, setPreviewImageUrl,
    notifySystem,
  });

  // ── Registration hook ───────────────────────────────────────────────────
  const {
    merchantRegForm, setMerchantRegForm,
    riderRegForm, setRiderRegForm,
    requestRegisterMerchant, requestRegisterRider,
  } = useRegistration({
    currentUser, userProfile, userRoles,
    restaurants, isPending,
    setPendingRequests,
    grantRole,
    notifySystem, notifyAdmin,
    supabase,
  });

  // ── Promo actions hook ──────────────────────────────────────────────────
  const {
    promoCodes, setPromoCodes,
    validatePromoCode, applyPromoCode, createPromoCode, togglePromoCode, deletePromoCode,
  } = usePromoActions({ notifySystem, supabase });

  // ── Register this native device for authenticated background push ────────
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let cleanup = () => {};
    let cancelled = false;
    initPushNotifications({
      onToken: async (token) => {
        if (cancelled || !token) return;
        pushTokenRef.current = token;
        const { error } = await supabase.rpc('register_push_device', {
          p_token: token,
          p_platform: 'android',
        });
        if (error) console.error('Push device registration failed:', error.message);
      },
      onAction: (data) => {
        if (!data) return;
        if (data.type === 'new_job') {
          setActiveRole('rider');
          setRiderTab('jobs');
        } else if (data.type === 'new_order') {
          setActiveRole('merchant');
          setMerchantTab('orders');
        } else if (data.type === 'admin_alert') {
          setActiveRole('admin');
          setAdminTab('dashboard');
        } else if (data.type === 'order_status' || data.orderId) {
          setActiveRole('customer');
          setActiveTab('activity');
        }
      },
    }).then(fn => {
      if (cancelled) fn?.();
      else cleanup = fn || (() => {});
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [currentUser?.id]);

  // ── Realtime listener for app_config synchronization across sessions ─────
  useEffect(() => {
    const channel = supabase
      .channel('app_config-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, payload => {
        if (payload.new && payload.new.data) {
          setAppConfig(prev => ({ ...INITIAL_CONFIG, ...prev, ...payload.new.data }));
          if (!isConfigDirtyRef.current) {
            setEditConfig(prev => ({ ...INITIAL_CONFIG, ...prev, ...payload.new.data }));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Centralized fetch app data from Supabase ──────────────────────────
  const fetchAppData = useCallback((authKey = currentUserRef.current?.id || null) => {
    if (fetchAppDataPromiseRef.current) {
      if (fetchAppDataAuthKeyRef.current === authKey) return fetchAppDataPromiseRef.current;
      return fetchAppDataPromiseRef.current.then(() => fetchAppData(authKey));
    }

    fetchAppDataAuthKeyRef.current = authKey;
    const promise = Promise.resolve().then(async () => {
      setIsDataLoading(true);
      try {
        // The live Supabase schema is the source of truth. Do not query the
        // retired BoomRider JSON tables (restaurants/menu_items/orders.data).
        const [businessesResult, productsResult, ridersResult, ordersResult, orderItemsResult] = await Promise.all([
          supabase
            .from('businesses')
            .select('id, name, description, status, address_id, marketplace_category, created_by'),
          supabase
            .from('products')
            .select('id, business_id, sku, name, description, image_url, price, currency_code, status, sort_order')
            .order('sort_order', { ascending: true }),
          supabase
            .from('riders')
            .select('id, user_id, availability_status, current_location, last_location_at'),
          supabase
            .from('orders')
            .select('id, customer_id, business_id, status, payment_status, currency_code, subtotal, delivery_fee, service_fee, discount_amount, total_amount, delivery_address_id, delivery_address_line_1, delivery_address_line_2, delivery_neighborhood, delivery_municipality, delivery_city, delivery_province, delivery_country_code, recipient_name, recipient_phone, delivery_instructions, customer_note, placed_at, accepted_at, delivered_at, cancelled_at, created_at, updated_at, payment_method, order_reference')
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('order_items')
            .select('id, order_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total'),
        ]);

        if (businessesResult.error) throw businessesResult.error;
        if (productsResult.error) throw productsResult.error;
        if (ridersResult.error) throw ridersResult.error;
        if (ordersResult.error) throw ordersResult.error;
        if (orderItemsResult.error) throw orderItemsResult.error;

        const addressIds = (businessesResult.data || []).map(b => b.address_id).filter(Boolean);
        let addressMap = new Map();
        if (addressIds.length) {
          const { data: addresses, error: addressesError } = await supabase
            .from('addresses')
            .select('id, address_line_1, address_line_2, neighborhood, municipality, city, province, country_code')
            .in('id', addressIds);
          if (addressesError) throw addressesError;
          addressMap = new Map((addresses || []).map(a => [a.id, a]));
        }

        const rows = (businessesResult.data || []).map(b => {
          const address = addressMap.get(b.address_id);
          const category = b.marketplace_category || 'comida';
          return {
            id: b.id,
            name: b.name,
            description: b.description || '',
            ownerId: b.created_by || null,
            category,
            serviceType: category === 'comida' ? PEDEJA_SERVICE_TYPES.FOME : PEDEJA_SERVICE_TYPES.COMPRAS,
            status: b.status === 'ACTIVE' ? 'open' : 'closed',
            image: '',
            rating: 5,
            ratingCount: 0,
            featured: false,
            time: '30-45 min',
            deliveryTimeMin: 30,
            deliveryTimeMax: 45,
            location: address?.location || null,
            address: address ? [address.address_line_1, address.address_line_2, address.neighborhood, address.municipality, address.city].filter(Boolean).join(', ') : '',
            priceLabel: '$$',
          };
        });
        setRestaurants(rows);

        const productMap = {};
        (productsResult.data || []).forEach(p => {
          const item = {
            id: p.id,
            businessId: p.business_id,
            restaurantId: p.business_id,
            sku: p.sku,
            name: p.name,
            description: p.description || '',
            price: Number(p.price || 0),
            image: p.image_url || '',
            available: p.status === 'ACTIVE',
            category: '',
            options: [],
          };
          if (!productMap[p.business_id]) productMap[p.business_id] = [];
          productMap[p.business_id].push(item);
        });
        setMenuItems(productMap);

        const riderRows = (ridersResult.data || []).map(r => ({
          id: r.id,
          userId: r.user_id,
          status: r.availability_status,
          availabilityStatus: r.availability_status,
          location: null,
          lastLocationAt: r.last_location_at || null,
        }));
        setRiders(riderRows);

        const itemsByOrder = new Map();
        (orderItemsResult.data || []).forEach(item => {
          const list = itemsByOrder.get(item.order_id) || [];
          list.push({
            id: item.product_id || item.id,
            name: item.product_name_snapshot,
            price: Number(item.unit_price_snapshot || 0),
            qty: item.quantity,
            quantity: item.quantity,
            lineTotal: Number(item.line_total || 0),
            sku: item.sku_snapshot || null,
          });
          itemsByOrder.set(item.order_id, list);
        });

        const businessNameById = new Map((businessesResult.data || []).map(b => [b.id, b.name]));
        const statusMap = {
          DRAFT: 'pending', PENDING_PAYMENT: 'pending', PAID: 'pending', ACCEPTED: 'accepted',
          PREPARING: 'preparing', READY: 'ready_to_pickup', ASSIGNED: 'rider_accepted',
          PICKED_UP: 'picking_up', DELIVERING: 'delivering', DELIVERED: 'delivered',
          CANCELLED: 'cancelled', FAILED: 'cancelled',
        };
        const liveOrders = (ordersResult.data || []).map(o => ({
          id: o.id,
          orderReference: o.order_reference,
          type: 'food',
          customerId: o.customer_id,
          businessId: o.business_id,
          restaurantId: o.business_id,
          restaurantName: businessNameById.get(o.business_id) || 'Comerciante',
          status: statusMap[o.status] || String(o.status || '').toLowerCase(),
          paymentStatus: o.payment_status,
          paymentMethod: String(o.payment_method || 'CASH').toLowerCase(),
          currency: o.currency_code || 'AOA',
          subtotal: Number(o.subtotal || 0),
          deliveryFee: Number(o.delivery_fee || 0),
          serviceFee: Number(o.service_fee || 0),
          discount: Number(o.discount_amount || 0),
          total: Number(o.total_amount || 0),
          totalAmount: Number(o.total_amount || 0),
          items: itemsByOrder.get(o.id) || [],
          location: null,
          deliveryAddress: [o.delivery_address_line_1, o.delivery_address_line_2, o.delivery_neighborhood, o.delivery_municipality, o.delivery_city, o.delivery_province].filter(Boolean).join(', '),
          recipientName: o.recipient_name || '',
          recipientPhone: o.recipient_phone || '',
          notes: o.customer_note || o.delivery_instructions || '',
          createdAt: o.created_at,
          placedAt: o.placed_at,
          acceptedAt: o.accepted_at,
          deliveredAt: o.delivered_at,
          cancelledAt: o.cancelled_at,
          rated: false,
        }));
        setOrders(liveOrders);
        setTotalOrdersCount(liveOrders.length);

        // These retired client-owned stores do not exist in the live schema.
        // Keep the corresponding UI state empty/default until their live
        // command/query contracts are wired.
        setPendingRequests([]);
        setPromoCodes([]);
      } catch (e) {
        console.error('fetchAppData error:', e);
      } finally {
        setIsDataLoading(false);
        fetchAppDataPromiseRef.current = null;
        fetchAppDataAuthKeyRef.current = null;
      }
    });
    fetchAppDataPromiseRef.current = promise;
    return promise;
  }, [setPromoCodes]);

  // ── Supabase Auth session + onAuthStateChange ───────────────────────────
  const clearAuthStorageKeys = useCallback(() => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Error clearing auth keys from storage:', e);
    }
  }, []);

  const clearDebounceTimers = useCallback(() => {
    if (debounceRef.current) {
      Object.keys(debounceRef.current).forEach(key => {
        clearTimeout(debounceRef.current[key]);
      });
      debounceRef.current = {};
    }
  }, []);

  const isInvalidTokenError = useCallback((error) => {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    const code = (error.code || '').toLowerCase();
    const status = error.status;
    return (
      msg.includes('invalid refresh token') ||
      msg.includes('refresh_token_not_found') ||
      msg.includes('refresh token not found') ||
      msg.includes('invalid_grant') ||
      msg.includes('jwt expired') ||
      msg.includes('token is expired') ||
      code.includes('refresh_token_not_found') ||
      code.includes('invalid_grant') ||
      status === 400 ||
      status === 401
    );
  }, []);

  const handleAuthErrorOrSignOut = useCallback(async () => {
    if (isClearingAuthRef.current) return;
    isClearingAuthRef.current = true;
    clearDebounceTimers();
    try {
      if (pushTokenRef.current) {
        await supabase.rpc('disable_push_device', { p_token: pushTokenRef.current }).catch(() => {});
        pushTokenRef.current = '';
      }
      await supabase.auth.signOut().catch(() => {});
    } finally {
      clearAuthStorageKeys();
      lastLoadedAuthUserIdRef.current = null;
      lastcarteiraHistorySyncAtRef.current = 0;
      persistedProfileRef.current = null;
      setIsLoggedIn(false);
      setCurrentUser(null);
      setUserProfile({ id: '', name: '', phone: '', email: '', location: null });
      setTempProfile({ id: '', name: '', phone: '', email: '', location: null });
      setUserRoles(['customer']);
      setUsercarteira(0);
      setcarteiraAllEntries([]);
      setUserAddresses([]);
      setActiveRole('customer');
      setActiveTab('home');
      setProfileSubView('main');
      setAuthMode('login');
      prevOrdersRef.current = [];
      lastChatCountsRef.current = {};
      gpsSessionRef.current = '';
      isClearingAuthRef.current = false;
    }
  }, [clearAuthStorageKeys, clearDebounceTimers]);

  const loadUserSession = useCallback((authUser) => {
    if (!authUser?.id) return Promise.resolve();
    const existingPromise = loadUserSessionPromisesRef.current.get(authUser.id);
    if (existingPromise) return existingPromise;

    const promise = Promise.resolve().then(async () => {
      try {
        const [profileResult, customerAddressesResult] = await Promise.all([
          supabase.from('profiles').select('id, full_name, phone, avatar_url, account_status').eq('id', authUser.id).maybeSingle(),
          supabase.from('customer_addresses').select('address_id, label, recipient_name, recipient_phone, delivery_instructions, is_default').eq('customer_id', authUser.id),
        ]);

        if (customerAddressesResult.error) throw customerAddressesResult.error;

        const profile = profileResult.data || {};
        const mergedRoles = ['customer'];

        const prof = {
          id: authUser.id,
          name: profile.full_name || '',
          phone: profile.phone || '',
          email: authUser.email || '',
          location: null,
          image: profile.avatar_url || null,
        };

        const addressIds = (customerAddressesResult.data || []).map(row => row.address_id).filter(Boolean);
        let addressRows = [];
        if (addressIds.length) {
          const { data, error } = await supabase
            .from('addresses')
            .select('id, address_line_1, address_line_2, neighborhood, municipality, city, province, country_code, location')
            .in('id', addressIds);
          if (error) throw error;
          const addressMap = new Map((data || []).map(row => [row.id, row]));
          const toLocation = value => {
            if (value?.type === 'Point' && Array.isArray(value.coordinates)) {
              return { lat: Number(value.coordinates[1]), lng: Number(value.coordinates[0]) };
            }
            if (typeof value === 'string') {
              const match = value.match(/POINT\\s*\\(\\s*(-?[0-9.]+)\\s+(-?[0-9.]+)\\s*\\)/i);
              if (match) return { lat: Number(match[2]), lng: Number(match[1]) };
            }
            return null;
          };
          addressRows = (customerAddressesResult.data || []).map(row => {
            const address = addressMap.get(row.address_id);
            return {
              id: row.address_id,
              label: row.label,
              address: address ? [address.address_line_1, address.address_line_2, address.neighborhood, address.municipality, address.city, address.province].filter(Boolean).join(', ') : '',
              location: toLocation(address?.location),
              deliveryInstructions: row.delivery_instructions || '',
              recipientName: row.recipient_name || '',
              recipientPhone: row.recipient_phone || '',
              isDefault: row.is_default,
            };
          });
        }
        const addresses = addressRows;
        persistedProfileRef.current = profileResult.error || !profileResult.data ? null : {
          userId: authUser.id,
          signature: JSON.stringify({
            name: prof.name, phone: prof.phone, avatar: prof.image || null,
            location: prof.location, addresses,
          }),
        };
        setCurrentUser({ id: authUser.id, email: authUser.email, ...profile, roles: mergedRoles });
        setUserProfile(prof);
        setTempProfile(prof);
        setUserRoles(mergedRoles);
        setUserAddresses(addresses);
      } catch (e) {
        console.error('loadUserSession error', e);
      } finally {
        loadUserSessionPromisesRef.current.delete(authUser.id);
      }
    });
    loadUserSessionPromisesRef.current.set(authUser.id, promise);
    return promise;
  }, []);  

  useEffect(() => {
    let active = true;
    const pendingAuthTimers = new Set();
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!active) return;
      if (error && isInvalidTokenError(error)) {
        handleAuthErrorOrSignOut();
        return;
      }
      if (session?.user) {
        setIsLoggedIn(true);
        await loadUserSession(session.user);
        if (!active) return;
        await fetchAppData(session.user.id);
        lastLoadedAuthUserIdRef.current = session.user.id;
      } else {
        await fetchAppData(null);
      }
    }).catch((err) => {
      if (isInvalidTokenError(err)) {
        handleAuthErrorOrSignOut();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // getSession handles the initial load. Run subsequent requests after the
      // auth callback returns so Supabase's session lock is no longer held.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      if (event === 'SIGNED_IN' && session?.user?.id === lastLoadedAuthUserIdRef.current) return;
      const timer = setTimeout(async () => {
        pendingAuthTimers.delete(timer);
        if (!active) return;
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          lastLoadedAuthUserIdRef.current = null;
          if (!isClearingAuthRef.current) await handleAuthErrorOrSignOut();
          return;
        }

        if (session?.user) {
          setIsLoggedIn(true);
          await loadUserSession(session.user);
          if (!active) return;
          await fetchAppData(session.user.id);
          lastLoadedAuthUserIdRef.current = session.user.id;
        }
      }, 0);
      pendingAuthTimers.add(timer);
    });
    return () => {
      active = false;
      pendingAuthTimers.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, [fetchAppData, handleAuthErrorOrSignOut, isInvalidTokenError, loadUserSession]);

  // ── Realtime: Orders ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const channel = supabase.channel('orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // Rehydrate through the relational projection. The live orders table
        // has no legacy `data` JSON document to read from Realtime payloads.
        fetchAppData(currentUserRef.current?.id || null);
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, fetchAppData]);

  // ── Realtime: Admin notifications ───────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel('admin-notifs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifs' }, (payload) => {
        const n = payload.new;
        if (!n) return;
        const signature = `${n.title}:${n.message}`;
        // Skip if this device already showed it via notifyAdmin direct call or UUID match
        if (shownAdminNotifIds.current.has(n.id) || shownAdminNotifIds.current.has(signature)) {
          shownAdminNotifIds.current.delete(n.id);
          shownAdminNotifIds.current.delete(signature);
          return;
        }
        notifySystem(n.title, n.message, n.type || 'info');
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);  

  // ── Realtime: Chats ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const channel = supabase.channel('chats-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
        const row = payload.new;
        if (!row) return;
        setChats(prev => ({ ...prev, [row.order_id]: row.messages || [] }));
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn]);

  // Wallets, pending requests, and client-owned JSON stores are not part of
  // the live Pedejá schema. Do not subscribe to or write those retired tables.
  const debounceRef = useRef({});
  const debouncedUpsert = useCallback((key, fn, delay = 1500) => {
    clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(fn, delay);
  }, []);

  // Location is an optional address-resolution accelerator. Never auto-write GPS as an address.
  useEffect(() => {
    if (!isLoggedIn) return;
  }, [isLoggedIn]);

  // ── Auto-grant merchant/rider role (recovery) ───────────────────────────
  // ── Sync userRoles from globalUserRoles ─────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const uid = currentUser?.id || userProfile?.id;
    if (!uid) return;
    const latestRoles = globalUserRoles[uid];
    if (!latestRoles || !latestRoles.length) return;
    const withAdmin = ADMIN_EMAIL && currentUser?.email === ADMIN_EMAIL
      ? [...new Set([...latestRoles, 'admin'])]
      : latestRoles;
    setUserRoles(prev => {
      if (withAdmin.length === prev.length && withAdmin.every(r => prev.includes(r))) return prev;
      return withAdmin;
    });
  }, [globalUserRoles, isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── In-app order notifications ──────────────────────────────────────────
  useEffect(() => {
    const prev = prevOrdersRef.current;
    const uid = currentUser?.id;
    if (!uid || prev.length === 0) { prevOrdersRef.current = orders; return; }
    const prevMap = new Map(prev.map(o => [o.id, o]));
    const myShop = restaurants.find(r => r.ownerId === uid);

    // ── Merchant: new pending orders ──────────────────────────────────────
    if (myShop) {
      const newMerchantOrders = orders.filter(o => o.status === 'pending' && o.restaurantId === myShop.id && !prevMap.has(o.id));
      if (newMerchantOrders.length > 0) {
        setMerchantTab('orders');
        playOrderNotificationSound();
        notifySystem('🛎️ Novo pedido recebido!', `${newMerchantOrders.length} novo(s) pedido(s)`, 'warning');
      }
    }

    // ── Rider: new available jobs ─────────────────────────────────────────
    if (userRoles.includes('rider')) {
      const newJobs = orders.filter(o => o.status === 'ready_to_pickup' && !o.riderId && !prevMap.has(o.id));
      if (newJobs.length > 0) {
        setRiderTab('jobs');
        playNotificationSound('order');
        const first = newJobs[0];
        const dest = first.type === 'parcel'
          ? `📦 ${first.pickup || ''} → ${first.dropoff || ''}`
          : `🍔 ${first.restaurantName || 'Comerciante'} Kz ${first.deliveryFee ?? 0}`;
        notifySystem('🛵 Nova entrega!', newJobs.length === 1 ? dest : `${newJobs.length} nova(s) entrega(s) — ${dest}`, 'warning');
      }
    }

    // ── Status-change notifications for all parties ───────────────────────
    orders.forEach(o => {
      const p = prevMap.get(o.id);
      if (!p || p.status === o.status) return;

      // Customer notifications — every step of their order
      if (o.customerId === uid) {
        switch (o.status) {
          case 'preparing':
            notifySystem('👨‍🍳 Comerciante a preparar o pedido', `Pedido #${o.id.slice(-6)} a ser preparado`, 'info'); break;
          case 'ready_to_pickup':
            notifySystem('✅ Pedido pronto!', `A procurar estafeta para o pedido #${o.id.slice(-6)}`, 'info'); break;
          case 'rider_accepted':
            notifySystem('🛵 O estafeta aceitou o pedido!', `${o.riderName || 'Estafeta'} a caminho da recolha`, 'info'); break;
          case 'picking_up':
            notifySystem('🏪 O estafeta chegou ao ponto de recolha!', `${o.riderName || 'Estafeta'} chegou ao ponto de recolha`, 'info'); break;
          case 'delivering':
            notifySystem('🚀 O estafeta recolheu o pedido!', `Pedido #${o.id.slice(-6)} a caminho da entrega`, 'info'); break;
          case 'delivered':
            playNotificationSound('order');
            notifySystem('📬 Chegou! Confirme a recepção', `Pedido #${o.id.slice(-6)} — toque em "Confirmar recepção" para concluir`, 'warning'); break;
          case 'completed':
            playNotificationSound('success');
            notifySystem(`✅ Entrega${o.type === 'parcel' ? 'encomenda' : 'comida'}Concluído!`, `Pedido #${o.id.slice(-8)} entregue a si 🎉`, 'success'); break;
          case 'cancelled':
            notifySystem('❌ Pedido cancelado', `#${o.id.slice(-8)}${o.cancelReason ? `: ${o.cancelReason}` : ''}`, 'error'); break;
          default: break;
        }
      }

      // Merchant notifications — track their shop's order progress
      if (myShop && o.restaurantId === myShop.id) {
        switch (o.status) {
          case 'rider_accepted':
            notifySystem('🛵 Estafeta aceitou a entrega', `${o.riderName || 'Estafeta'} มาrecolhapedido #${o.id.slice(-6)}`, 'info'); break;
          case 'picking_up':
            notifySystem('✅ Estafeta recolheu o pedido', `Pedido #${o.id.slice(-6)} saiu da fila de trabalho`, 'success'); break;
          case 'completed':
            notifySystem('💰 Pedido concluído!', `Pedido #${o.id.slice(-6)} entregue — receita creditada na carteira`, 'success'); break;
          default: break;
        }
      }
    });

    prevOrdersRef.current = orders;
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save profile to Supabase on change ──────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id) return;
    debouncedUpsert('profile', async () => {
      const profileData = {
        full_name: userProfile.name,
        phone: userProfile.phone,
        avatar_url: userProfile.image || null,
      };
      const signature = JSON.stringify(profileData);
      const snapshot = persistedProfileRef.current;
      if (snapshot?.userId !== currentUser.id || snapshot.signature === signature) return;
      const { error } = await supabase.from('profiles').update(profileData).eq('id', currentUser.id);
      if (error) console.error('Auto-save profile error:', error);
      else persistedProfileRef.current = { userId: currentUser.id, signature };
    }, 2000);
  }, [userProfile, userAddresses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Order state is refreshed from the relational projection on Realtime
  // events. Never simulate rider movement or settle orders in the browser.

  // ── Update Parcel Estimate ───────────────────────────────────────────────
  useEffect(() => {
    if (parcelDetails.pickupLocation && parcelDetails.dropoffLocation) {
      const d = getDistanceFromLatLonInKm(
        parcelDetails.pickupLocation.lat, parcelDetails.pickupLocation.lng,
        parcelDetails.dropoffLocation.lat, parcelDetails.dropoffLocation.lng,
      );
      setParcelDistance(d);
      setParcelEstimate(calculateDeliveryFee(d));
    }
  }, [parcelDetails.pickupLocation, parcelDetails.dropoffLocation, appConfig, calculateDeliveryFee]);

  // ── Chat ─────────────────────────────────────────────────────────────────
  const openChatWindow = (id, title, role) => {
    if (!chats[id]) {
      setChats(prev => ({ ...prev, [id]: [] }));
      supabase.from('chats').upsert({ order_id: id, messages: [] }).then(() => {});
    }
    setActiveChat({ id, title, role });
  };
  const closeChatWindow = () => setActiveChat(null);

  const sendMessage = (text) => {
    if (!text.trim() || !activeChat) return;
    const newMessage = {
      text: text.trim(),
      sender: activeRole,
      senderName: activeRole === 'admin' ? 'Operações'
        : activeRole === 'rider' ? 'Estafeta'
        : activeRole === 'merchant' ? 'Comerciante'
        : userProfile?.name || 'Cliente',
      time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    };
    // Optimistic local update
    setChats(prev => ({ ...prev, [activeChat.id]: [...(prev[activeChat.id] || []), newMessage] }));
    // Atomic server-side append — concurrent sends never overwrite each other
    supabase.rpc('append_chat_message', { p_order_id: activeChat.id, p_message: newMessage }).then(() => {});
  };

  const deleteChat = (chatId) => {
    setChats(prev => { const next = { ...prev }; delete next[chatId]; return next; });
    supabase.from('chats').delete().eq('order_id', chatId).then(() => {});
    if (activeChat?.id === chatId) setActiveChat(null);
  };

  // ── Location helpers ─────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`,
        { headers: { 'Accept-Language': 'th' } },
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }, []);

  const handleMapLocationSelect = async (loc) => {
    setNewAddr(prev => ({ ...prev, location: loc, fullAddr: `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` }));
    const addr = await reverseGeocode(loc.lat, loc.lng);
    setNewAddr(prev => ({ ...prev, location: loc, latitude: loc.lat, longitude: loc.lng, addressLine1: prev.addressLine1 || addr }));
  };

  const handleParcelMapSelect = async (loc) => {
    const addr = await reverseGeocode(loc.lat, loc.lng);
    if (parcelMapTarget === 'pickup') {
      setParcelDetails(prev => ({ ...prev, pickup: addr, pickupLocation: loc }));
    } else if (parcelMapTarget === 'dropoff') {
      setParcelDetails(prev => ({ ...prev, dropoff: addr, dropoffLocation: loc }));
    }
  };

  const getCurrentLocationForForm = () => {
    if (!navigator.geolocation) return notifySystem('Erro', 'O navegador não suporta GPS', 'error');
    notifySystem('A obter localização', 'Aguarde...', 'info');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      setNewAddr(prev => ({ ...prev, location: loc, latitude: loc.lat, longitude: loc.lng }));
      const addr = await reverseGeocode(loc.lat, loc.lng);
      setNewAddr(prev => ({ ...prev, location: loc, fullAddr: addr }));
      notifySystem('Concluído', 'Localização e morada actualizadas.', 'success');
    }, () => notifySystem('Erro', 'Não foi possível obter a localização. Permita o acesso ao GPS.', 'error'), { enableHighAccuracy: true, timeout: 10000 });
  };

  const getCurrentLocationForParcel = (target) => {
    if (!navigator.geolocation) return notifySystem('Erro', 'O navegador não suporta GPS', 'error');
    notifySystem('A obter localização', 'A procurar a sua localização...', 'info');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const loc  = { lat: position.coords.latitude, lng: position.coords.longitude };
      const addr = await reverseGeocode(loc.lat, loc.lng);
      if (target === 'pickup') {
        setParcelDetails(prev => ({ ...prev, pickup: addr, pickupLocation: loc }));
        setParcelMapTarget('pickup');
      } else {
        setParcelDetails(prev => ({ ...prev, dropoff: addr, dropoffLocation: loc }));
        setParcelMapTarget('dropoff');
      }
      notifySystem('Concluído', `${target === 'pickup' ? 'Ponto de recolha' : 'Ponto de entrega'} definido para a localização actual`, 'success');
    }, () => notifySystem('Erro', 'Não foi possível obter a localização. Permita o acesso ao GPS.', 'error'), { enableHighAccuracy: true, timeout: 10000 });
  };

  const handleSaveProfile = useCallback(() => {
    setUserProfile({ ...tempProfile });
    setProfileSubView('main');
    notifySystem('Concluído', 'Perfil guardado', 'success');
  }, [tempProfile]);  

  // ── Merchant Management ──────────────────────────────────────────────────
  const handleUpdateShopLocation = useCallback((restaurantId, location) => {
    if (!restaurantId || !location) return;
    setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, location } : r));
    notifySystem('📍 Localização do estabelecimento guardada', 'Clientes e estafetas dentro do raio poderão encontrar o estabelecimento', 'success');
  }, []);  

  const handleToggleShopStatus = (restaurantId) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id !== restaurantId) return r;
      const newStatus = r.status === 'open' ? 'closed' : 'open';
      notifySystem('Estado do estabelecimento', `Estabelecimento ${newStatus === 'open' ? 'aberto' : 'fechado'}`, 'info');
      return { ...r, status: newStatus };
    }));
  };

  const handleAddMenuItem = (restaurantId, newItem) => {
    setMenuItems(prev => ({ ...prev, [restaurantId]: [...(prev[restaurantId] || []), { ...newItem, id: generateId(), available: true }] }));
    notifySystem('Concluído', 'Menu adicionado', 'success');
  };

  const handleEditMenuItem = (restaurantId, itemId, updatedItem) => {
    setMenuItems(prev => ({ ...prev, [restaurantId]: (prev[restaurantId] || []).map(item => item.id === itemId ? { ...item, ...updatedItem } : item) }));
    notifySystem('Concluído', 'Menu actualizado', 'success');
  };

  const handleDeleteMenuItem = (restaurantId, itemId) => {
    if (!window.confirm('Confirma a eliminação deste menu?')) return;
    setMenuItems(prev => ({ ...prev, [restaurantId]: (prev[restaurantId] || []).filter(item => item.id !== itemId) }));
    notifySystem('Concluído', 'Menu eliminado', 'success');
  };

  const handleToggleItemAvailability = (restaurantId, itemId) => {
    setMenuItems(prev => ({ ...prev, [restaurantId]: (prev[restaurantId] || []).map(item => item.id === itemId ? { ...item, available: !item.available } : item) }));
  };

  // ── Address management ───────────────────────────────────────────────────
  const handleUpdateUserLocation = useCallback(async (location) => {
    if (!location) return false;
    setUserProfile(prev => ({ ...prev, location }));
    return true;
  }, []);

  const handleAddAddress = useCallback(async (addr) => {
    if (!addr?.label || !addr?.addressLine1) {
      notifySystem('Morada incompleta', 'Indique a etiqueta e a morada.', 'error');
      return false;
    }

    const { data: addressId, error } = await supabase.rpc('create_customer_address', {
      p_label: addr.label,
      p_address_line_1: addr.addressLine1,
      p_address_line_2: addr.addressLine2 || null,
      p_neighborhood: addr.neighborhood || null,
      p_municipality: addr.municipality || null,
      p_city: addr.city || null,
      p_province: addr.province || null,
      p_reference: addr.reference || null,
      p_latitude: Number.isFinite(Number(addr.latitude)) ? Number(addr.latitude) : null,
      p_longitude: Number.isFinite(Number(addr.longitude)) ? Number(addr.longitude) : null,
      p_delivery_instructions: null,
    });

    if (error || !addressId) {
      notifySystem('Não foi possível guardar', error?.message || 'O servidor não devolveu a morada criada.', 'error');
      return false;
    }

    await loadUserSession(currentUser);
    notifySystem('Concluído', 'Morada guardada', 'success');
    return true;
  }, [currentUser, loadUserSession]);

  const handleUpdateAddress = useCallback(async (id, location, label, fullAddr) => {
    if (!id) return false;
    const parts = typeof fullAddr === 'string' ? fullAddr : '';
    const { error } = await supabase.rpc('update_customer_address', {
      p_address_id: id,
      p_label: label || 'Morada',
      p_address_line_1: parts || 'Morada actualizada',
      p_latitude: location ? Number(location.lat) : null,
      p_longitude: location ? Number(location.lng) : null,
    });
    if (error) {
      notifySystem('Não foi possível actualizar', error.message, 'error');
      return false;
    }
    await loadUserSession(currentUser);
    return true;
  }, [currentUser, loadUserSession]);

  const handleDeleteAddress = useCallback(async (id) => {
    const { data: removed, error } = await supabase.rpc('remove_customer_address', { p_address_id: id });
    if (error || removed !== true) {
      notifySystem('Não foi possível remover', error?.message || 'A morada não foi removida no servidor.', 'error');
      return false;
    }
    await loadUserSession(currentUser);
    notifySystem('Morada removida', 'A morada foi removida.', 'success');
    return true;
  }, [currentUser, loadUserSession]);

  // ── Rider location update ─────────────────────────────────────────────────
  const _lastGpsWriteRef = useRef(0); // throttle: write to Supabase at most once per 5s

  const updateRiderWorkingLocation = useCallback((riderId, location, isAvailable = true) => {
    if (!riderId || !location) return;

    // 1. Update local riders state immediately
    setRiders(prev => prev.map(r =>
      r.id === riderId
        ? { ...r, location, lastLocationAt: new Date().toISOString(), availabilityStatus: isAvailable ? 'AVAILABLE' : 'OFFLINE' }
        : r,
    ));

    const now = Date.now();
    if (now - _lastGpsWriteRef.current < 5000) return; // throttle
    _lastGpsWriteRef.current = now;

    // The live RPC derives the authenticated rider from auth.uid(); the
    // rider id is intentionally not sent to the database.
    supabase.rpc('rider_update_location', {
      p_latitude: location.lat,
      p_longitude: location.lng,
    }).then(({ error }) => {
      if (error) console.error('rider_update_location error:', error);
    });
  }, []);  

  // ── Manual role/pending sync from Supabase ───────────────────────────────
  const syncRoles = useCallback(async () => {
    const uid = currentUser?.id || userProfile?.id;
    if (!uid) return;
    const { data: contextResult, error } = await supabase.rpc('get_current_staff_context');
    if (error) console.error('get_current_staff_context error:', error);
    const latest = contextResult?.roles || [];
    setUserRoles(latest.length > 0 ? latest : ['customer']);
    await fetchAppData();
    notifySystem('Actualizar', 'Dados actualizados', 'success');
  }, [currentUser?.id, userProfile?.id, fetchAppData]);

  const forceRefresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserSession(session.user);
    }
    await fetchAppData();
  }, [fetchAppData, loadUserSession]);

  // ── Auth Functions ───────────────────────────────────────────────────────
  const handleLogin = async () => {
    const email = (loginForm.email || loginForm.phone || '').trim().toLowerCase();
    if (!email) return notifySystem('Erro', 'Indique o e-mail', 'error');
    if (!email.includes('@')) return notifySystem('Erro', 'Inicie sessão com o e-mail', 'error');
    if (!loginForm.password) return notifySystem('Erro', 'Indique a palavra-passe', 'error');
    setAuthLoading(true);
    try {
      let signInRes = { error: null };
      try {
        signInRes = await supabase.auth.signInWithPassword({ email, password: loginForm.password });
      } catch (err) {
        signInRes = { error: err };
      }
      const error = signInRes.error;
      if (error) {
        if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true') {
          const prof = { id: 'dev-user-id', name: 'Cliente de teste (Dev)', phone: '0812345678', email: email || 'customer@pedeja.local', location: null };
          setIsLoggedIn(true);
          setCurrentUser({ id: 'dev-user-id', email: prof.email, ...prof, roles: ['customer'] });
          setUserProfile(prof);
          setTempProfile(prof);
          setUserRoles(['customer']);
          setUsercarteira(1000);
          setUserAddresses([{ id: 1, label: 'Casa', address: 'Adicione a sua morada', location: null }]);
          notifySystem('Sessão iniciada (Dev Mode)', 'Bem-vindo ao sistema', 'success');
          return;
        }
        return notifySystem('Erro', 'E-mail/palavra-passe inválidos', 'error');
      }
      const { data: profile } = await supabase.from('profiles').select('account_status').eq('id', signInRes.data.user.id).maybeSingle();
      if (profile?.account_status && profile.account_status !== 'ACTIVE') {
        await supabase.auth.signOut();
        return notifySystem('Erro', 'Esta conta está suspensa', 'error');
      }
      setLoginForm({ phone: '', email: '', password: '' });
      notifySystem('Concluído', 'Sessão iniciada!', 'success');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.name) return notifySystem('Erro', 'Indique o nome completo', 'error');
    if (!registerForm.email) return notifySystem('Erro', 'Indique o e-mail', 'error');
    if (!registerForm.password) return notifySystem('Erro', 'Indique a palavra-passe', 'error');
    if (registerForm.password.length < 6) return notifySystem('Erro', 'A palavra-passe deve ter pelo menos 6 caracteres', 'error');
    if (registerForm.password !== registerForm.confirmPassword) return notifySystem('Erro', 'As palavras-passe não coincidem', 'error');
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: { data: { name: registerForm.name, phone: registerForm.phone || null } },
      });
      if (error) return notifySystem('Erro', error.message, 'error');
      if (!data.user) return notifySystem('Erro', 'Não foi possível criar a conta. Tente novamente.', 'error');
      // Database trigger handle_new_auth_user initializes profile, wallet and
      // customer role atomically, including when email confirmation is enabled.
      setRegisterForm({ phone: '', email: '', password: '', confirmPassword: '', name: '' });
      notifySystem('Concluído', 'Conta criada. Bem-vindo! 🎉', 'success');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await handleAuthErrorOrSignOut();
  };

  // ── Clear wallet history ──────────────────────────────────────────────────
  const clearcarteiraHistory = useCallback(async () => {
    setcarteiraAllEntries([]);
    setcarteiraClearedAt(new Date());
    const uid = currentUser?.id || userProfile?.id;
    if (uid) {
      const { error } = await supabase.rpc('clear_wallet_history', { p_user_id: uid });
      if (error) {
        console.error('clearcarteiraHistory error', error);
        await loadUserSession(currentUser);
        notifySystem('Não foi possível', 'Não foi possível limpar o histórico da carteira', 'error');
      }
    }
  }, [currentUser, userProfile?.id, loadUserSession]);

  // ── Rating ────────────────────────────────────────────────────────────────
  const openRatingModal  = useCallback((order) => { setRatingOrderData(order); setShowRatingModal(true); }, []);

  const submitRating = useCallback(async ({ orderId, restaurantId, riderId, restaurantRating, riderRating, comment }) => {
    const orderToRate = orders.find(o => o.id === orderId);
    if (!orderToRate) return;
    // The live database currently exposes no review/rating relation or RPC.
    // Do not fabricate aggregates or persist UI-only fields into orders.
    void restaurantId;
    void riderId;
    void restaurantRating;
    void riderRating;
    void comment;
    notifySystem('Avaliações indisponíveis', 'A avaliação ficará disponível quando o backend de avaliações for criado.', 'warning');
  }, [orders]);

  // --- Context Value ---
  const value = {
    // Theme
    isDarkMode, toggleDarkMode,

    // Navigation
    activeRole, setActiveRole,
    adminTab, setAdminTab,
    merchantTab, setMerchantTab,
    riderTab, setRiderTab,
    activeTab, setActiveTab,
    profileSubView, setProfileSubView,
    serviceType, setServiceType,

    // Data
    orders, setOrders, totalOrdersCount,
    appConfig, setAppConfig,
    isConfigDirty, setIsConfigDirty,
    restaurants, setRestaurants,
    riders, setRiders,
    menuItems, setMenuItems,
    pendingRequests, setPendingRequests,
    isDataLoading,

    // Auth
    isLoggedIn,
    currentUser,
    loginForm, setLoginForm,
    registerForm, setRegisterForm,
    authMode, setAuthMode,
    authLoading,
    handleLogin,
    handleRegister,
    handleLogout,

    // User Profile
    userProfile, setUserProfile,
    userRoles, setUserRoles,
    userAddresses, setUserAddresses,
    usercarteira, setUsercarteira,
    walletHistory,
    clearcarteiraHistory,
    tempProfile, setTempProfile,
    isAdmin,
    globalcarteiras, setGlobalcarteiras,

    // Cart & Orders
    cart, setCart,
    selectedRestaurant, setSelectedRestaurant,
    parcelDetails, setParcelDetails,
    paymentMethod, setPaymentMethod,
    parcelMapTarget, setParcelMapTarget,
    parcelDistance, setParcelDistance,
    parcelEstimate, setParcelEstimate,
    addToCart,
    calculateFoodTotal,
    calculateDeliveryFee,
    calculateRideFee,
    placeOrder,
    placeParcelOrder,
    placeRideOrder,
    placeServiceOrder,
    acceptOrder,
    updateOrderStatus,

    // Forms & Modals
    newAddr, setNewAddr,
    withdrawMode, setWithdrawMode,
    withdrawAmount, setWithdrawAmount,
    withdrawBank, setWithdrawBank,
    withdrawAccount, setWithdrawAccount,
    withdrawName, setWithdrawName,
    merchantRegForm, setMerchantRegForm,
    riderRegForm, setRiderRegForm,
    editConfig, setEditConfig,
    isEditingMenu, setIsEditingMenu,
    editingShop, setEditingShop,
    shopEditForm, setShopEditForm,
    editForm, setEditForm,
    showCancelModal, setShowCancelModal,
    selectedOrderToCancel,
    cancelReasonInput, setCancelReasonInput,
    showRejectModal,
    showImageModal, setShowImageModal,
    previewImageUrl,

    // TopUp & carteira
    showTopUpModal, setShowTopUpModal,
    topUpSlip, setTopUpSlip,
    creditcarteira,
    processTransaction,
    requestTopUp,
    requestWithdraw,
    adminAdjustcarteira,

    // Rating
    showRatingModal, setShowRatingModal,
    ratingOrderData,
    openRatingModal,
    submitRating,

    // Chat
    activeChat,
    chats,
    openChatWindow,
    closeChatWindow,
    sendMessage,
    deleteChat,

    // Location
    handleMapLocationSelect,
    handleParcelMapSelect,
    getCurrentLocationForForm,
    getCurrentLocationForParcel,
    handleUpdateUserLocation,

    // Profile
    handleSaveProfile,
    profileUploading,
    handleProfilePhotoChange,

    // Merchant
    handleUpdateShopLocation,
    handleToggleShopStatus,
    handleAddMenuItem,
    handleEditMenuItem,
    handleDeleteMenuItem,
    handleToggleItemAvailability,
    handleShopPhotoChange,
    handleRegistrationPhotoSelect,
    handleTopUpSlipSelect,
    handleMenuPhotoSelect,
    openImagePreview,

    // Address
    handleAddAddress,
    handleUpdateAddress,
    handleDeleteAddress,

    // Registration
    requestRegisterMerchant,
    requestRegisterRider,

    // Promo
    promoCodes, setPromoCodes,
    validatePromoCode, applyPromoCode, createPromoCode, togglePromoCode, deletePromoCode,

    // Admin
    handleApproveRequest,
    initiateRejectRequest,
    confirmRejectRequest,
    adminBanUser,
    toggleRestaurantStatus,
    toggleRiderBan,
    saveShopEdit,
    deleteRestaurant,
    grantRole,
    revokeRole,

    // Misc
    toasts, removeToast, notifySystem,
    syncRoles,
    updateRiderWorkingLocation,
    isPending,
    hasPendingCancelRequest,
    initiateCancelOrder,
    confirmCancelOrder,
    cancelOrderDirectly,
    requestCancelOrder,
    requestCancelByRole,
    forceRefresh,
    fetchUsercarteira,
    walletAllEntries,
    supabase,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

