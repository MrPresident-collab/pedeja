-- Rider location enforcement: a rider must have a fresh server-observed location to be dispatchable.
-- The browser still requires explicit user permission; this migration makes location freshness
-- an operational security invariant on the server.

BEGIN;

CREATE OR REPLACE FUNCTION private.require_fresh_rider_location(
  p_user_id uuid DEFAULT auth.uid(),
  p_max_age interval DEFAULT interval '60 seconds'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_last_location_at timestamptz;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501';
  END IF;

  SELECT last_location_at
    INTO v_last_location_at
  FROM public.riders
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RIDER_NOT_FOUND' USING ERRCODE='P0002';
  END IF;

  IF v_last_location_at IS NULL OR v_last_location_at < now() - p_max_age THEN
    RAISE EXCEPTION 'FRESH_LOCATION_REQUIRED' USING ERRCODE='55000';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION private.require_fresh_rider_location(uuid, interval) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.enforce_rider_location_freshness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.availability_status IN ('AVAILABLE','BUSY') THEN
    IF NEW.last_location_at IS NULL OR NEW.last_location_at < now() - interval '60 seconds' THEN
      RAISE EXCEPTION 'FRESH_LOCATION_REQUIRED' USING ERRCODE='55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_rider_location_freshness ON public.riders;
CREATE TRIGGER trg_rider_location_freshness
BEFORE INSERT OR UPDATE OF availability_status, last_location_at
ON public.riders
FOR EACH ROW
EXECUTE FUNCTION private.enforce_rider_location_freshness();

CREATE OR REPLACE FUNCTION private.rider_set_availability(p_status rider_availability_status)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user uuid;
  v_rider public.riders%rowtype;
BEGIN
  v_user := private.require_active_account();
  SELECT * INTO v_rider FROM public.riders WHERE user_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RIDER_NOT_FOUND' USING ERRCODE='P0002'; END IF;

  IF p_status='AVAILABLE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rider_profiles rp
      WHERE rp.user_id=v_user AND rp.verification_status='VERIFIED'
    ) THEN
      RAISE EXCEPTION 'RIDER_NOT_VERIFIED' USING ERRCODE='55000';
    END IF;
    PERFORM private.require_fresh_rider_location(v_user, interval '60 seconds');
  ELSIF p_status='OFFLINE' AND EXISTS (
    SELECT 1
    FROM public.delivery_jobs dj
    JOIN public.delivery_assignments da ON da.delivery_job_id=dj.id
    WHERE da.rider_id=v_rider.id
      AND da.status='ACCEPTED'
      AND dj.status NOT IN ('DELIVERED','CANCELLED','FAILED')
  ) THEN
    RAISE EXCEPTION 'ACTIVE_DELIVERY_EXISTS' USING ERRCODE='55000';
  END IF;

  UPDATE public.riders
  SET availability_status=p_status, updated_at=now()
  WHERE id=v_rider.id;
  RETURN true;
END;
$function$;

-- Auto-offline riders whose browser has stopped reporting location.
-- This is a safety state change, not a deletion or delivery cancellation.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'pedeja-rider-location-watchdog';

SELECT cron.schedule(
  'pedeja-rider-location-watchdog',
  '* * * * *',
  $cron$
    UPDATE public.riders
    SET availability_status='OFFLINE', updated_at=now()
    WHERE availability_status IN ('AVAILABLE','BUSY')
      AND (last_location_at IS NULL OR last_location_at < now() - interval '60 seconds');
  $cron$
);

REVOKE ALL ON FUNCTION private.rider_set_availability(rider_availability_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.rider_set_availability(rider_availability_status) TO authenticated;

COMMIT;