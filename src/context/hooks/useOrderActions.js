import { generateId, formatDateTime, r2 } from '../../utils.js';

export function useOrderActions(deps) {
  const {
    orders, setOrders,
    cart, setCart,
    riders, appConfig,
    currentUser, userProfile, userAddresses,
    parcelDetails,
    paymentMethod,
    pendingRequests, setPendingRequests,
    selectedOrderToCancel, setSelectedOrderToCancel,
    setCancelReasonInput,
    setShowCancelModal,
    setSelectedRestaurant, setActiveTab,
    placingOrderRef,
    fetchUserWallet,
    notifySystem, notifyAdmin,
    supabase,
  } = deps;

  const calculateDeliveryFee = (distance) => appConfig.baseFee + (Math.ceil(distance) * appConfig.perKmFee);
  const calculateFoodTotal   = () => cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const isPending = (type) => pendingRequests.some(r => r.type === type && r.userId === userProfile.id);
  const hasPendingCancelRequest = (orderId) =>
    pendingRequests.some(r => r.type === 'cancel_order' && r.data?.orderId === orderId);

  // Helper to fetch server quote prior to order placement
  const _fetchServiceQuote = async (payload) => {
    const { data: quoteRes, error: quoteErr } = await supabase.rpc('create_service_quote', payload);
    if (quoteErr) {
      console.error('[quoteEngine] Error fetching server quote:', quoteErr);
      return { ok: false, reason: quoteErr.message || 'Não foi possível obter o orçamento do servidor.' };
    }
    if (!quoteRes || !quoteRes.ok) {
      return { ok: false, reason: quoteRes?.reason || 'Não foi possível criar o orçamento.' };
    }
    return { ok: true, quote: quoteRes };
  };

  // Returns the settlement split used by the remaining food/parcel flows
  const _settlementAmounts = (order) => {
    const gpFoodRate    = (appConfig.gpFood ?? 30) / 100;
    const gpDelivRate   = (appConfig.gpDelivery ?? 15) / 100;

    const foodTotal   = r2(order.foodTotal   || 0);
    const deliveryFee = r2(order.deliveryFee || 0);

    if (order.type === 'parcel') {
      const adminGP     = r2(deliveryFee * gpDelivRate);
      const riderIncome = r2(deliveryFee - adminGP);
      return { foodTotal: 0, deliveryFee, gpAmount: adminGP, merchantIncome: 0, riderIncome };
    }


    return {
      foodTotal,
      deliveryFee,
      gpAmount:       r2(foodTotal * gpFoodRate),
      merchantIncome: r2(foodTotal * (1 - gpFoodRate)),
      riderIncome:    deliveryFee,
    };
  };

  const _rpcErrorMessage = (error) => error?.message || 'A operação não foi concluída no servidor.';

  const _mapAuthoritativeOrder = (detail) => {
    if (!detail?.orderId) return null;
    const statusMap = {
      DRAFT: 'pending',
      PENDING_PAYMENT: 'pending',
      PAID: 'pending',
      ACCEPTED: 'accepted',
      PREPARING: 'preparing',
      READY: 'ready_to_pickup',
      ASSIGNED: 'rider_accepted',
      PICKED_UP: 'picking_up',
      DELIVERING: 'delivering',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
      FAILED: 'cancelled',
    };
    return {
      id: detail.orderId,
      orderReference: detail.orderReference,
      type: 'food',
      status: statusMap[detail.status] || String(detail.status || '').toLowerCase(),
      paymentStatus: detail.paymentStatus,
      paymentMethod: String(detail.paymentMethod || 'CASH').toLowerCase(),
      customerId: currentUser?.id || userProfile?.id || '',
      businessId: detail.businessId,
      restaurantId: detail.businessId,
      restaurantName: detail.businessName || 'Comerciante',
      currency: detail.currencyCode || 'AOA',
      subtotal: Number(detail.subtotal || 0),
      foodTotal: Number(detail.subtotal || 0),
      deliveryFee: Number(detail.deliveryFee || 0),
      serviceFee: Number(detail.serviceFee || 0),
      discount: Number(detail.discountAmount || 0),
      grandTotal: Number(detail.totalAmount || 0),
      totalAmount: Number(detail.totalAmount || 0),
      items: (detail.items || []).map(item => ({
        id: item.productId || item.id,
        originalId: item.productId || item.id,
        name: item.name,
        price: Number(item.unitPrice || 0),
        qty: item.quantity,
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal || 0),
      })),
      deliveryAddress: detail.deliveryAddress
        ? Object.values(detail.deliveryAddress).filter(Boolean).join(', ')
        : '',
      recipientName: detail.recipientName || '',
      recipientPhone: detail.recipientPhone || '',
      notes: detail.customerNote || detail.deliveryInstructions || '',
      riderId: detail.delivery?.riderId || null,
      riderName: detail.delivery?.riderName || null,
      createdAt: detail.placedAt || new Date().toISOString(),
      placedAt: detail.placedAt || null,
      acceptedAt: detail.acceptedAt || null,
      deliveredAt: detail.deliveredAt || null,
      cancelledAt: detail.cancelledAt || null,
      rated: false,
    };
  };

  const _fetchAuthoritativeOrder = async (orderId) => {
    const { data, error } = await supabase.rpc('get_customer_order_detail', { p_order_id: orderId });
    if (error) return { ok: false, reason: _rpcErrorMessage(error) };
    const order = _mapAuthoritativeOrder(data);
    return order ? { ok: true, order } : { ok: false, reason: 'O servidor não devolveu o pedido criado.' };
  };

  const _createCustomerFoodOrder = async ({ businessId, addressId, items, notes, deliveryInstructions }) => {
    const idempotencyKey = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${generateId()}`;
    const { data: orderId, error } = await supabase.rpc('create_customer_order', {
      p_business_id: businessId,
      p_delivery_address_id: addressId,
      p_items: items,
      p_customer_note: notes || null,
      p_delivery_instructions: deliveryInstructions || null,
      p_idempotency_key: idempotencyKey,
    });
    if (error) return { ok: false, reason: _rpcErrorMessage(error) };
    if (!orderId) return { ok: false, reason: 'O servidor não devolveu o identificador do pedido.' };
    return _fetchAuthoritativeOrder(orderId);
  };

  const addToCart = (item, restaurantId, restaurantName, distance, selectedOptions = [], optionsExtraPrice = 0) => {
    if (!item.available) return notifySystem('Produto indisponível', 'Este produto não está disponível.', 'error');

    const itemPrice = item.price + optionsExtraPrice;
    const optionKeys = selectedOptions.map(o => `${o.name}:${o.price}`).join('|');
    const cartItemId = optionKeys ? `${item.id}-${optionKeys}` : String(item.id);

    const newItemObj = {
      ...item,
      id: cartItemId,
      originalId: item.id,
      name: item.name,
      price: itemPrice,
      basePrice: item.price,
      selectedOptions: selectedOptions || [],
      restaurantId,
      restaurantName,
      qty: 1,
      distance
    };

    if (cart.length > 0 && cart[0].restaurantId !== restaurantId) {
      if (!window.confirm('Começar um novo pedido deste comerciante? O carrinho actual será limpo.')) return;
      setCart([newItemObj]);
    } else {
      const existing = cart.find(c => c.id === cartItemId);
      if (existing) {
        setCart(cart.map(c => c.id === cartItemId ? { ...c, qty: c.qty + 1 } : c));
      } else {
        setCart([...cart, newItemObj]);
      }
      notifySystem('Adicionado ao carrinho', `${item.name} foi adicionado.`, 'success');
    }
  };

  const placeOrder = async (promoDiscount = 0, notes = '') => {
    if (placingOrderRef.current || cart.length === 0) return;
    placingOrderRef.current = true;
    try {
      void promoDiscount;
      if (!['cash','wallet','card'].includes(paymentMethod)) return notifySystem('Método de pagamento', 'Escolha um método de pagamento.', 'error');

      const primaryAddr = userAddresses?.find(address => address.isDefault) || userAddresses?.[0];
      const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      if (!isUuid(primaryAddr?.id)) {
        return notifySystem('Morada necessária', 'Adicione e guarde uma morada de entrega válida antes de fazer o pedido.', 'error');
      }

      const businessId = cart[0]?.restaurantId;
      const items = cart.map(item => ({
        product_id: item.originalId || item.id,
        quantity: item.qty,
      }));
      if (!isUuid(businessId) || items.some(item => !isUuid(item.product_id) || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
        return notifySystem('Carrinho inválido', 'Actualize o menu antes de tentar novamente.', 'error');
      }

      const result = await _createCustomerFoodOrder({
        businessId,
        addressId: primaryAddr.id,
        items,
        notes,
        deliveryInstructions: primaryAddr.deliveryInstructions,
      });
      if (!result.ok) return notifySystem('Não foi possível fazer o pedido', result.reason, 'error');

      let finalOrder = result.order;
      if (paymentMethod === 'wallet') {
        const idempotencyKey = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${generateId()}`;
        const { error: walletError } = await supabase.rpc('customer_pay_order_with_wallet', { p_order_id: result.order.id, p_idempotency_key: idempotencyKey });
        if (walletError) return notifySystem('Pagamento não concluído', walletError.message || 'O pagamento com a Carteira Pedejá não foi aceite.', 'error');
        const refreshed = await _fetchAuthoritativeOrder(result.order.id);
        if (!refreshed.ok) return notifySystem('Erro ao actualizar pedido', refreshed.reason, 'error');
        finalOrder = refreshed.order;
      } else if (paymentMethod === 'card') {
        return notifySystem('Cartão ainda não disponível', 'O provedor de cartão ainda não está configurado. Escolhe Dinheiro ou Carteira.', 'error');
      }
      setOrders(prev => [finalOrder, ...prev.filter(order => order.id !== finalOrder.id)]);
      notifyAdmin('🛎️ Novo pedido', `${userProfile.name || 'Cliente'} pediu em ${result.order.restaurantName}`, 'info');
      setCart([]);
      setSelectedRestaurant(null);
      setActiveTab('orders');
      notifySystem('Pedido criado', `Pedido #${result.order.orderReference || result.order.id.slice(-6)} enviado ao comerciante.`, 'success');
    } finally {
      placingOrderRef.current = false;
    }
  };

  const placeParcelOrder = async () => {
    if (!parcelDetails.pickupAddressId) return notifySystem('Morada de recolha necessária', 'Escolha uma morada guardada pertencente à sua conta.', 'error');
    if (!parcelDetails.receiverName || !parcelDetails.receiverPhone || !parcelDetails.dropoff || !parcelDetails.packageDescription) return notifySystem('Dados incompletos', 'Indique destino, destinatário e descrição do pacote antes de continuar.', 'error');
    if (!parcelDetails.dropoffLocation || !Number.isFinite(Number(parcelDetails.dropoffLocation.lat)) || !Number.isFinite(Number(parcelDetails.dropoffLocation.lng))) return notifySystem('Localização necessária', 'Confirme a localização do destino.', 'error');
    if (!parcelDetails.consentAccepted) return notifySystem('Consentimento necessário', 'Confirme que não está a enviar artigos proibidos ou ilegais.', 'error');
    const parts = String(parcelDetails.dropoff).split(',').map(v => v.trim()).filter(Boolean);
    const { data: quote, error: quoteError } = await supabase.rpc('customer_enviar_quote', {
      p_pickup_address_id: parcelDetails.pickupAddressId,
      p_recipient_name: parcelDetails.receiverName,
      p_recipient_phone: parcelDetails.receiverPhone,
      p_recipient_address_line_1: parts[0] || parcelDetails.dropoff,
      p_recipient_address_line_2: null,
      p_recipient_neighborhood: parts[1] || null,
      p_recipient_municipality: parts[2] || null,
      p_recipient_city: parts[3] || 'Luanda',
      p_recipient_province: parts[4] || 'Luanda',
      p_recipient_latitude: Number(parcelDetails.dropoffLocation.lat),
      p_recipient_longitude: Number(parcelDetails.dropoffLocation.lng),
      p_package_description: parcelDetails.packageDescription,
      p_package_weight_kg: Number(parcelDetails.weight || 1),
      p_package_size: parcelDetails.packageSize || 'SMALL',
      p_is_fragile: Boolean(parcelDetails.fragile),
      p_customer_note: parcelDetails.customerNote || null,
    });
    if (quoteError || !quote?.quote_id) return notifySystem('Não foi possível preparar o envio', quoteError?.message || 'O servidor não devolveu uma cotação válida.', 'error');
    const option = (quote.options || []).find(o => o.recommended) || (quote.options || [])[0];
    if (!option) return notifySystem('Sem veículo disponível', 'Neste momento não existe um veículo elegível para este envio.', 'error');
    const { data: policy } = await supabase.rpc('get_active_enviar_policy');
    const policyRow = Array.isArray(policy) ? policy[0] : policy;
    if (!policyRow?.id) return notifySystem('Política de envio indisponível', 'O envio não pode ser confirmado até existir uma política de envio publicada.', 'error');
    const { data: consentId, error: consentError } = await supabase.rpc('accept_enviar_policy', { p_quote_id: quote.quote_id, p_policy_version_id: policyRow.id });
    if (consentError || !consentId) return notifySystem('Consentimento não concluído', consentError?.message || 'Não foi possível registar o consentimento.', 'error');
    const idem = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${generateId()}`;
    const rpcName = parcelDetails.scheduledFor ? 'schedule_customer_enviar_shipment' : 'create_customer_enviar_shipment';
    const rpcArgs = parcelDetails.scheduledFor
      ? { p_quote_id: quote.quote_id, p_selected_vehicle_type: option.vehicle_type, p_policy_consent_id: consentId, p_scheduled_for: new Date(parcelDetails.scheduledFor).toISOString(), p_idempotency_key: idem }
      : { p_quote_id: quote.quote_id, p_selected_vehicle_type: option.vehicle_type, p_policy_consent_id: consentId, p_idempotency_key: idem };
    const { data: shipmentId, error: createError } = await supabase.rpc(rpcName, rpcArgs);
    if (createError || !shipmentId) return notifySystem('Não foi possível criar o envio', createError?.message || 'O servidor recusou a criação do envio.', 'error');
    if (paymentMethod === 'wallet') {
      const { error: payError } = await supabase.rpc('customer_pay_enviar_with_wallet', { p_shipment_id: shipmentId, p_idempotency_key: idem });
      if (payError) return notifySystem('Pagamento não concluído', payError.message || 'Não foi possível pagar com a Carteira Pedejá.', 'error');
    } else if (paymentMethod === 'card') {
      return notifySystem('Cartão ainda não disponível', 'O provedor de cartão ainda não está configurado. Escolhe Dinheiro ou Carteira.', 'error');
    }
    setActiveTab('packages');
    notifySystem('Envio criado', 'O teu envio foi registado pelo servidor.', 'success');
  };

  const _updateOrder = async (orderId, patch) => {
    let currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) {
      const { data: dbRow } = await supabase
        .from('orders')
        .select('data')
        .eq('id', orderId)
        .maybeSingle();
      if (dbRow?.data) currentOrder = dbRow.data;
    }
    if (!currentOrder || !patch.status) return false;

    const { data: result, error } = await supabase.rpc('transition_order_status', {
      p_order_id: orderId,
      p_new_status: patch.status,
      p_extra_data: patch,
    });
    if (error || !result?.ok) {
      console.error('[updateOrderStatus] transition error:', error || result?.reason);
      notifySystem('ผิดพลาด', result?.reason || error?.message || 'ไม่สามารถเปลี่ยนสถานะออเดอร์ได้', 'error');
      return false;
    }

    const updated = result.order_data || { ...currentOrder, ...patch };
    setOrders(prev => {
      const exists = prev.some(o => o.id === orderId);
      return exists
        ? prev.map(o => (o.id === orderId ? updated : o))
        : [updated, ...prev];
    });
    return true;
  };

  const acceptOrder = async (orderId) => {
    let order = orders.find(o => o.id === orderId);
    if (!order) {
      const { data: dbRow } = await supabase
        .from('orders')
        .select('data')
        .eq('id', orderId)
        .maybeSingle();
      if (dbRow?.data) {
        order = dbRow.data;
      }
    }
    if (!order) return notifySystem('ผิดพลาด', 'ไม่พบข้อมูลออเดอร์นี้', 'error');

    const uid   = currentUser?.id || userProfile?.id || '';
    const rider = riders.find(r => r.userId === uid);
    if (!rider) return notifySystem('ผิดพลาด', 'ไม่พบข้อมูลไรเดอร์ของคุณ', 'error');

    // Call accept_order_direct RPC for atomic cash wallet validation and state updates
    const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_order_direct', {
      p_order_id: orderId,
      p_rider_id: rider.id,
    });

    let updatedOrderData = null;

    if (rpcError) {
      console.error('[acceptOrder] RPC error:', rpcError);
      return notifySystem('เสียใจด้วย', 'ไม่สามารถรับงานได้: ' + rpcError.message, 'error');
    }

    if (!rpcResult?.ok) {
      if (rpcResult?.reason === 'INSUFFICIENT_RIDER_WALLET') {
        return notifySystem(
          'ยอดเงินในกระเป๋าไม่เพียงพอ',
          'ยอดเงินในกระเป๋าไม่เพียงพอสำหรับรับงานนี้ กรุณาเติมเงินก่อนรับงาน',
          'error'
        );
      }
      if (rpcResult?.reason === 'order_already_taken') {
        return notifySystem('เสียใจด้วย', 'มีไรเดอร์ท่านอื่นรับงานนี้ไปแล้ว', 'error');
      }
      return notifySystem('เสียใจด้วย', 'ไม่สามารถรับงานได้ (' + (rpcResult?.reason || 'unknown error') + ')', 'error');
    }

    updatedOrderData = rpcResult.order_data || order;

    // Since DB update succeeded, update local state
    setOrders(prev => {
      const exists = prev.some(o => o.id === orderId);
      if (exists) {
        return prev.map(o => o.id === orderId ? updatedOrderData : o);
      }
      return [updatedOrderData, ...prev];
    });

    notifySystem('รับงานแล้ว!', `ออเดอร์ #${orderId.slice(-6)} — ไปรับของที่ร้านได้เลย`, 'success');
    return true;
  };

  const updateOrderStatus = async (orderId, newStatus, _unused, extraData = {}) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Stamp income breakdown when rider marks delivered (so history shows correct figures)
    let incomePatch = {};
    if (newStatus === 'delivered' || newStatus === 'completed') {
      const { gpAmount, merchantIncome, riderIncome: calcRider } = _settlementAmounts(order);
      incomePatch = {
        riderIncome:    order.riderIncome    ?? calcRider,
        merchantIncome: order.merchantIncome ?? merchantIncome,
        adminGP:        order.adminGP        ?? gpAmount,
        deliveredAt:    newStatus === 'delivered' ? formatDateTime() : order.deliveredAt,
        deliveredAtMs:  newStatus === 'delivered' ? Date.now() : order.deliveredAtMs,
      };
    }

    // ── Completion & Settlement Flow (Financial Settlement is Source of Truth) ──
    if (newStatus === 'completed') {
      const gpFoodRate    = (appConfig.gpFood ?? 30) / 100;
      const gpDelivRate   = (appConfig.gpDelivery ?? 15) / 100;

      // Execute financial settlement in backend transaction FIRST before marking completed
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('process_order_settlement', {
          p_order_id: orderId,
          p_gp_food_rate: gpFoodRate,
          p_gp_delivery_rate: gpDelivRate,
        });

      if (rpcError || (rpcResult && !rpcResult.ok)) {
        console.error('[updateOrderStatus] Settlement error:', rpcError || rpcResult?.error);
        notifySystem('ผิดพลาด', 'ไม่สามารถทำรายการ settlement ได้ ออเดอร์ยังไม่ถูกปิด', 'error');
        return false;
      }

      // Settlement succeeded or was already settled — update local state
      const nowStr = new Date().toISOString();
      const nowMs = Date.now();

      const patch = {
        ...incomePatch,
        ...extraData,
        status: 'completed',
        completedAt: order.completedAt || nowStr,
        completedAtMs: order.completedAtMs || nowMs,
        settlementStatus: 'settled',
      };

      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...patch } : o)));

      // Settlement is already committed by the server RPC above.
      // Do not mutate wallet balances from the customer client.

      // Mark rider as available again
      const riderRow = riders.find(r => r.userId === (order.riderUserId || riders.find(r => r.id === order.riderId)?.userId));
      if (riderRow) {
        supabase.from('riders').update({ is_available: true }).eq('id', riderRow.id).then(() => {});
      }

      if (fetchUserWallet) {
        fetchUserWallet();
      }

      notifySystem('✅ ส่งของสำเร็จ!', `ออเดอร์ #${orderId.slice(-6)} เสร็จสมบูรณ์`, 'success');
      return true;
    }

    const patch = { status: newStatus, ...incomePatch, ...extraData };
    const transitionSucceeded = await _updateOrder(orderId, patch);
    if (!transitionSucceeded) return false;

    // ── Grab Auto-Dispatch: trigger when merchant marks ready_to_pickup ──────

    // ── Rider's job ends at 'delivered' — release availability immediately ────
    if (newStatus === 'delivered') {
      const riderUid = order.riderUserId || riders.find(r => r.id === order.riderId)?.userId;
      const riderRow = riders.find(r => r.userId === riderUid);
      if (riderRow) {
        supabase.from('riders').update({ is_available: true }).eq('id', riderRow.id).then(() => {});
      }
    }

    // ── Mark rider available when job cancelled ──────────────────────────────
    if (newStatus === 'cancelled' && order.riderId) {
      const riderRow = riders.find(r => r.id === order.riderId);
      if (riderRow) {
        supabase.from('riders').update({ is_available: true }).eq('id', riderRow.id).then(() => {});
      }
    }
  };

  const initiateCancelOrder = (orderId) => {
    setSelectedOrderToCancel(orderId);
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    const orderId = selectedOrderToCancel;
    if (!orders.some(order => order.id === orderId)) return;
    const { data: cancelledOrderId, error } = await supabase.rpc('cancel_customer_order', { p_order_id: orderId });
    if (error || !cancelledOrderId) {
      return notifySystem('Não foi possível cancelar', _rpcErrorMessage(error) || 'O pedido já não pode ser cancelado neste estado.', 'error');
    }
    const result = await _fetchAuthoritativeOrder(cancelledOrderId);
    if (!result.ok) return notifySystem('Erro ao actualizar pedido', result.reason, 'error');
    setOrders(prev => prev.map(o => o.id === orderId ? result.order : o));
    setShowCancelModal(false);
    setSelectedOrderToCancel(null);
    setCancelReasonInput('');
    notifySystem('Pedido cancelado', `O pedido #${orderId.slice(-6)} foi cancelado.`, 'info');
  };

  const requestCancelOrder = (orderId, reason) => {
    void reason;
    void orderId;
    notifySystem('Cancelamento indisponível', 'O backend permite cancelamento pelo cliente apenas enquanto o pedido aguarda pagamento.', 'error');
  };

  const requestCancelByRole = (orderId, reason, role) => {
    const uid = currentUser?.id || userProfile?.id || '';
    const order = orders.find(o => o.id === orderId);
    const roleName = role === 'rider' ? 'Estafeta' : 'Comerciante';
    const newReq = {
      id: generateId(), type: 'cancel_order',
      data: {
        orderId, reason,
        requestedBy: role,
        customerId: order?.customerId,
        paymentMethod: order?.paymentMethod,
        grandTotal: order?.grandTotal || 0,
      },
      userId: uid, user: userProfile.name || roleName,
      timestamp: formatDateTime(),
    };
    setPendingRequests(prev => [newReq, ...prev]);
    supabase.from('pending_requests').insert({ id: newReq.id, data: newReq }).then(() => {});
    notifySystem('Pedido de cancelamento enviado', 'O Admin irá analisar o pedido.', 'info');
    notifyAdmin(`⚠️ ${roleName} pediu cancelamento`, `${userProfile.name} pediu o cancelamento de #${orderId.slice(-6)}: ${reason}`, 'warning');
  };

  // Direct cancel — for customer on still-pending orders (no admin needed)
  const cancelOrderDirectly = async (orderId, reason = 'Cliente cancelou') => {
    void reason;
    const { data: cancelledOrderId, error } = await supabase.rpc('cancel_customer_order', { p_order_id: orderId });
    if (error || !cancelledOrderId) {
      return notifySystem('Não foi possível cancelar', _rpcErrorMessage(error) || 'O pedido já não pode ser cancelado neste estado.', 'error');
    }
    const result = await _fetchAuthoritativeOrder(cancelledOrderId);
    if (!result.ok) return notifySystem('Erro ao actualizar pedido', result.reason, 'error');
    setOrders(prev => prev.map(o => o.id === orderId ? result.order : o));
    notifySystem('Pedido cancelado', `O pedido #${orderId.slice(-6)} foi cancelado.`, 'info');
  };

  return {
    calculateDeliveryFee, calculateFoodTotal, isPending, hasPendingCancelRequest,
    addToCart, placeOrder, placeParcelOrder, acceptOrder, updateOrderStatus,
    initiateCancelOrder, confirmCancelOrder, cancelOrderDirectly,
    requestCancelOrder, requestCancelByRole,
  };
}
