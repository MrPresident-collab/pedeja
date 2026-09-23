-- Migration 047: Customer address command layer.
-- Human address is authoritative input; machine location is optional infrastructure.
-- Ownership is always derived from auth.uid(). No client-supplied owner is trusted.

BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address_id uuid NOT NULL REFERENCES public.addresses(id) ON DELETE CASCADE,
  label text NOT NULL,
  recipient_name text,
  recipient_phone text,
  delivery_instructions text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, address_id)
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_addresses_select_own" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_write_own" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_update_own" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_delete_own" ON public.customer_addresses;

CREATE POLICY "customer_addresses_select_own"
ON public.customer_addresses FOR SELECT TO authenticated
USING (customer_id = (SELECT auth.uid()));

-- No direct INSERT/UPDATE/DELETE. Address mutations go through SECURITY DEFINER commands.

REVOKE ALL ON TABLE public.customer_addresses FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer
  ON public.customer_addresses(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_default
  ON public.customer_addresses(customer_id, is_default)
  WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.create_customer_address(
  p_label text,
  p_address_line_1 text,
  p_address_line_2 text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_municipality text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL,
  p_delivery_instructions text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_address_id uuid;
  v_default boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_label), '') IS NULL
     OR NULLIF(trim(p_address_line_1), '') IS NULL THEN
    RAISE EXCEPTION 'address_required' USING ERRCODE = '22023';
  END IF;

  IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
    RAISE EXCEPTION 'location_pair_required' USING ERRCODE = '22023';
  END IF;

  IF p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90) THEN
    RAISE EXCEPTION 'invalid_latitude' USING ERRCODE = '22023';
  END IF;

  IF p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180) THEN
    RAISE EXCEPTION 'invalid_longitude' USING ERRCODE = '22023';
  END IF;

  v_default := NOT EXISTS (
    SELECT 1 FROM public.customer_addresses
    WHERE customer_id = v_uid
  );

  INSERT INTO public.addresses (
    address_line_1,
    address_line_2,
    neighborhood,
    municipality,
    city,
    province,
    country_code,
    location
  )
  VALUES (
    trim(p_address_line_1),
    NULLIF(trim(p_address_line_2), ''),
    NULLIF(trim(p_neighborhood), ''),
    NULLIF(trim(p_municipality), ''),
    NULLIF(trim(p_city), ''),
    NULLIF(trim(p_province), ''),
    'AO',
    CASE
      WHEN p_latitude IS NULL THEN NULL
      ELSE ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    END
  )
  RETURNING id INTO v_address_id;

  INSERT INTO public.customer_addresses (
    customer_id,
    address_id,
    label,
    recipient_name,
    recipient_phone,
    delivery_instructions,
    is_default
  )
  VALUES (
    v_uid,
    v_address_id,
    trim(p_label),
    NULLIF(trim(p_recipient_name), ''),
    NULLIF(trim(p_recipient_phone), ''),
    COALESCE(NULLIF(trim(p_delivery_instructions), ''), NULLIF(trim(p_reference), '')),
    v_default
  );

  RETURN v_address_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_customer_address(
  p_address_id uuid,
  p_label text,
  p_address_line_1 text,
  p_address_line_2 text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_municipality text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL,
  p_delivery_instructions text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.customer_addresses
    WHERE customer_id = v_uid AND address_id = p_address_id
  ) THEN
    RAISE EXCEPTION 'address_access_denied' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_label), '') IS NULL
     OR NULLIF(trim(p_address_line_1), '') IS NULL THEN
    RAISE EXCEPTION 'address_required' USING ERRCODE = '22023';
  END IF;

  IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
    RAISE EXCEPTION 'location_pair_required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.addresses
  SET address_line_1 = trim(p_address_line_1),
      address_line_2 = NULLIF(trim(p_address_line_2), ''),
      neighborhood = NULLIF(trim(p_neighborhood), ''),
      municipality = NULLIF(trim(p_municipality), ''),
      city = NULLIF(trim(p_city), ''),
      province = NULLIF(trim(p_province), ''),
      country_code = 'AO',
      location = CASE
        WHEN p_latitude IS NULL THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
      END
  WHERE id = p_address_id;

  UPDATE public.customer_addresses
  SET label = trim(p_label),
      recipient_name = NULLIF(trim(p_recipient_name), ''),
      recipient_phone = NULLIF(trim(p_recipient_phone), ''),
      delivery_instructions = COALESCE(NULLIF(trim(p_delivery_instructions), ''), NULLIF(trim(p_reference), '')),
      updated_at = now()
  WHERE customer_id = v_uid AND address_id = p_address_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_customer_address(p_address_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_was_default boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT is_default INTO v_was_default
  FROM public.customer_addresses
  WHERE customer_id = v_uid AND address_id = p_address_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'address_access_denied' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.customer_addresses
  WHERE customer_id = v_uid AND address_id = p_address_id;

  DELETE FROM public.addresses a
  WHERE a.id = p_address_id
    AND NOT EXISTS (
      SELECT 1 FROM public.customer_addresses ca
      WHERE ca.address_id = a.id
    );

  IF v_was_default THEN
    UPDATE public.customer_addresses ca
    SET is_default = true, updated_at = now()
    WHERE ca.customer_id = v_uid
      AND ca.address_id = (
        SELECT address_id
        FROM public.customer_addresses
        WHERE customer_id = v_uid
        ORDER BY created_at ASC
        LIMIT 1
      );
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_default_customer_address(p_address_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.customer_addresses
    WHERE customer_id = v_uid AND address_id = p_address_id
  ) THEN
    RAISE EXCEPTION 'address_access_denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.customer_addresses
  SET is_default = false, updated_at = now()
  WHERE customer_id = v_uid AND is_default = true;

  UPDATE public.customer_addresses
  SET is_default = true, updated_at = now()
  WHERE customer_id = v_uid AND address_id = p_address_id;

  RETURN true;
END;
$$;

-- Operations/admin can resolve a location after the customer has already saved
-- the human address. The customer never needs to provide coordinates.
CREATE OR REPLACE FUNCTION public.ops_resolve_customer_address(
  p_address_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL
     OR p_latitude < -90 OR p_latitude > 90
     OR p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'invalid_location' USING ERRCODE = '22023';
  END IF;

  UPDATE public.addresses
  SET location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
  WHERE id = p_address_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'address_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_address(text,text,text,text,text,text,text,text,double precision,double precision,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_customer_address(uuid,text,text,text,text,text,text,text,text,double precision,double precision,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_customer_address(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_default_customer_address(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ops_resolve_customer_address(uuid,double precision,double precision) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_customer_address(text,text,text,text,text,text,text,text,double precision,double precision,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_address(uuid,text,text,text,text,text,text,text,text,double precision,double precision,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_customer_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_customer_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_resolve_customer_address(uuid,double precision,double precision) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
