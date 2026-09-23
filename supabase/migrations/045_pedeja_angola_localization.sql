-- Pedejá Angola localization: runtime timezone and wallet history strings.
-- Historical migrations remain immutable; this migration replaces the live function definitions.

CREATE OR REPLACE FUNCTION public.place_customer_order(p_order JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid        TEXT;
  v_cust_uid          TEXT;
  v_order_id          TEXT;
  v_existing_order    RECORD;
  v_type              TEXT;
  v_method            TEXT;
  v_status            TEXT;

  -- Quote Verification
  v_quote_id          TEXT;
  v_quote_rec         RECORD;

  -- DB Config & Pricing Parameters
  v_config_data       JSONB;
  v_base_fee          NUMERIC := 20;
  v_per_km_fee        NUMERIC := 10;
  v_gp_food_rate      NUMERIC := 0.30;
  v_gp_deliv_rate     NUMERIC := 0.15;
  v_gp_ride_rate      NUMERIC := 0.15;
  v_gp_service_rate   NUMERIC := 0.15;

  -- Item / Food Calculation Variables
  v_restaurant_id     TEXT;
  v_menu_items_json   JSONB;
  v_req_items         JSONB;
  v_req_item          JSONB;
  v_item_id           TEXT;
  v_orig_id           TEXT;
  v_qty               INT;
  v_db_item           JSONB := NULL;
  v_db_base_price     NUMERIC := 0;
  v_db_opts_extra     NUMERIC := 0;
  v_item_unit_price   NUMERIC := 0;
  v_item_subtotal     NUMERIC := 0;
  v_sel_opts          JSONB;
  v_opt_elem          JSONB;
  v_db_opt            JSONB;
  v_db_opt_price      NUMERIC := 0;
  v_auth_items        JSONB := '[]'::jsonb;

  -- Financial Calculations
  v_calc_food_total   NUMERIC := 0;
  v_calc_deliv_fee    NUMERIC := 0;
  v_promo_discount    NUMERIC := 0;
  v_calc_grand_total  NUMERIC := 0;
  v_admin_gp          NUMERIC := 0;
  v_rider_income      NUMERIC := 0;
  v_distance          NUMERIC := 1;

  -- Wallet Record & History
  v_wallet            RECORD;
  v_bal               NUMERIC := 0;
  v_entry             JSONB;
  v_final_order       JSONB;
  v_now_luanda       TEXT;
  v_now_epoch_ms      BIGINT;

  i                   INT;
  j                   INT;
  k                   INT;
  v_matched_opt       BOOLEAN;
BEGIN
  -- 1. Authentication Check
  v_caller_uid := auth.uid()::text;
  IF v_caller_uid IS NULL OR v_caller_uid = '' THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  -- 2. Customer Identity Enforcement
  IF public.is_admin(auth.uid()) THEN
    v_cust_uid := COALESCE(NULLIF(p_order->>'customerId', ''), NULLIF(p_order->>'userId', ''), v_caller_uid);
  ELSE
    v_cust_uid := v_caller_uid;
  END IF;

  -- 3. Order ID & Idempotency Check
  v_order_id := NULLIF(p_order->>'id', '');
  IF v_order_id IS NULL THEN
    v_order_id := gen_random_uuid()::text;
  END IF;

  SELECT * INTO v_existing_order
  FROM public.orders
  WHERE id = v_order_id;

  IF v_existing_order.id IS NOT NULL THEN
    IF v_existing_order.data->>'customerId' = v_cust_uid OR public.is_admin(auth.uid()) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'order_id', v_order_id,
        'order', v_existing_order.data,
        'idempotent', true
      );
    ELSE
      RETURN jsonb_build_object('ok', false, 'reason', 'DUPLICATE_ORDER');
    END IF;
  END IF;

  -- 4. Payment Method & Type Validation
  v_method := LOWER(COALESCE(p_order->>'paymentMethod', 'cash'));
  IF v_method NOT IN ('cash', 'wallet', 'online') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_PAYMENT_METHOD');
  END IF;

  v_type := LOWER(COALESCE(p_order->>'type', 'food'));
  IF v_type NOT IN ('food', 'parcel', 'ride', 'service') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_ORDER_TYPE');
  END IF;

  IF v_type = 'food' THEN
    v_status := 'pending';
  ELSE
    v_status := 'ready_to_pickup';
  END IF;

  -- 5. Quote Verification (Mandatory Server-Authoritative Quote)
  v_quote_id := p_order->>'quoteId';
  IF v_quote_id IS NULL OR v_quote_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'QUOTE_REQUIRED');
  END IF;

  SELECT * INTO v_quote_rec
  FROM public.service_quotes
  WHERE id = v_quote_id
  FOR UPDATE;

  IF v_quote_rec.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'QUOTE_NOT_FOUND');
  END IF;

  IF v_quote_rec.customer_id <> v_cust_uid AND NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'QUOTE_ACCESS_DENIED');
  END IF;

  IF v_quote_rec.service_type <> v_type THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'QUOTE_SERVICE_MISMATCH');
  END IF;

  IF v_quote_rec.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'QUOTE_ALREADY_USED');
  END IF;

  IF v_quote_rec.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'QUOTE_EXPIRED');
  END IF;

  -- Extract delivery fee, promo discount, grand total, admin GP, rider income from quote
  v_calc_deliv_fee := v_quote_rec.subtotal;
  v_promo_discount := v_quote_rec.discount;
  v_distance       := v_quote_rec.billable_km;
  v_admin_gp       := v_quote_rec.admin_gp;
  v_rider_income   := v_quote_rec.rider_income;

  -- 6. Load DB Config for Base Rates
  SELECT data INTO v_config_data FROM public.app_config WHERE id = 1;

  IF v_config_data IS NOT NULL THEN
    v_base_fee     := COALESCE((v_config_data->>'baseFee')::NUMERIC, 20);
    v_per_km_fee   := COALESCE((v_config_data->>'perKmFee')::NUMERIC, 10);
    v_gp_food_rate := COALESCE((v_config_data->>'gpFood')::NUMERIC, 30) / 100.0;
  END IF;

  -- 7. Calculate Food Subtotal strictly from DB menu items
  IF v_type = 'food' THEN
    v_restaurant_id := p_order->>'restaurantId';
    IF v_restaurant_id IS NULL OR v_restaurant_id = '' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'MISSING_RESTAURANT_ID');
    END IF;

    SELECT items INTO v_menu_items_json
    FROM public.menu_items
    WHERE restaurant_id = v_restaurant_id;

    IF v_menu_items_json IS NULL OR jsonb_array_length(v_menu_items_json) = 0 THEN
      SELECT data->'menu' INTO v_menu_items_json
      FROM public.restaurants
      WHERE id = v_restaurant_id;
    END IF;

    v_req_items := p_order->'items';
    IF v_req_items IS NULL OR jsonb_array_length(v_req_items) = 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'EMPTY_FOOD_ORDER');
    END IF;

    FOR i IN 0..jsonb_array_length(v_req_items) - 1 LOOP
      v_req_item := v_req_items->i;
      v_item_id  := v_req_item->>'id';
      v_orig_id  := COALESCE(v_req_item->>'originalId', v_item_id);
      v_qty      := COALESCE((v_req_item->>'qty')::INT, 0);

      IF v_qty <= 0 OR v_qty > 100 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_QUANTITY');
      END IF;

      v_db_item := NULL;
      IF v_menu_items_json IS NOT NULL AND jsonb_array_length(v_menu_items_json) > 0 THEN
        FOR j IN 0..jsonb_array_length(v_menu_items_json) - 1 LOOP
          IF (v_menu_items_json->j->>'id') = v_orig_id OR (v_menu_items_json->j->>'id') = v_item_id THEN
            v_db_item := v_menu_items_json->j;
            EXIT;
          END IF;
        END LOOP;
      END IF;

      IF v_db_item IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_ITEM', 'itemId', v_orig_id);
      END IF;

      IF COALESCE((v_db_item->>'available')::BOOLEAN, true) = false THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'ITEM_UNAVAILABLE', 'itemName', v_db_item->>'name');
      END IF;

      v_db_base_price := COALESCE((v_db_item->>'price')::NUMERIC, 0);
      v_db_opts_extra := 0;
      v_sel_opts := v_req_item->'selectedOptions';

      IF v_sel_opts IS NOT NULL AND jsonb_array_length(v_sel_opts) > 0 THEN
        FOR k IN 0..jsonb_array_length(v_sel_opts) - 1 LOOP
          v_opt_elem := v_sel_opts->k;
          v_matched_opt := false;

          IF v_db_item->'options' IS NOT NULL AND jsonb_array_length(v_db_item->'options') > 0 THEN
            FOR j IN 0..jsonb_array_length(v_db_item->'options') - 1 LOOP
              v_db_opt := v_db_item->'options'->j;
              IF (v_db_opt->>'name') = (v_opt_elem->>'name') THEN
                v_db_opt_price := COALESCE((v_db_opt->>'price')::NUMERIC, 0);
                v_db_opts_extra := v_db_opts_extra + v_db_opt_price;
                v_matched_opt := true;
                EXIT;
              END IF;
            END LOOP;
          END IF;

          IF NOT v_matched_opt THEN
            RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_OPTION', 'optionName', v_opt_elem->>'name');
          END IF;
        END LOOP;
      END IF;

      v_item_unit_price := ROUND(v_db_base_price + v_db_opts_extra, 2);
      v_item_subtotal   := ROUND(v_item_unit_price * v_qty, 2);
      v_calc_food_total := v_calc_food_total + v_item_subtotal;

      v_auth_items := v_auth_items || jsonb_build_object(
        'id', v_item_id,
        'originalId', v_orig_id,
        'name', COALESCE(v_db_item->>'name', v_req_item->>'name'),
        'price', v_item_unit_price,
        'qty', v_qty,
        'selectedOptions', COALESCE(v_sel_opts, '[]'::jsonb)
      );
    END LOOP;

    v_calc_grand_total := GREATEST(0, v_calc_food_total + v_calc_deliv_fee - v_promo_discount);

  ELSE
    v_calc_food_total := 0;
    v_calc_grand_total := GREATEST(0, v_calc_deliv_fee - v_promo_discount);
  END IF;

  -- 8. Wallet Deduction (Atomic Row Lock)
  IF v_method = 'wallet' AND v_calc_grand_total > 0 THEN
    INSERT INTO public.wallets (user_id, balance, history)
    VALUES (v_cust_uid, 0, '[]'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_cust_uid
    FOR UPDATE;

    v_bal := COALESCE(v_wallet.balance, 0);

    IF v_bal < v_calc_grand_total THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'INSUFFICIENT_CUSTOMER_WALLET',
        'requiredBalance', v_calc_grand_total,
        'currentBalance', v_bal
      );
    END IF;

    v_now_luanda  := to_char(now() AT TIME ZONE 'Africa/Luanda', 'DD/MM/YYYY HH24:MI:SS');
    v_now_epoch_ms := (extract(epoch FROM now()) * 1000)::BIGINT;

    v_entry := jsonb_build_object(
      'id', gen_random_uuid()::text,
      'type', 'withdraw',
      'amount', -v_calc_grand_total,
      'date', v_now_luanda,
      'desc', 'Pagamento de produto/serviço — pedido #' || right(v_order_id, 6),
      'refOrderId', v_order_id,
      'createdAtMs', v_now_epoch_ms,
      'actorUserId', v_caller_uid
    );

    UPDATE public.wallets
    SET balance = balance - v_calc_grand_total,
        history = jsonb_build_array(v_entry) || COALESCE(history, '[]'::jsonb)
    WHERE user_id = v_cust_uid;
  END IF;

  -- 9. Construct Final Authoritative Payload
  v_final_order := p_order || jsonb_build_object(
    'id', v_order_id,
    'quoteId', v_quote_id,
    'type', v_type,
    'status', v_status,
    'customerId', v_cust_uid,
    'paymentMethod', v_method,
    'distance', v_distance,
    'foodTotal', v_calc_food_total,
    'deliveryFee', v_calc_deliv_fee,
    'promoDiscount', v_promo_discount,
    'grandTotal', v_calc_grand_total,
    'adminGP', v_admin_gp,
    'riderIncome', v_rider_income,
    'createdAt', COALESCE(p_order->>'createdAt', to_char(now() AT TIME ZONE 'Africa/Luanda', 'DD/MM/YYYY HH24:MI:SS'))
  );

  IF v_type = 'food' THEN
    v_final_order := v_final_order || jsonb_build_object('items', v_auth_items);
  END IF;

  -- 10. Consume the quote only after all validation and wallet checks succeed.
  UPDATE public.service_quotes
  SET used_at = NOW()
  WHERE id = v_quote_id;

  -- 11. Persist Order
  INSERT INTO public.orders (id, status, data)
  VALUES (v_order_id, v_status, v_final_order);

  -- 12. Return Authoritative Pricing Result
  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'quoteId', v_quote_id,
    'order', v_final_order,
    'pricing', jsonb_build_object(
      'foodTotal', v_calc_food_total,
      'deliveryFee', v_calc_deliv_fee,
      'promoDiscount', v_promo_discount,
      'grandTotal', v_calc_grand_total
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_order_direct_internal(
  p_order_id TEXT,
  p_rider_id TEXT,
  p_rider_user_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_rider RECORD;
  v_wallet RECORD;
  v_now_str TEXT;
  v_updated_order JSONB;
  v_wallet_bal NUMERIC := 0;
  v_req_liability NUMERIC := 0;
  v_active_liability NUMERIC := 0;
  v_avail_bal NUMERIC := 0;
  v_food_total NUMERIC := 0;
  v_deliv_fee NUMERIC := 0;
  v_grand_total NUMERIC := 0;
  v_type TEXT := 'food';
  v_gp_amount NUMERIC := 0;
  v_merch_income NUMERIC := 0;
  v_rider_income NUMERIC := 0;
  v_gp_food_rate NUMERIC := 0.30;
  v_gp_deliv_rate NUMERIC := 0.15;
  v_gp_ride_rate NUMERIC := 0.15;
  v_gp_service_rate NUMERIC := 0.15;
BEGIN
  -- Lock target order
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  -- Check status is open for acceptance
  IF v_order.status NOT IN ('pending', 'preparing', 'ready_to_pickup') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_already_taken');
  END IF;

  IF (v_order.data->>'riderId') IS NOT NULL AND (v_order.data->>'riderId') <> '' AND (v_order.data->>'riderId') <> p_rider_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_already_taken');
  END IF;

  -- Fetch rider row
  SELECT * INTO v_rider FROM riders WHERE id = p_rider_id;
  IF v_rider IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rider_not_found');
  END IF;

  IF p_rider_user_id IS NULL OR p_rider_user_id = '' THEN
    p_rider_user_id := v_rider.data->>'userId';
  END IF;

  -- Lock rider's wallet row
  IF p_rider_user_id IS NOT NULL AND p_rider_user_id <> '' THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_rider_user_id FOR UPDATE;
    IF v_wallet IS NOT NULL THEN
      v_wallet_bal := COALESCE(v_wallet.balance, 0);
    END IF;
  END IF;

  -- Calculate income breakdown
  v_type        := COALESCE(v_order.data->>'type', 'food');
  v_food_total  := COALESCE((v_order.data->>'foodTotal')::NUMERIC, 0);
  v_deliv_fee   := COALESCE((v_order.data->>'deliveryFee')::NUMERIC, 0);
  v_grand_total := COALESCE((v_order.data->>'grandTotal')::NUMERIC, v_deliv_fee);

  IF v_type = 'parcel' THEN
    v_gp_amount    := ROUND(v_deliv_fee * v_gp_deliv_rate, 2);
    v_merch_income := 0;
    v_rider_income := ROUND(v_deliv_fee - v_gp_amount, 2);
  ELSIF v_type = 'ride' THEN
    v_gp_amount    := ROUND(v_grand_total * v_gp_ride_rate, 2);
    v_merch_income := 0;
    v_rider_income := ROUND(v_grand_total - v_gp_amount, 2);
  ELSIF v_type = 'service' THEN
    v_gp_amount    := ROUND(v_grand_total * v_gp_service_rate, 2);
    v_merch_income := 0;
    v_rider_income := ROUND(v_grand_total - v_gp_amount, 2);
  ELSE -- food
    v_gp_amount    := ROUND(v_food_total * v_gp_food_rate, 2);
    v_merch_income := ROUND(v_food_total - v_gp_amount, 2);
    v_rider_income := v_deliv_fee;
  END IF;

  -- Validate Cash Wallet Reserve if paymentMethod is cash
  v_req_liability := public.calculate_rider_order_cash_liability(v_order.data);
  IF v_req_liability > 0 THEN
    v_active_liability := public.get_rider_active_cash_liability(p_rider_id, p_rider_user_id);
    v_avail_bal := v_wallet_bal - v_active_liability;

    IF v_avail_bal < v_req_liability THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'INSUFFICIENT_RIDER_WALLET',
        'requiredBalance', v_req_liability,
        'currentBalance', v_wallet_bal,
        'availableBalance', ROUND(v_avail_bal, 2)
      );
    END IF;
  END IF;

  v_now_str := to_char(now() AT TIME ZONE 'Africa/Luanda', 'YYYY-MM-DD HH24:MI:SS');

  v_updated_order := v_order.data || jsonb_build_object(
    'status', 'rider_accepted',
    'riderId', p_rider_id,
    'riderUserId', p_rider_user_id,
    'riderName', COALESCE(v_rider.data->>'name', 'Estafeta'),
    'riderPhone', COALESCE(v_rider.data->>'phone', ''),
    'riderAcceptedAt', v_now_str,
    'riderIncome', v_rider_income,
    'merchantIncome', v_merch_income,
    'adminGP', v_gp_amount
  );

  -- Update order row
  UPDATE orders
  SET status = 'rider_accepted',
      data = v_updated_order
  WHERE id = p_order_id;

  -- Mark rider as unavailable
  UPDATE riders SET is_available = false WHERE id = p_rider_id;

  -- Cancel all pending offers for this order
  UPDATE job_offers
  SET status = 'missed', responded_at = now()
  WHERE order_id = p_order_id AND status = 'pending';

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'order_data', v_updated_order);
END;
$$;

CREATE OR REPLACE FUNCTION public._wallet_credit(
  p_user_id  TEXT,
  p_amount   NUMERIC,
  p_order_id TEXT,
  p_note     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry JSONB;
BEGIN
  IF p_user_id IS NULL OR p_amount = 0 THEN RETURN; END IF;

  v_entry := jsonb_build_object(
    'id',          gen_random_uuid()::text,
    'type',        CASE WHEN p_amount >= 0 THEN 'deposit' ELSE 'withdraw' END,
    'amount',      p_amount,
    'date',        to_char(now() AT TIME ZONE 'Africa/Luanda', 'DD/MM/YYYY HH24:MI:SS'),
    'desc',        p_note,
    'refOrderId',  p_order_id,
    'createdAtMs', (extract(epoch from now()) * 1000)::bigint
  );

  INSERT INTO public.wallets (user_id, balance, history)
  VALUES (p_user_id, p_amount, jsonb_build_array(v_entry))
  ON CONFLICT (user_id) DO UPDATE
    SET
      balance = wallets.balance + EXCLUDED.balance,
      history = (jsonb_build_array(v_entry) || COALESCE(wallets.history, '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_pending_request(p_request_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_req_data JSONB;
  v_req_type TEXT;
  v_user_id TEXT;
  v_amt NUMERIC;
  v_wallet RECORD;
  v_bal NUMERIC := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  -- Lock request FOR UPDATE
  SELECT * INTO v_req
  FROM public.pending_requests
  WHERE id = p_request_id
  FOR UPDATE NOWAIT;

  IF v_req IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'request_not_found');
  END IF;

  v_req_data := v_req.data;
  v_req_type := LOWER(COALESCE(v_req.type, v_req_data->>'type', ''));
  v_user_id  := COALESCE(v_req.user_id, v_req_data->>'userId');

  -- Ensure request type is supported
  IF v_req_type NOT IN ('topup', 'withdraw') THEN
    -- Leave pending request untouched in database and return structured error
    RETURN jsonb_build_object('ok', false, 'reason', 'UNSUPPORTED_REQUEST_TYPE', 'type', v_req_type);
  END IF;

  IF v_user_id IS NULL OR v_user_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'MISSING_USER_ID');
  END IF;

  IF v_req_type = 'topup' THEN
    v_amt := COALESCE((v_req_data->'data'->>'amount')::NUMERIC, (v_req_data->>'amount')::NUMERIC, 0);
    IF v_amt <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'invalid_topup_amount');
    END IF;

    PERFORM public._wallet_credit(
      v_user_id, v_amt, NULL,
      'Carregamento Kz ' || trim(to_char(v_amt, '999,999,990.00')) || ' (aprovado pelo Admin)'
    );

  ELSIF v_req_type = 'withdraw' THEN
    v_amt := COALESCE((v_req_data->'data'->>'amount')::NUMERIC, (v_req_data->>'amount')::NUMERIC, 0);
    IF v_amt <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'invalid_withdraw_amount');
    END IF;

    -- Ensure wallet exists
    INSERT INTO public.wallets (user_id, balance, history)
    VALUES (v_user_id, 0, '[]'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    v_bal := COALESCE(v_wallet.balance, 0);
    IF v_bal < v_amt THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'INSUFFICIENT_WALLET_BALANCE',
        'currentBalance', v_bal,
        'requestedAmount', v_amt
      );
    END IF;

    PERFORM public._wallet_credit(
      v_user_id, -v_amt, NULL,
      'Levantamento Kz ' || trim(to_char(v_amt, '999,999,990.00')) || ' (aprovado pelo Admin)'
    );
  END IF;

  -- Remove processed request
  DELETE FROM public.pending_requests WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'request_id', p_request_id, 'type', v_req_type);

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'concurrent_approval_in_progress');
END;
$$;

REVOKE ALL ON FUNCTION public._wallet_credit(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_pending_request(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_pending_request(TEXT) TO authenticated;
