import React, { useState, useRef, useEffect } from 'react';
import { generateAiReply } from '../lib/aiGateway.js';
import ReactDOM from 'react-dom';
import { X, Bot, Send, Loader2, Sparkles, User, ShoppingBag, Star, Store, Plus, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateId, formatDateTime, playOrderNotificationSound, getDistanceFromLatLonInKm, isValidCoordinate } from '../utils';
import { USER_LOCATION } from '../constants';

const STATUS_MAP = {
  pending: '',
  preparing: '',
  ready_to_pickup: '',
  rider_accepted: '',
  picking_up: '',
  delivering: '',
  delivered: ' ()',
  completed: '',
  cancelled: '',
};

const SYSTEM_PROMPT = `És o Assistente Pedejá, o apoio digital da aplicação Pedejá em Angola.
Responde sempre em português, com clareza e cordialidade. Ajudas com Fome, Compras, Pedidos, Pacotes, Moradas, Pagamentos, Carteira e Suporte.
Usa apenas dados reais fornecidos pelo sistema. Nunca inventes saldo, movimentos, preços, taxas, estados, estafetas, localizações, prazos ou operações financeiras. Se uma informação não estiver disponível, explica que está indisponível e orienta o cliente para o suporte.`;

const GEMINI_TOOLS = [
  {
    function_declarations: [
      {
        name: 'list_all_restaurants',
        description: ' BoomRider ',
        parameters: {
          type: 'OBJECT',
          properties: {
            keyword: { type: 'STRING', description: '  ()' },
          },
        },
      },
      {
        name: 'get_restaurant_menu',
        description: ' ',
        parameters: {
          type: 'OBJECT',
          properties: {
            restaurantName: { type: 'STRING', description: '  ()' },
          },
        },
      },
      {
        name: 'place_food_order',
        description: '   ',
        parameters: {
          type: 'OBJECT',
          properties: {
            restaurantName: { type: 'STRING', description: ' ' },
            items: {
              type: 'ARRAY',
              description: '',
              items: {
                type: 'OBJECT',
                properties: {
                  itemName: { type: 'STRING', description: '' },
                  qty: { type: 'NUMBER', description: '/' },
                },
                required: ['itemName', 'qty'],
              },
            },
            paymentMethod: { type: 'STRING', description: " 'wallet'  'cash'" },
            notes: { type: 'STRING', description: '' },
          },
          required: ['restaurantName', 'items'],
        },
      },
      {
        name: 'place_parcel_order',
        description: '/   ',
        parameters: {
          type: 'OBJECT',
          properties: {
            pickup: { type: 'STRING', description: '/' },
            dropoff: { type: 'STRING', description: '/' },
            receiverName: { type: 'STRING', description: '' },
            receiverPhone: { type: 'STRING', description: '' },
            weight: { type: 'STRING', description: ' (.)' },
            paymentMethod: { type: 'STRING', description: " 'wallet'  'cash'" },
          },
          required: ['pickup', 'dropoff'],
        },
      },
      {
        name: 'send_order_chat_message',
        description: '  ',
        parameters: {
          type: 'OBJECT',
          properties: {
            orderId: { type: 'STRING', description: "ID   'latest' " },
            message: { type: 'STRING', description: '//' },
          },
          required: ['message'],
        },
      },
      {
        name: 'check_order_status',
        description: '',
        parameters: {
          type: 'OBJECT',
          properties: {
            orderId: { type: 'STRING', description: 'ID  ()' },
          },
        },
      },
      {
        name: 'get_system_health_report',
        description: ' BoomRider ( Admin )',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
    ],
  },
];

export default function AIChatModal({ isOpen, onClose }) {
  const {
    userProfile,
    currentUser,
    orders,
    setOrders,
    userAddresses,
    userWallet,
    creditWalletLocal,
    restaurants,
    menuItems,
    appConfig,
    notifyAdmin,
    notifySystem,
    supabase,
    activeRole,
    setSelectedRestaurant,
    addToCart,
  } = useApp();

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: ` ${userProfile?.name || currentUser?.name || ''}! 🛵✨  Assistente Pedejá\n, , ,  ! ?`,
      time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Initialize initial welcome message if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          sender: 'bot',
          text: ` ${userProfile?.name || currentUser?.name || ''}! 🛵✨  Assistente Pedejá   Wallet  ?`,
          time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [userProfile?.name, currentUser?.name, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const isAdminUser = activeRole === 'admin' || userProfile?.roles?.includes('admin') || currentUser?.roles?.includes('admin');

  const quickPrompts = [
    ...(isAdminUser ? ['🛡️ '] : []),
    '📦 ',
    '💳  Wallet',
    '🚚 ',
  ];

  const currentUserId = userProfile?.id || currentUser?.id || '';
  const balanceNum = typeof userWallet === 'number' ? userWallet : Number(userWallet?.balance || 0);

  const getActiveOrders = () => {
    return (orders || []).filter(
      (o) =>
        (o.customerId === currentUserId || (!o.customerId && currentUserId)) &&
        o.status !== 'completed' &&
        o.status !== 'cancelled'
    );
  };

  const activeOrders = getActiveOrders();

  // Format real-time context for System Prompt
  const buildContextPrompt = () => {
    const activeOrderSummary = activeOrders
      .map((o, idx) => {
        const typeStr = o.type === 'parcel' ? '' : ` (${o.restaurantName || ''})`;
        const statusStr = STATUS_MAP[o.status] || o.status;
        const riderStr = o.riderName ? ` | : ${o.riderName}` : '';
        return `${idx + 1}.  #${o.id.slice(-6)} [${typeStr}] - : ${statusStr} - : ${o.grandTotal || o.total || o.amount || 0}${riderStr}`;
      })
      .join('\n');

    const openShops = (restaurants || [])
      .filter((r) => r.status === 'open')
      .slice(0, 5)
      .map((r) => `- ${r.name} (⭐ ${r.rating || 5.0},  ${r.deliveryFee ?? 15})`)
      .join('\n');

    return ` " (BoomBot)" Assistente Pedejá  BoomRider
   (/) :

[]
- : ${userProfile?.name || currentUser?.name || ''}
- : ${userProfile?.phone || ''}
- : ${activeRole || 'customer'} ${isAdminUser ? '( Admin)' : ''}
-  Wallet: ${balanceNum.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${isAdminUser ? `[ Admin]
-  "get_system_health_report"  Real-time  Admin ` : ''}

[ (${activeOrders.length} )]
${activeOrderSummary || ''}

[]
${openShops || ''}

   ${balanceNum.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  `;
  };

  // ── Local Tool Execution Handlers ──────────────────────────────────────────

  const executeListAllRestaurants = async (args) => {
    const keyword = (args?.keyword || '').trim().toLowerCase();
    const allShops = restaurants || [];

    if (allShops.length === 0) {
      return {
        text: ' 🏪',
      };
    }

    let filteredShops = allShops;
    if (keyword) {
      filteredShops = allShops.filter(
        (r) =>
          r.name.toLowerCase().includes(keyword) ||
          (r.category || '').toLowerCase().includes(keyword)
      );
    }

    if (filteredShops.length === 0) {
      filteredShops = allShops;
    }

    const custLoc = isValidCoordinate(userProfile?.location) ? userProfile.location : (userAddresses?.[0]?.location || USER_LOCATION);
    const baseFee = appConfig?.baseFee || 30;
    const perKmFee = appConfig?.perKmFee || 10;

    const shopsWithDetails = filteredShops.map((shop) => {
      const shopLoc = shop.location;
      let dist = 1;
      if (isValidCoordinate(custLoc) && isValidCoordinate(shopLoc)) {
        dist = getDistanceFromLatLonInKm(custLoc.lat, custLoc.lng, shopLoc.lat, shopLoc.lng);
        if (dist <= 0) dist = 1;
      }
      const fee = baseFee + Math.ceil(dist) * perKmFee;
      const itemCount = (menuItems[shop.id] || []).filter((m) => m.available !== false).length;

      return {
        ...shop,
        distance: dist.toFixed(1),
        deliveryFee: fee,
        itemCount,
      };
    });

    return {
      text: ` BoomRider  🏪✨\n !`,
      cardData: {
        type: 'all_restaurants',
        shops: shopsWithDetails,
      },
    };
  };

  const executeGetRestaurantMenu = async (args) => {
    const targetRestName = (args?.restaurantName || '').trim();
    const allShops = restaurants || [];
    const openShops = allShops.filter((r) => r.status === 'open');

    if (allShops.length === 0) {
      return {
        text: '  🍔',
      };
    }

    let matchedShop = null;
    if (targetRestName) {
      matchedShop = (openShops.length > 0 ? openShops : allShops).find(
        (r) =>
          r.name.toLowerCase().includes(targetRestName.toLowerCase()) ||
          targetRestName.toLowerCase().includes(r.name.toLowerCase())
      );
    }

    if (!matchedShop && targetRestName) {
      const anyMatched = allShops.find(
        (r) =>
          r.name.toLowerCase().includes(targetRestName.toLowerCase()) ||
          targetRestName.toLowerCase().includes(r.name.toLowerCase())
      );
      if (anyMatched) {
        matchedShop = anyMatched;
      }
    }

    if (!matchedShop) {
      matchedShop = openShops[0] || allShops[0];
    }

    const shopMenuItems = (menuItems[matchedShop.id] || []).filter((m) => m.available !== false);

    const custLoc = isValidCoordinate(userProfile?.location) ? userProfile.location : (userAddresses?.[0]?.location || USER_LOCATION);
    const shopLoc = matchedShop.location;
    let distance = 1;
    if (isValidCoordinate(custLoc) && isValidCoordinate(shopLoc)) {
      distance = getDistanceFromLatLonInKm(custLoc.lat, custLoc.lng, shopLoc.lat, shopLoc.lng);
      if (distance <= 0) distance = 1;
    }

    const baseFee = appConfig?.baseFee || 30;
    const perKmFee = appConfig?.perKmFee || 10;
    const deliveryFee = baseFee + Math.ceil(distance) * perKmFee;

    if (shopMenuItems.length === 0) {
      return {
        text: ` "${matchedShop.name}"  🍔`,
      };
    }

    return {
      text: ` "${matchedShop.name}" (${matchedShop.status === 'open' ? '🟢 ' : '🔴 '})  😋\n !`,
      cardData: {
        type: 'restaurant_menu',
        restaurant: matchedShop,
        items: shopMenuItems,
        distance: distance.toFixed(1),
        deliveryFee,
      },
    };
  };

  const executePlaceFoodOrder = async (args) => {
    const targetRestName = (args.restaurantName || '').trim();
    const openShops = (restaurants || []).filter((r) => r.status === 'open');

    if (openShops.length === 0) {
      return '  🍔';
    }

    let matchedShop = null;
    if (targetRestName) {
      matchedShop = openShops.find(
        (r) =>
          r.name.toLowerCase().includes(targetRestName.toLowerCase()) ||
          targetRestName.toLowerCase().includes(r.name.toLowerCase())
      );
    }

    if (!matchedShop) {
      if (targetRestName) {
        const availableShopNames = openShops.map((r) => `• ${r.name}`).join('\n');
        return `  "${targetRestName}" \n\n:\n${availableShopNames}`;
      }
      matchedShop = openShops[0];
    }

    const shopMenuItems = menuItems[matchedShop.id] || [];
    if (shopMenuItems.length === 0) {
      return `  "${matchedShop.name}" `;
    }

    const orderedItems = [];
    const missingItems = [];
    const rawItems = args.items || [];

    for (const itemArg of rawItems) {
      const argName = (itemArg.itemName || '').trim().toLowerCase();
      const qty = Math.max(1, Number(itemArg.qty) || 1);
      if (!argName) continue;

      const matchedMenu = shopMenuItems.find(
        (m) =>
          m.name.toLowerCase().includes(argName) ||
          argName.includes(m.name.toLowerCase())
      );

      if (matchedMenu) {
        orderedItems.push({
          id: matchedMenu.id,
          name: matchedMenu.name,
          price: matchedMenu.price,
          qty,
        });
      } else {
        missingItems.push(itemArg.itemName);
      }
    }

    if (orderedItems.length === 0) {
      const availableMenuNames = shopMenuItems.slice(0, 8).map((m) => `• ${m.name} (${m.price})`).join('\n');
      return `  "${matchedShop.name}"\n\n ${matchedShop.name}:\n${availableMenuNames}`;
    }

    // Validate coordinates
    const custLoc = isValidCoordinate(userProfile?.location) ? userProfile.location : (userAddresses?.[0]?.location || USER_LOCATION);
    const shopLoc = matchedShop.location;

    if (!isValidCoordinate(custLoc) || !isValidCoordinate(shopLoc)) {
      return `   📍`;
    }

    let distance = getDistanceFromLatLonInKm(custLoc.lat, custLoc.lng, shopLoc.lat, shopLoc.lng);
    if (distance <= 0) distance = 1;

    const foodTotal = orderedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const baseFee = appConfig?.baseFee || 30;
    const perKmFee = appConfig?.perKmFee || 10;
    const deliveryFee = baseFee + Math.ceil(distance) * perKmFee;
    const grandTotal = Math.max(0, foodTotal + deliveryFee);

    const paymentMethod = args.paymentMethod === 'cash' ? 'cash' : 'wallet';

    if (paymentMethod === 'wallet' && balanceNum < grandTotal) {
      return `  Wallet  ( ${balanceNum.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  ${grandTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})  💳`;
    }

    const addr = userAddresses?.[0] || { address: '', location: custLoc };
    const orderId = generateId();

    const { data: quote, error: quoteError } = await supabase.rpc('create_service_quote', {
      p_service_type: 'food',
      p_restaurant_id: matchedShop.id,
      p_address_id: addr.id ? String(addr.id) : null,
      p_pickup_lat: shopLoc.lat,
      p_pickup_lng: shopLoc.lng,
      p_dropoff_lat: custLoc.lat,
      p_dropoff_lng: custLoc.lng,
    });
    if (quoteError || !quote?.ok) {
      return `: ${quoteError?.message || quote?.reason || ''}`;
    }

    const newOrder = {
      id: orderId,
      quoteId: quote.quoteId,
      type: 'food',
      status: 'pending',
      customerId: currentUserId,
      customerName: userProfile?.name || currentUser?.name || '',
      customerPhone: userProfile?.phone || null,
      restaurantId: matchedShop.id,
      restaurantName: matchedShop.name,
      restaurantOwnerId: matchedShop.ownerId || null,
      restaurantLocation: shopLoc,
      pickupLocation: shopLoc,
      location: addr.location,
      address: addr.address,
      items: orderedItems,
      foodTotal,
      deliveryFee,
      promoDiscount: 0,
      grandTotal,
      paymentMethod,
      notes: args.notes || ' Assistente Pedejá',
      createdAt: formatDateTime(),
    };

    const { data: placed, error: placeError } = await supabase.rpc('place_customer_order', { p_order: newOrder });
    if (placeError || !placed?.ok) {
      return `: ${placeError?.message || placed?.reason || ''}`;
    }
    const authoritativeOrder = placed.order || newOrder;
    setOrders((prev) => [authoritativeOrder, ...prev.filter(o => o.id !== orderId)]);
    if (paymentMethod === 'wallet') {
      creditWalletLocal(currentUserId, -(authoritativeOrder.grandTotal || grandTotal), `  #${orderId.slice(-6)} ( AI)`);
    }

    notifyAdmin('🛎️  ( AI)', `${userProfile?.name || ''}  ${matchedShop.name} ${grandTotal}`, 'info');
    notifySystem('! 🎉', ` #${orderId.slice(-6)} `, 'success');
    playOrderNotificationSound();

    const itemListStr = orderedItems.map((i) => `• ${i.name} x${i.qty} (${i.price * i.qty})`).join('\n');
    let missingNote = '';
    if (missingItems.length > 0) {
      missingNote = `\n\n⚠️ :  (${missingItems.join(', ')}) `;
    }

    return `✅ ! 🎉\n\n: ${matchedShop.name}\n:\n${itemListStr}\n: ${foodTotal}\n (${distance.toFixed(1)} .): ${deliveryFee}\n: ${grandTotal} (${paymentMethod === 'wallet' ? ' Wallet' : ''})\n: #${orderId.slice(-6)}${missingNote}\n\n! 🍔🔔`;
  };

  const executePlaceParcelOrder = async (args) => {
    void args;
    return ' ';
  };

  const executeSendOrderChatMessage = async (args) => {
    const currentActiveOrders = getActiveOrders();
    let targetOrder = null;

    if (args.orderId && args.orderId !== 'latest') {
      targetOrder = (orders || []).find((o) => o.id.endsWith(args.orderId) || o.id === args.orderId);
    }
    if (!targetOrder && currentActiveOrders.length > 0) {
      targetOrder = currentActiveOrders[0];
    }

    if (!targetOrder) {
      return ' / 🛵';
    }

    const messageText = args.message || '';
    if (!messageText.trim()) {
      return '';
    }

    const newMessage = {
      text: `🤖 [ Assistente Pedejá]: ${messageText}`,
      sender: 'customer',
      senderName: userProfile?.name ? `${userProfile.name} ( AI)` : ' ( AI)',
      time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    };

    await supabase.rpc('append_chat_message', { p_order_id: targetOrder.id, p_message: newMessage });

    notifySystem(' 💬', ` #${targetOrder.id.slice(-6)} `, 'success');

    return `💬 !\n\n: "${messageText}"\n: #${targetOrder.id.slice(-6)} (${targetOrder.type === 'parcel' ? '' : targetOrder.restaurantName || ''})\n\n/! ✨`;
  };

  const executeCheckOrderStatus = async (args) => {
    const userOrders = (orders || []).filter(
      (o) => o.customerId === currentUserId || (!o.customerId && currentUserId)
    );

    if (userOrders.length === 0) {
      return ' ! 🛵✨';
    }

    const targetId = args?.orderId;
    if (targetId && targetId !== 'latest') {
      const matched = userOrders.find((o) => o.id.endsWith(targetId) || o.id === targetId);
      if (matched) {
        const typeStr = matched.type === 'parcel' ? '' : ` (${matched.restaurantName || ''})`;
        const statusStr = STATUS_MAP[matched.status] || matched.status;
        const riderStr = matched.riderName ? `\n: ${matched.riderName} (${matched.riderPhone || ''})` : '\n: ...';
        const itemsStr = matched.items ? `\n: ${matched.items.map((i) => `${i.name} x${i.qty}`).join(', ')}` : '';
        const routeStr = matched.type === 'parcel' ? `\n: ${matched.pickup}\n: ${matched.dropoff}` : '';

        return `📦  #${matched.id.slice(-6)} [${typeStr}]\n: ${statusStr}${riderStr}${itemsStr}${routeStr}\n: ${matched.grandTotal || matched.deliveryFee || 0}\n: ${matched.createdAt || ''}`;
      }
    }

    const activeList = getActiveOrders();
    if (activeList.length > 0) {
      const summaryList = activeList
        .map((o, idx) => {
          const typeStr = o.type === 'parcel' ? '' : ` (${o.restaurantName || ''})`;
          const statusStr = STATUS_MAP[o.status] || o.status;
          const riderStr = o.riderName ? ` | : ${o.riderName}` : '';
          return `${idx + 1}. #${o.id.slice(-6)} [${typeStr}]\n   • : ${statusStr}${riderStr}\n   • : ${o.grandTotal || o.deliveryFee || 0}`;
        })
        .join('\n\n');

      return `🛵  (${activeList.length} ):\n\n${summaryList}\n\n !`;
    }

    const latest = userOrders[0];
    const latestStatus = STATUS_MAP[latest.status] || latest.status;
    return `\n\n #${latest.id.slice(-6)} (${latest.type === 'parcel' ? '' : latest.restaurantName || ''})\n: ${latestStatus}\n: ${latest.createdAt || ''}\n\n! 🍔📦`;
  };

  const executeGetSystemHealthReport = async () => {
    if (!isAdminUser) {
      return {
        text: '🔒   (Admin) ',
      };
    }

    try {
      const { data, error } = await supabase.rpc('admin_get_system_health');

      if (error || !data) {
        console.error('admin_get_system_health RPC error:', error);
        return {
          text: `⚠️ : ${error?.message || ''}`,
        };
      }

      const isHealthy = data.system_status === 'healthy';
      const o = data.order_health || {};
      const w = data.wallet_health || {};
      const v = data.variance_health || {};
      const e = data.entity_counts || {};

      let statusMsg = isHealthy
        ? '🟢 **:  (Healthy)**\n!'
        : '⚠️ **: / (Action Required)**';

      const detailsList = [
        `📊 ****:`,
        `  • : ${o.total_orders || 0}  (: ${o.completed_orders || 0}, : ${o.cancelled_orders || 0})`,
        `  • : ${o.completed_unsettled_count > 0 ? `⚠️ ${o.completed_unsettled_count} ` : '0  🟢'}`,
        `  • : ${o.cancelled_unrefunded_count > 0 ? `⚠️ ${o.cancelled_unrefunded_count} ` : '0  🟢'}`,
        ``,
        `💳 ** Wallet &  (Ledger)**:`,
        `  • : ${w.total_wallets || 0}  (: ${(w.total_wallet_balance_sum || 0).toLocaleString('pt-AO')})`,
        `  • : ${w.negative_wallets_count > 0 ? `⚠️ ${w.negative_wallets_count} ` : '0  🟢'}`,
        `  •  Wallet vs Ledger (Variance): ${v.wallet_ledger_variance_count > 0 ? `⚠️  ${v.wallet_ledger_variance_count} ` : ' 100% 🟢'}`,
        ``,
        `🏢 ****:`,
        `  • : ${e.total_profiles || 0}  (: ${e.total_restaurants || 0}, : ${e.total_riders || 0})`,
        `  • : ${e.total_pending_requests || 0} `,
      ].join('\n');

      return {
        text: `🛡️ ** BoomRider** ( Admin)\n\n${statusMsg}\n\n${detailsList}`,
        cardData: {
          type: 'system_health',
          healthData: data,
        },
      };
    } catch (err) {
      console.error('executeGetSystemHealthReport exception:', err);
      return { text: ' ' };
    }
  };

  const executeTool = async (functionName, args) => {
    try {
      if (functionName === 'list_all_restaurants') {
        return await executeListAllRestaurants(args);
      } else if (functionName === 'get_restaurant_menu') {
        return await executeGetRestaurantMenu(args);
      } else if (functionName === 'place_food_order') {
        const res = await executePlaceFoodOrder(args);
        return typeof res === 'string' ? { text: res } : res;
      } else if (functionName === 'place_parcel_order') {
        const res = await executePlaceParcelOrder(args);
        return typeof res === 'string' ? { text: res } : res;
      } else if (functionName === 'send_order_chat_message') {
        const res = await executeSendOrderChatMessage(args);
        return typeof res === 'string' ? { text: res } : res;
      } else if (functionName === 'check_order_status') {
        const res = await executeCheckOrderStatus(args);
        return typeof res === 'string' ? { text: res } : res;
      } else if (functionName === 'get_system_health_report') {
        return await executeGetSystemHealthReport();
      }
      return { text: '' };
    } catch (err) {
      console.error('executeTool error:', err);
      return { text: ' ' };
    }
  };

  // ── Main Send Handler ──────────────────────────────────────────────────────

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText.trim();
    if (!text || loading) return;

    const userMsg = {
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      let replyText = '';

      const openShops = (restaurants || []).filter((r) => r.status === 'open');

      let replyCardData = null;

      const isListRestaurantsIntent =
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('');

      const isMenuIntent =
        !isListRestaurantsIntent &&
        (text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes(''));

      const isChatMessageIntent =
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('');

      const isPlaceFoodIntent =
        !isMenuIntent &&
        (text.includes('') || text.includes('') || text.includes(''));

      const isPlaceParcelIntent =
        text.includes('') || text.includes('') || text.includes('');

      const isSystemHealthIntent =
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('') ||
        text.includes('health check') ||
        text.includes('system health');

      if (isSystemHealthIntent) {
        const res = await executeGetSystemHealthReport();
        replyText = res.text;
        replyCardData = res.cardData || null;
      } else if (isListRestaurantsIntent) {
        const res = await executeListAllRestaurants({ keyword: text });
        replyText = res.text;
        replyCardData = res.cardData || null;
      } else if (isMenuIntent) {
        let cleanShopName = text
          .replace(/^(||||||)\s*/g, '')
          .replace(/(||||||)/g, '')
          .trim();
        const res = await executeGetRestaurantMenu({ restaurantName: cleanShopName });
        replyText = res.text;
        replyCardData = res.cardData || null;
      } else if (isChatMessageIntent) {
        const cleanMsg = text.replace(
          /^(||||)\s*/,
          ''
        );
        replyText = await executeSendOrderChatMessage({ message: cleanMsg || text });
      } else if (isPlaceFoodIntent && text.length < 30) {
        replyText = await executePlaceFoodOrder({
          restaurantName: openShops[0]?.name || '',
          items: [{ itemName: text, qty: 1 }],
          paymentMethod: 'wallet',
        });
      } else if (isPlaceParcelIntent) {
        replyText = await executePlaceParcelOrder({
          pickup: '',
          dropoff: '',
          paymentMethod: 'wallet',
        });
      } else if (text.includes('') || text.includes('')) {
        replyText = await executeCheckOrderStatus({});
      } else if (text.includes('Wallet') || text.includes('') || text.includes('')) {
        replyText = ` Wallet  ${balanceNum.toLocaleString('pt-AO', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}  ! 💳`;
      } else {
        const systemPromptWithContext = buildContextPrompt();
        const data = await generateAiReply({
          text,
          systemPrompt: `${SYSTEM_PROMPT}\n\n${systemPromptWithContext}`,
          tools: GEMINI_TOOLS,
        });

        if (data.functionCall) {
          const { name: fnName, args: fnArgs } = data.functionCall;
          const toolRes = await executeTool(fnName, fnArgs);
          replyText = toolRes.text;
          replyCardData = toolRes.cardData || null;
        } else {
          replyText = data.text;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: replyText,
          cardData: replyCardData,
          time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (error) {
      console.error('AI chat request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '  ',
          time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const portal = document.getElementById('modal-root') || document.body;

  const modal = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center z-[99999] p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-[560px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-purple-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 p-4 text-white shadow-md flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md border border-white/20">
              <img src="/pedeja-assistant-avatar.png" alt="Assistente Pedejá" className="w-9 h-9 rounded-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base"> Assistente Pedejá</h3>
                <Sparkles size={14} className="text-amber-300 animate-pulse" />
              </div>
              <p className="text-[11px] text-purple-200"> •  • /</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
          {messages.map((msg, idx) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={idx}
                className={`flex gap-2 ${isBot ? 'items-start' : 'items-end justify-end'}`}
              >
                {isBot && (
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs shrink-0 mt-1 shadow-sm">
                    <img src="/pedeja-assistant-avatar.png" alt="Assistente Pedejá" className="w-full h-full rounded-full object-cover" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                    isBot
                      ? 'bg-white text-gray-800 rounded-tl-xs border border-purple-50/80'
                      : 'bg-purple-600 text-white rounded-tr-xs'
                  }`}
                >
                  {msg.text}

                  {/* Render System Health Card if present */}
                  {msg.cardData && msg.cardData.type === 'system_health' && (
                    <div className="mt-2.5 pt-2.5 border-t border-purple-100 space-y-2">
                      <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-md border border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-purple-300">
                            <Activity size={16} className="text-purple-400 animate-pulse" />
                            <span>BoomRider System Health</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              msg.cardData.healthData?.system_status === 'healthy'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {msg.cardData.healthData?.system_status === 'healthy' ? 'Healthy 🟢' : 'Warning ⚠️'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                            <span className="text-slate-400 block text-[9px]"></span>
                            <span className={`font-mono text-xs font-bold ${msg.cardData.healthData?.order_health?.completed_unsettled_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {msg.cardData.healthData?.order_health?.completed_unsettled_count || 0} 
                            </span>
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                            <span className="text-slate-400 block text-[9px]"></span>
                            <span className={`font-mono text-xs font-bold ${msg.cardData.healthData?.wallet_health?.negative_wallets_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {msg.cardData.healthData?.wallet_health?.negative_wallets_count || 0} 
                            </span>
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                            <span className="text-slate-400 block text-[9px]"> Wallet/Ledger</span>
                            <span className={`font-mono text-xs font-bold ${msg.cardData.healthData?.variance_health?.wallet_ledger_variance_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {msg.cardData.healthData?.variance_health?.wallet_ledger_variance_count || 0} 
                            </span>
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                            <span className="text-slate-400 block text-[9px]"></span>
                            <span className="font-mono text-xs font-bold text-indigo-300">
                              {msg.cardData.healthData?.entity_counts?.total_pending_requests || 0} 
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                          <span className="flex items-center gap-1">
                            <ShieldCheck size={12} className="text-indigo-400" /> Authorized Admin Diagnostic
                          </span>
                          <span className="font-mono text-[8px]">
                            {new Date(msg.cardData.healthData?.timestamp || Date.now()).toLocaleTimeString('pt-AO')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render All Restaurants Card if present */}
                  {msg.cardData && msg.cardData.type === 'all_restaurants' && (
                    <div className="mt-2.5 pt-2.5 border-t border-purple-100 space-y-2">
                      <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                        <Store size={14} className="text-purple-600" />
                        <span> ({msg.cardData.shops.length} )</span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {msg.cardData.shops.map((shop) => (
                          <div
                            key={shop.id}
                            className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                  <span>{shop.name}</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium ${
                                      shop.status === 'open'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {shop.status === 'open' ? '' : ''}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Star size={10} className="fill-amber-400 text-amber-400" />
                                  <span>{shop.rating || 5.0}</span>
                                  <span>• {shop.distance} .</span>
                                  <span>•  {shop.deliveryFee}</span>
                                  <span>• {shop.itemCount} </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-50">
                              <button
                                type="button"
                                onClick={() => handleSend(` ${shop.name}`)}
                                className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs active:scale-95 transition-all"
                              >
                                📋 
                              </button>
                              {setSelectedRestaurant && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRestaurant(shop);
                                    onClose();
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs active:scale-95 transition-all"
                                >
                                  
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Restaurant & Menu Card if present */}
                  {msg.cardData && msg.cardData.type === 'restaurant_menu' && (
                    <div className="mt-2.5 pt-2.5 border-t border-purple-100 space-y-2">
                      <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store size={16} className="text-purple-600 shrink-0" />
                          <div>
                            <div className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                              <span>{msg.cardData.restaurant.name}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium ${
                                  msg.cardData.restaurant.status === 'open'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {msg.cardData.restaurant.status === 'open' ? '' : ''}
                              </span>
                            </div>
                            <div className="text-[10px] text-purple-600 flex items-center gap-1">
                              <Star size={10} className="fill-purple-500 text-purple-500" />
                              <span>{msg.cardData.restaurant.rating || 5.0}</span>
                              <span>• {msg.cardData.distance} .</span>
                              <span>•  {msg.cardData.deliveryFee}</span>
                            </div>
                          </div>
                        </div>
                        {setSelectedRestaurant && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRestaurant(msg.cardData.restaurant);
                              onClose();
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs active:scale-95 transition-all shrink-0"
                          >
                            
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {msg.cardData.items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white p-2 rounded-xl border border-gray-100 shadow-2xs flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded-lg shrink-0 bg-gray-50"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-800 text-[11px] truncate">{item.name}</div>
                                {item.desc && <div className="text-[9px] text-gray-400 truncate">{item.desc}</div>}
                                <div className="text-xs font-bold text-purple-700">{item.price}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSend(` ${item.name}  ${msg.cardData.restaurant.name} 1 `)
                                }
                                className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-0.5 shadow-xs active:scale-95 transition-all"
                              >
                                <ShoppingBag size={10} />
                                <span></span>
                              </button>
                              {addToCart && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    addToCart(
                                      item,
                                      msg.cardData.restaurant.id,
                                      msg.cardData.restaurant.name,
                                      Number(msg.cardData.distance)
                                    );
                                    notifySystem(' 🛒', `${item.name} `);
                                  }}
                                  className="bg-purple-100 hover:bg-purple-200 text-purple-700 p-1 rounded-lg text-[10px] font-medium shadow-xs active:scale-95 transition-all"
                                  title=""
                                >
                                  <Plus size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      isBot ? 'text-gray-400' : 'text-purple-200'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
                {!isBot && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs shrink-0 shadow-sm">
                    <User size={15} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2 items-center text-xs text-purple-600 bg-purple-50 p-3 rounded-2xl w-fit animate-pulse border border-purple-100">
              <Loader2 size={16} className="animate-spin" />
              <span>...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-3 py-2 bg-slate-100 border-t border-slate-200/60 overflow-x-auto flex gap-2 no-scrollbar shrink-0">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt.replace(/^[^\s]+\s/, ''))}
              className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 text-[11px] font-medium rounded-full border border-purple-200/80 shrink-0 shadow-xs transition-colors active:scale-95"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder=",  ..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputText.trim() || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-full shadow-md transition-all active:scale-95 disabled:opacity-40 shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, portal);
}
