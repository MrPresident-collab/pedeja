import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  INITIAL_CONFIG, INITIAL_RESTAURANTS, INITIAL_RIDERS, INITIAL_MENU_ITEMS,
  USER_LOCATION, ADMIN_EMAIL,
} from '../constants';
import { generateId, getDistanceFromLatLonInKm, playNotificationSound, playOrderNotificationSound, r2, initPushNotifications } from '../utils';
import { supabase } from '../lib/supabase';
import { canApplyOrderUpdate, ORDER_STATUS_RANK } from '../domain/orderStatus';

import { usecarteiraActions }  from './hooks/usecarteiraActions';
import { useOrderActions }   from './hooks/useOrderActions';
import { useAdminActions }   from './hooks/useAdminActions';
import { usePhotoHandlers }  from './hooks/usePhotoHandlers';
import { useRegistration }   from './hooks/useRegistration';
import { usePromoActions }   from './hooks/usePromoActions';

const AppContext = createContext(null);

const riderProfileSignature = (row) => {
  const profile = { ...row.data };
  delete profile.location;
  delete profile.current_lat;
  delete profile.current_lng;
  delete profile.is_available;
  return JSON.stringify({ id: row.id, user_id: row.user_id, data: profile });
};

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
  const [serviceType, setServiceType] = useState('food');

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
    id: '', name: '', phone: '', email: '', location: USER_LOCATION,
  });
  const [userRoles, setUserRoles] = useState(['customer']);
  const [userAddresses, setUserAddresses] = useState([
    { id: 1, label: 'Casa', address: 'Adicione a sua morada', location: USER_LOCATION },
  ]);
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
  const [paymentMethod, setPaymentMethod] = useState('wallet');

  // --- Form & Modal State ---
  const [newAddr, setNewAddr] = useState({ label: '', fullAddr: '', location: null });
  const [withdrawMode, setWithdrawMode] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [tempProfile, setTempProfile] = useState({ id: '', name: '', phone: '', email: '', location: USER_LOCATION });
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
  const restaurantsRef = React.useRef(INITIAL_RESTAURANTS);
  const currentUserRef = React.useRef(null);
  const fetchAppDataPromiseRef = useRef(null);
  const fetchAppDataAuthKeyRef = useRef(null);
  const loadUserSessionPromisesRef = useRef(new Map());
  const lastLoadedAuthUserIdRef = useRef(null);
  const lastcarteiraHistorySyncAtRef = useRef(0);
  const persistedProfileRef = useRef(null);
  // Keep a per-row snapshot of data read from or written to Supabase. This
  // prevents initial hydration and unrelated state updates from auto-saving
  // unchanged rows back to the database.
  const persistedRowsRef = useRef({ restaurants: null, menuItems: null, riders: null });
  useEffect(() => { restaurantsRef.current = restaurants; }, [restaurants]);
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
    const uid = targetUid || currentUser?.id;
    if (!uid) return;
    try {
      const walletKey = (ADMIN_EMAIL && currentUser?.email === ADMIN_EMAIL) ? ADMIN_EMAIL : uid;
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', walletKey)
        .maybeSingle();
      if (walletError) {
        console.error('fetchUsercarteira error:', walletError);
        return;
      }

      if (wallet) {
        const bal = r2(wallet.balance || 0);
        setUsercarteira(bal);
        setGlobalcarteiras(prev => ({
          ...prev,
          [walletKey]: { ...prev[walletKey], balance: bal },
          [uid]: { ...prev[uid], balance: bal },
        }));
        // Realtime normally carries the updated history. Restore the full
        // history only when that event has not reached this client.
        if (Date.now() - lastcarteiraHistorySyncAtRef.current > 5000) {
          const { data: historyRow, error } = await supabase
            .from('wallets').select('history').eq('user_id', walletKey).maybeSingle();
          if (error) console.error('carteira history fallback error:', error);
          else if (historyRow) {
            const history = historyRow.history || [];
            setcarteiraAllEntries(history);
            setGlobalcarteiras(prev => ({
              ...prev,
              [walletKey]: { ...prev[walletKey], balance: bal, history },
              [uid]: { ...prev[uid], balance: bal, history },
            }));
            lastcarteiraHistorySyncAtRef.current = Date.now();
          }
        }
      }
    } catch (e) {
      console.error('fetchUsercarteira error', e);
    }
  }, [currentUser?.id, currentUser?.email]);

  // ── carteira hook ─────────────────────────────────────────────────────────────
  const { creditcarteira, creditcarteiraLocal, processTransaction, requestTopUp, requestWithdraw, adminAdjustcarteira } = usecarteiraActions({
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
    currentUser, userProfile, userAddresses, usercarteira,
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
        const [restsResult, menusResult, ridersResult, ordersResult, pendingResult, configResult, promosResult] = await Promise.all([
          supabase.from('restaurants').select('id, data'),
          supabase.from('menu_items').select('restaurant_id, items'),
          supabase.from('riders').select('id, data, current_lat, current_lng, is_available'),
          supabase.from('orders').select('id, data', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
          supabase.from('pending_requests').select('id, data'),
          supabase.from('app_config').select('data').eq('id', 1),
          supabase.from('promo_codes').select('id, data'),
        ]);

        if (!restsResult.error) {
          const rows = (restsResult.data || []).map(r => r.data).filter(Boolean);
          persistedRowsRef.current.restaurants = new Map(rows.map(r => [r.id, JSON.stringify({ id: r.id, owner_id: r.ownerId || null, data: r })]));
          setRestaurants(rows);
        }
        if (!menusResult.error) {
          const obj = {};
          (menusResult.data || []).forEach(m => { obj[m.restaurant_id] = m.items; });
          persistedRowsRef.current.menuItems = new Map(Object.entries(obj).map(([restaurantId, items]) => [restaurantId, JSON.stringify({ restaurant_id: restaurantId, items })]));
          setMenuItems(obj);
        }
        if (!ridersResult.error) {
          const rows = (ridersResult.data || []).filter(r => r.data).map(r => ({
            ...r.data,
            location: Number.isFinite(r.current_lat) && Number.isFinite(r.current_lng)
              ? { lat: r.current_lat, lng: r.current_lng }
              : r.data.location,
            current_lat: r.current_lat ?? r.data.current_lat,
            current_lng: r.current_lng ?? r.data.current_lng,
            is_available: r.is_available ?? r.data.is_available,
          }));
          persistedRowsRef.current.riders = new Map(rows.map(r => [r.id, riderProfileSignature({ id: r.id, user_id: r.userId || null, data: r })]));
          setRiders(rows);
        }
        if (!ordersResult.error) {
          setOrders((ordersResult.data || []).map(o => o.data));
          setTotalOrdersCount(ordersResult.count || 0);
        }
        if (!pendingResult.error) setPendingRequests((pendingResult.data || []).map(r => r.data));

        if (!configResult.error) {
          const configRow = Array.isArray(configResult.data) ? configResult.data[0] : configResult.data;
          if (configRow?.data) {
            setAppConfig(prev => ({ ...INITIAL_CONFIG, ...prev, ...configRow.data }));
            if (!isConfigDirtyRef.current) {
              setEditConfig(prev => ({ ...INITIAL_CONFIG, ...prev, ...configRow.data }));
            }
          }
        } else {
          console.warn('Failed to load app_config from Supabase:', configResult.error);
        }
        if (!promosResult.error) setPromoCodes((promosResult.data || []).map(p => p.data));
      } catch (e) {
        console.error('fetchAppData error', e);
      } finally {
        setIsDataLoading(false);
        dataLoadedRef.current = true;
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
      setUserProfile({ id: '', name: '', phone: '', email: '', location: USER_LOCATION });
      setTempProfile({ id: '', name: '', phone: '', email: '', location: USER_LOCATION });
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
        const [profileResult, rolesResult, walletResult] = await Promise.all([
          supabase.from('profiles').select('id, name, phone, email, location, avatar, addresses, banned').eq('id', authUser.id).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', authUser.id),
          supabase.from('wallets').select('balance, history').eq('user_id', authUser.id).maybeSingle(),
        ]);

        const profile = profileResult.data || {};
        const roles   = rolesResult.data?.map(r => r.role) || ['customer'];
        const wallet  = walletResult.data;

        const mergedRoles = roles;

        const prof = {
          id: authUser.id,
          name: profile.name || '',
          phone: profile.phone || '',
          email: authUser.email || profile.email || '',
          location: profile.location || USER_LOCATION,
          image: profile.avatar || null,
        };

        const addresses = profile.addresses || [{ id: 1, label: 'Casa', address: 'Adicione uma morada', location: USER_LOCATION }];
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
        if (!walletResult.error) {
          setUsercarteira(r2(wallet?.balance || 0));
          setcarteiraAllEntries(wallet?.history || []);
          if (wallet) lastcarteiraHistorySyncAtRef.current = Date.now();
        } else {
          console.warn('Failed to load wallet from Supabase:', walletResult.error);
        }
        setUserAddresses(addresses);
        // Use email key for admin so it stays consistent with creditcarteira(ADMIN_EMAIL,...) calls
        const walletKey = (ADMIN_EMAIL && authUser.email === ADMIN_EMAIL) ? ADMIN_EMAIL : authUser.id;
        if (!walletResult.error) {
          setGlobalcarteiras(prev => ({
            ...prev,
            [walletKey]: { balance: r2(wallet?.balance || 0), history: wallet?.history || [] },
          }));
        }
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const o = payload.new?.data;
        if (o) {
          setOrders(prev => {
            if (prev.some(x => x.id === o.id)) return prev;
            setTotalOrdersCount(count => count + 1);
            return [o, ...prev];
          });
        } else if (payload.new?.id) {
          const { data: row } = await supabase.from('orders').select('id, data').eq('id', payload.new.id).maybeSingle();
          if (row?.data) setOrders(prev => {
            if (prev.some(x => x.id === row.data.id)) return prev;
            setTotalOrdersCount(count => count + 1);
            return [row.data, ...prev];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, async (payload) => {
        const applyUpdate = (incoming) => {
          if (!incoming?.id) return;
          setOrders(prev => {
            const idx = prev.findIndex(x => x.id === incoming.id);
            if (idx === -1) return [...prev, incoming]; // order not yet in state — add it
            if (!canApplyOrderUpdate(prev[idx], incoming)) return prev;
            const next = [...prev];
            next[idx] = incoming;
            return next;
          });
          if (incoming.status === 'completed') {
            fetchUsercarteira();
          }
        };
        const o = payload.new?.data;
        if (o) {
          applyUpdate(o);
        } else if (payload.new?.id) {
          // REPLICA IDENTITY DEFAULT — data column not in payload; fetch directly
          const { data: row } = await supabase.from('orders').select('id, data').eq('id', payload.new.id).maybeSingle();
          if (row?.data) applyUpdate(row.data);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => {
          const exists = prev.some(x => x.id === payload.old?.id);
          if (exists) setTotalOrdersCount(count => Math.max(0, count - 1));
          return prev.filter(x => x.id !== payload.old?.id);
        });
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, fetchUsercarteira]);

  // ── Realtime: Pending Requests ──────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel('pending-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pending_requests' }, async (payload) => {
        const r = payload.new?.data;
        if (r) {
          setPendingRequests(prev => prev.some(x => x.id === r.id) ? prev : [r, ...prev]);
        } else {
          // payload.new.data may be null if Supabase RLS filters row-level data in Realtime
          // Fall back to a direct fetch for the specific row (or full list if id missing)
          const rowId = payload.new?.id;
          if (rowId) {
            const { data: row } = await supabase.from('pending_requests').select('id, data').eq('id', rowId).maybeSingle();
            if (row?.data) setPendingRequests(prev => prev.some(x => x.id === row.data.id) ? prev : [row.data, ...prev]);
          } else {
            const { data: rows } = await supabase.from('pending_requests').select('id, data');
            if (rows) setPendingRequests(rows.map(row => row.data).filter(Boolean));
          }
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pending_requests' }, (payload) => {
        setPendingRequests(prev => prev.filter(x => x.id !== payload.old?.id));
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);  

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

  // ── Realtime: carteiras ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id) return;
    const uid = currentUser.id;
    const walletKey = (ADMIN_EMAIL && currentUser.email === ADMIN_EMAIL) ? ADMIN_EMAIL : uid;

    const channel = supabase.channel('wallets-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, (payload) => {
        const updated = payload.new;
        if (!updated) return;
        if (updated.user_id === uid || updated.user_id === walletKey) {
          const bal = r2(updated.balance || 0);
          const hist = updated.history || [];
          setUsercarteira(bal);
          setcarteiraAllEntries(hist);
          lastcarteiraHistorySyncAtRef.current = Date.now();
          setGlobalcarteiras(prev => ({
            ...prev,
            [walletKey]: { balance: bal, history: hist },
            [uid]: { balance: bal, history: hist },
          }));
        } else if (isAdmin) {
          const bal = r2(updated.balance || 0);
          const hist = updated.history || [];
          setGlobalcarteiras(prev => ({
            ...prev,
            [updated.user_id]: { balance: bal, history: hist },
          }));
        }
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, currentUser?.id, currentUser?.email, isAdmin]);

  // ── Auto-save mutable app data to Supabase ──────────────────────────────
  const debounceRef = useRef({});
  const dataLoadedRef = useRef(false);
  const debouncedUpsert = useCallback((key, fn, delay = 1500) => {
    clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(fn, delay);
  }, []);

  useEffect(() => {
    if (!dataLoadedRef.current || !restaurants.length) return;
    const uid = currentUser?.id;
    if (!uid) return;
    const ownedRows = restaurants.filter(r => isAdmin || r.ownerId === uid);
    if (!ownedRows.length) return;

    debouncedUpsert('restaurants', async () => {
      const currentUid = currentUserRef.current?.id;
      if (!currentUid) return;
      const rows = restaurantsRef.current
        .filter(r => isAdmin || r.ownerId === currentUid)
        .map(r => ({ id: r.id, owner_id: r.ownerId || null, data: r }));
      const snapshots = persistedRowsRef.current.restaurants;
      if (!snapshots) return;
      const changedRows = rows.filter(row => snapshots.get(row.id) !== JSON.stringify(row));
      if (changedRows.length) {
        const { error } = await supabase.from('restaurants').upsert(changedRows);
        if (error) console.error('Auto-save restaurants error:', error);
        else changedRows.forEach(row => snapshots.set(row.id, JSON.stringify(row)));
      }
    });
  }, [restaurants, currentUser?.id, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dataLoadedRef.current) return;
    const uid = currentUser?.id;
    if (!uid) return;
    const ownedRestIds = new Set(restaurants.filter(r => isAdmin || r.ownerId === uid).map(r => r.id));
    const ownedItems = Object.entries(menuItems).filter(([rid]) => ownedRestIds.has(rid));
    if (!ownedItems.length) return;

    debouncedUpsert('menu_items', async () => {
      const currentUid = currentUserRef.current?.id;
      if (!currentUid) return;
      const activeOwnedRestIds = new Set(restaurantsRef.current.filter(r => isAdmin || r.ownerId === currentUid).map(r => r.id));
      const rows = Object.entries(menuItems)
        .filter(([rid]) => activeOwnedRestIds.has(rid))
        .map(([rid, items]) => ({ restaurant_id: rid, items }));
      const snapshots = persistedRowsRef.current.menuItems;
      if (!snapshots) return;
      const changedRows = rows.filter(row => snapshots.get(row.restaurant_id) !== JSON.stringify(row));
      if (changedRows.length) {
        const { error } = await supabase.from('menu_items').upsert(changedRows);
        if (error) console.error('Auto-save menu_items error:', error);
        else changedRows.forEach(row => snapshots.set(row.restaurant_id, JSON.stringify(row)));
      }
    });
  }, [menuItems, restaurants, currentUser?.id, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dataLoadedRef.current || !riders.length) return;
    const uid = currentUser?.id;
    if (!uid) return;
    const ownedRiders = riders.filter(r => isAdmin || r.userId === uid);
    if (!ownedRiders.length) return;

    debouncedUpsert('riders', async () => {
      const currentUid = currentUserRef.current?.id;
      if (!currentUid) return;
      const rows = riders
        .filter(r => isAdmin || r.userId === currentUid)
        .map(r => ({ id: r.id, user_id: r.userId || null, data: r }));
      const snapshots = persistedRowsRef.current.riders;
      if (!snapshots) return;
      const changedRows = rows.filter(row => snapshots.get(row.id) !== riderProfileSignature(row));
      if (changedRows.length) {
        const { error } = await supabase.from('riders').upsert(changedRows);
        if (error) console.error('Auto-save riders error:', error);
        else changedRows.forEach(row => snapshots.set(row.id, riderProfileSignature(row)));
      }
    });
  }, [riders, currentUser?.id, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-capture GPS location on login ──────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) { gpsSessionRef.current = ''; return; }
    const uid = currentUser?.id;
    if (!uid || gpsSessionRef.current === uid) return;
    gpsSessionRef.current = uid;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserProfile(prev => ({ ...prev, location: loc }));
        setUserAddresses(prev => {
          if (!prev || prev.length === 0) {
            return [{ id: 1, label: 'Casa', address: 'Morada actual', location: loc }];
          }
          return prev.map((a, idx) => idx === 0 ? { ...a, location: loc } : a);
        });
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`,
            { headers: { 'Accept-Language': 'th' } },
          );
          const d = await r.json();
          const parts = [d.address?.road, d.address?.neighbourhood || d.address?.suburb, d.address?.city || d.address?.town].filter(Boolean);
          const addr = parts.join(', ') || d.display_name?.split(',').slice(0, 3).join(',') || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
          notifySystem('📍 Localização guardada', addr.substring(0, 60), 'success');
        } catch {
          notifySystem('📍 Localização guardada', `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`, 'success');
        }
      },
      (err) => {
        if (err.code === 1) notifySystem('📍 Não foi possível obter a localização', 'Permita o acesso ao GPS', 'warning');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 },
    );
  }, [isLoggedIn, currentUser?.id]);  

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
        name: userProfile.name,
        phone: userProfile.phone,
        avatar: userProfile.image || null,
        location: userProfile.location,
        addresses: userAddresses,
      };
      const signature = JSON.stringify(profileData);
      const snapshot = persistedProfileRef.current;
      if (snapshot?.userId !== currentUser.id || snapshot.signature === signature) return;
      const { error } = await supabase.from('profiles').update(profileData).eq('id', currentUser.id);
      if (error) console.error('Auto-save profile error:', error);
      else persistedProfileRef.current = { userId: currentUser.id, signature };
    }, 2000);
  }, [userProfile, userAddresses]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time Rider Location Simulation ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prevOrders => prevOrders.map(order => {
        if (['rider_accepted', 'picking_up', 'delivering'].includes(order.status) && order.riderId) {
          const currentPos = order.riderLocation || order.pickupLocation || USER_LOCATION;
          const targetPos  = ['delivering'].includes(order.status)
            ? (order.location || USER_LOCATION)
            : (order.pickupLocation || USER_LOCATION);
          const step   = 0.05;
          const newLat = currentPos.lat + (targetPos.lat - currentPos.lat) * step;
          const newLng = currentPos.lng + (targetPos.lng - currentPos.lng) * step;
          return { ...order, riderLocation: { lat: newLat, lng: newLng } };
        }
        return order;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Polling fallback for active orders (every 60s) ─────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const poll = setInterval(async () => {
      const activeStatuses = ['pending','preparing','ready_to_pickup','rider_accepted','picking_up','delivering','delivered'];
      const { data } = await supabase
        .from('orders')
        .select('id, status, data')
        .in('status', activeStatuses)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!data?.length) return;

      // Auto-complete 'delivered' orders older than 15 min (customer didn't confirm)
      // Only the rider who delivered OR admin triggers — prevents every client from firing simultaneously
      const AUTO_COMPLETE_MS = 15 * 60 * 1000;
      const _uid   = currentUserRef.current?.id;
      const _email = currentUserRef.current?.email;
      data.filter(r => r.status === 'delivered').forEach(r => {
        const o = r.data;
        let deliveredMs = o?.deliveredAtMs;
        if (!deliveredMs && o?.deliveredAt) {
          const parsed = new Date(o.deliveredAt.includes(' ') && !o.deliveredAt.includes('T') ? o.deliveredAt.replace(' ', 'T') : o.deliveredAt).getTime();
          if (!isNaN(parsed)) deliveredMs = parsed;
        }
        if (!deliveredMs) return;
        if (Date.now() - deliveredMs < AUTO_COMPLETE_MS) return;
        const isOrderRider = _uid && o.riderUserId === _uid;
        const isAdminUser  = !!ADMIN_EMAIL && _email === ADMIN_EMAIL;
        if (!isOrderRider && !isAdminUser) return;
        const gpFoodRate    = (appConfig?.gpFood ?? 30) / 100;
        const gpDelivRate   = (appConfig?.gpDelivery ?? 15) / 100;
        const gpRideRate    = (appConfig?.gpRide ?? 15) / 100;
        const gpServiceRate = (appConfig?.gpService ?? 15) / 100;
        supabase.rpc('process_order_settlement', {
          p_order_id: r.id,
          p_gp_food_rate: gpFoodRate,
          p_gp_delivery_rate: gpDelivRate,
          p_gp_ride_rate: gpRideRate,
          p_gp_service_rate: gpServiceRate,
        });
      });

      setOrders(prev => {
        const incoming = data.map(r => r.data).filter(Boolean);
        const map = new Map(prev.map(o => [o.id, o]));
        let changed = false;
        incoming.forEach(o => {
          const existing = map.get(o.id);
          if (canApplyOrderUpdate(existing, o)) {
            // Preserve animated local riderLocation if incoming record lacks it
            const merged = existing?.riderLocation && !o.riderLocation
              ? { ...o, riderLocation: existing.riderLocation }
              : o;
            const rank    = ORDER_STATUS_RANK[merged.status] ?? -1;
            const oldRank = ORDER_STATUS_RANK[existing?.status] ?? -1;
            if (rank > oldRank || JSON.stringify(existing) !== JSON.stringify(merged)) {
              map.set(merged.id, merged);
              changed = true;
            }
          }
        });
        return changed ? Array.from(map.values()) : prev;
      });
    }, 60000);
    return () => clearInterval(poll);
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setNewAddr(prev => ({ ...prev, location: loc, fullAddr: addr }));
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
      setNewAddr(prev => ({ ...prev, location: loc }));
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
    if (!location) return;
    const uid = currentUser?.id || userProfile?.id;
    const nextAddresses = !userAddresses?.length
      ? [{ id: 1, label: 'Casa', address: 'Morada actual', location }]
      : userAddresses.map((a, idx) => idx === 0 ? { ...a, location } : a);
    setUserProfile(prev => ({ ...prev, location }));
    setUserAddresses(nextAddresses);
    if (uid) {
      const { error } = await supabase.from('profiles')
        .update({ location, addresses: nextAddresses }).eq('id', uid);
      if (error) console.error('Location update error:', error);
      else if (persistedProfileRef.current?.userId === uid) {
        persistedProfileRef.current = {
          userId: uid,
          signature: JSON.stringify({
            name: userProfile.name, phone: userProfile.phone,
            avatar: userProfile.image || null, location, addresses: nextAddresses,
          }),
        };
      }
    }
    notifySystem('📍 Localização guardada', 'A localização principal foi actualizada', 'success');
  }, [currentUser?.id, userProfile, userAddresses]);

  const handleAddAddress = (addr) => {
    const loc = addr.location || USER_LOCATION;
    setUserAddresses(prev => [...prev, { id: generateId(), label: addr.label, address: addr.fullAddr, location: loc }]);
    notifySystem('Concluído', 'Morada guardada', 'success');
  };

  const handleUpdateAddress = useCallback(async (id, location, label, fullAddr) => {
    const addr = fullAddr || await reverseGeocode(location.lat, location.lng).catch(() => `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`);
    setUserAddresses(prev => prev.map(a => a.id === id ? { ...a, location, address: addr, ...(label ? { label } : {}) } : a));
    notifySystem('📍 Localização actualizada', 'A nova localização da morada foi guardada', 'success');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteAddress = (id) => setUserAddresses(prev => prev.filter(a => a.id !== id));

  // ── Rider location update ─────────────────────────────────────────────────
  const _lastGpsWriteRef = useRef(0); // throttle: write to Supabase at most once per 5s

  const updateRiderWorkingLocation = useCallback((riderId, location, isAvailable = true) => {
    if (!riderId || !location) return;

    // 1. Update local riders state immediately
    setRiders(prev => prev.map(r =>
      r.id === riderId
        ? { ...r, location, current_lat: location.lat, current_lng: location.lng, is_available: isAvailable }
        : r,
    ));

    const now = Date.now();
    if (now - _lastGpsWriteRef.current < 5000) return; // throttle
    _lastGpsWriteRef.current = now;

    // 2. Persist GPS and availability to riders table (columns added by migration 001)
    supabase.from('riders').update({
      is_available: isAvailable,
      current_lat: location.lat,
      current_lng: location.lng,
      last_location_at: new Date().toISOString(),
    }).eq('id', riderId).then(() => {});

    // 3. Update riderLocation on any active order so customers see real-time movement
    setOrders(prev => {
      const activeStatuses = ['rider_accepted', 'picking_up', 'delivering'];
      let changed = false;
      const next = prev.map(o => {
        if (!activeStatuses.includes(o.status) || o.riderId !== riderId) return o;
        changed = true;
        const updated = { ...o, riderLocation: location };
        supabase.from('orders')
          .update({ data: updated })
          .eq('id', o.id)
          .then(() => {});
        return updated;
      });
      return changed ? next : prev;
    });
  }, []);  

  // ── Manual role/pending sync from Supabase ───────────────────────────────
  const syncRoles = useCallback(async () => {
    const uid = currentUser?.id || userProfile?.id;
    if (!uid) return;
    const [rolesResult, pendingResult] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', uid),
      supabase.from('pending_requests').select('id, data'),
    ]);
    const latest = rolesResult.data?.map(r => r.role) || [];
    if (latest.length > 0) {
      setUserRoles(latest);
    }
    if (pendingResult.data?.length) setPendingRequests(pendingResult.data.map(r => r.data));
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
          const prof = { id: 'dev-user-id', name: 'Cliente de teste (Dev)', phone: '0812345678', email: email || 'customer@pedeja.local', location: USER_LOCATION };
          setIsLoggedIn(true);
          setCurrentUser({ id: 'dev-user-id', email: prof.email, ...prof, roles: ['customer'] });
          setUserProfile(prof);
          setTempProfile(prof);
          setUserRoles(['customer']);
          setUsercarteira(1000);
          setUserAddresses([{ id: 1, label: 'Casa', address: 'Adicione a sua morada', location: USER_LOCATION }]);
          notifySystem('Sessão iniciada (Dev Mode)', 'Bem-vindo ao sistema', 'success');
          return;
        }
        return notifySystem('Erro', 'E-mail/palavra-passe inválidos', 'error');
      }
      const { data: profile } = await supabase.from('profiles').select('banned').eq('id', signInRes.data.user.id).maybeSingle();
      if (profile?.banned) {
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
    if (restaurantId && restaurantRating) {
      let updatedRest;
      setRestaurants(prev => prev.map(r => {
        if (r.id !== restaurantId) return r;
        const prevCount = r.ratingCount || 0;
        const count = prevCount + 1;
        const avg = parseFloat((((r.rating || 5) * prevCount + restaurantRating) / count).toFixed(1));
        updatedRest = { ...r, rating: avg, ratingCount: count };
        return updatedRest;
      }));
      if (updatedRest) supabase.from('restaurants').update({ data: updatedRest }).eq('id', restaurantId).then(() => {});
    }
    if (riderId && riderRating) {
      let updatedRider;
      setRiders(prev => prev.map(r => {
        if (r.id !== riderId) return r;
        const prevCount = r.ratingCount || 0;
        const count = prevCount + 1;
        const avg = parseFloat((((r.avgRating || 5) * prevCount + riderRating) / count).toFixed(1));
        updatedRider = { ...r, avgRating: avg, ratingCount: count };
        return updatedRider;
      }));
      if (updatedRider) supabase.from('riders').update({ data: updatedRider }).eq('id', riderId).then(() => {});
    }
    const ratedOrder = { ...orderToRate, rated: true, ratingComment: comment };
    setOrders(prev => prev.map(o => o.id === orderId ? ratedOrder : o));
    supabase.from('orders').update({ data: ratedOrder }).eq('id', orderId).then(() => {});
    setShowRatingModal(false);
    setRatingOrderData(null);
    notifySystem('Obrigado! 🌟', 'A sua avaliação foi guardada', 'success');
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

