-- Migration 046: close the direct order UPDATE bypass.
-- Lifecycle, ownership, and financial changes must go through dedicated RPCs.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_order_metadata(
  p_order_id TEXT,
  p_patch JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_actor TEXT := auth.uid()::text;
  v_customer TEXT;
  v_rider TEXT;
  v_patch_keys TEXT[];
  v_updated JSONB;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb THEN
    RAISE EXCEPTION 'invalid_order_metadata_patch' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  SELECT COALESCE(NULLIF(v_order.data->>'customerId', ''), NULLIF(v_order.data->>'userId', '')),
         COALESCE(NULLIF(v_order.data->>'riderUserId', ''), NULLIF(r.user_id, ''), NULLIF(r.data->>'userId', ''))
  INTO v_customer, v_rider
  FROM (SELECT 1) AS sentinel
  LEFT JOIN public.riders r ON r.id = v_order.data->>'riderId';

  SELECT array_agg(key ORDER BY key) INTO v_patch_keys
  FROM jsonb_object_keys(p_patch) AS keys(key);

  IF v_patch_keys <@ ARRAY['riderLocation']::TEXT[] THEN
    IF v_rider IS DISTINCT FROM v_actor OR NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'rider'
    ) THEN
      RAISE EXCEPTION 'assigned_rider_required' USING ERRCODE = '42501';
    END IF;
  ELSIF v_patch_keys <@ ARRAY['rated', 'ratingComment']::TEXT[] THEN
    IF v_customer IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'customer_required' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'unsupported_order_metadata' USING ERRCODE = '42501';
  END IF;

  v_updated := v_order.data || p_patch;
  UPDATE public.orders
  SET data = v_updated
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'order_data', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_metadata(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_metadata(TEXT, JSONB) TO authenticated;

-- The participant UPDATE policy remains useful to SECURITY DEFINER RPCs, but
-- the client role must not be able to invoke it directly. All client writes to
-- orders now use lifecycle/settlement RPCs or update_order_metadata above.
REVOKE UPDATE ON public.orders FROM authenticated;

COMMIT;
