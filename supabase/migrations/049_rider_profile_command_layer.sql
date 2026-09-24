-- Rider profile read model, notification preferences, and vehicle verification state.
-- 049_rider_profile_command_layer.sql

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'vehicle_verification_status'
      and n.nspname = 'public'
  ) then
    create type public.vehicle_verification_status as enum (
      'PENDING',
      'UNDER_REVIEW',
      'VERIFIED',
      'REJECTED',
      'SUSPENDED'
    );
  end if;
end $$;

alter table public.vehicles
  add column if not exists verification_status public.vehicle_verification_status
    not null default 'PENDING';

create unique index if not exists vehicles_one_active_per_rider_idx
  on public.vehicles (rider_id)
  where status = 'ACTIVE';

alter table public.profiles
  add column if not exists is_payment_notification boolean not null default true;

create or replace function private.rider_get_profile_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_rider_id uuid;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select r.id
    into v_rider_id
  from public.riders r
  where r.user_id = v_uid
  limit 1;

  if v_rider_id is null then
    raise exception 'RIDER_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'phone', p.phone,
      'avatar_url', p.avatar_url,
      'account_status', p.account_status,
      'is_offer_notification', coalesce(p.is_offer_notification, true),
      'is_order_notification', coalesce(p.is_order_notification, true),
      'is_payment_notification', coalesce(p.is_payment_notification, true)
    ),
    'rider', jsonb_build_object(
      'id', r.id,
      'verification_status', rp.verification_status
    ),
    'vehicle', (
      select jsonb_build_object(
        'id', v.id,
        'vehicle_type', v.vehicle_type,
        'registration_number', v.registration_number,
        'make', v.make,
        'model', v.model,
        'color', v.color,
        'status', v.status,
        'verification_status', v.verification_status,
        'document_storage_path', v.document_storage_path,
        'document_mime_type', v.document_mime_type
      )
      from public.vehicles v
      where v.rider_id = v_rider_id
        and v.status = 'ACTIVE'
      order by v.updated_at desc, v.created_at desc
      limit 1
    ),
    'vehicles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'vehicle_type', v.vehicle_type,
          'registration_number', v.registration_number,
          'make', v.make,
          'model', v.model,
          'color', v.color,
          'status', v.status,
          'verification_status', v.verification_status,
          'document_storage_path', v.document_storage_path,
          'document_mime_type', v.document_mime_type
        )
        order by
          case when v.status = 'ACTIVE' then 0 else 1 end,
          v.updated_at desc,
          v.created_at desc
      )
      from public.vehicles v
      where v.rider_id = v_rider_id
    ), '[]'::jsonb),
    'zone', (
      select jsonb_build_object(
        'id', oz.id,
        'code', oz.code,
        'name', oz.name,
        'province', orr.province,
        'region_name', orr.name
      )
      from public.rider_operational_zone_assignments a
      join public.operational_zones oz on oz.id = a.operational_zone_id
      join public.operational_regions orr on orr.id = oz.region_id
      where a.rider_id = v_rider_id
        and a.effective_to is null
      order by a.effective_from desc
      limit 1
    ),
    'documents', jsonb_build_object(
      'identity', (
        select jsonb_build_object(
          'status', d.status,
          'document_number', d.document_number
        )
        from public.rider_application_documents d
        where d.user_id = v_uid
          and d.document_type = 'BI'
        order by d.updated_at desc, d.created_at desc
        limit 1
      ),
      'driving_license', (
        select jsonb_build_object(
          'status', d.status,
          'document_number', d.document_number
        )
        from public.rider_application_documents d
        where d.user_id = v_uid
          and d.document_type = 'DRIVING_LICENCE'
        order by d.updated_at desc, d.created_at desc
        limit 1
      )
    )
  )
  into v_result
  from public.profiles p
  join public.riders r on r.user_id = p.id
  left join public.rider_profiles rp on rp.user_id = p.id
  where p.id = v_uid;

  if v_result is null then
    raise exception 'RIDER_PROFILE_NOT_FOUND';
  end if;

  return v_result;
end;
$$;

create or replace function public.rider_get_profile_snapshot()
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select private.rider_get_profile_snapshot();
$$;

create or replace function private.rider_update_notification_preferences(
  p_new_delivery_offers boolean,
  p_delivery_status boolean,
  p_earnings_payments boolean
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.riders r where r.user_id = v_uid
  ) then
    raise exception 'RIDER_NOT_FOUND';
  end if;

  update public.profiles
  set
    is_offer_notification = p_new_delivery_offers,
    is_order_notification = p_delivery_status,
    is_payment_notification = p_earnings_payments,
    updated_at = now()
  where id = v_uid;

  return found;
end;
$$;

create or replace function public.rider_update_notification_preferences(
  p_new_delivery_offers boolean,
  p_delivery_status boolean,
  p_earnings_payments boolean
)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select private.rider_update_notification_preferences(
    p_new_delivery_offers,
    p_delivery_status,
    p_earnings_payments
  );
$$;

revoke all on function public.rider_get_profile_snapshot() from public;
grant execute on function public.rider_get_profile_snapshot() to authenticated;

revoke all on function public.rider_update_notification_preferences(boolean, boolean, boolean) from public;
grant execute on function public.rider_update_notification_preferences(boolean, boolean, boolean) to authenticated;
