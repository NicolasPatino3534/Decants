-- P1 commerce hardening: bound checkout reservations, reserve coupon capacity,
-- and finalize every durable paid-order side effect in one transaction.

create table if not exists public.checkout_reservation_guards (
  user_id uuid not null,
  idempotency_key text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key),
  check (char_length(idempotency_key) between 8 and 200)
);

create index if not exists checkout_reservation_guards_expiry_idx
on public.checkout_reservation_guards (expires_at);

create table if not exists public.checkout_coupon_reservations (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null,
  idempotency_key text not null,
  status text not null default 'reserved'
    check (status in ('reserved', 'redeemed', 'released')),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (char_length(idempotency_key) between 8 and 200)
);

create index if not exists checkout_coupon_reservations_capacity_idx
on public.checkout_coupon_reservations (coupon_id, status, expires_at);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique (provider, event_id),
  check (provider in ('stripe', 'mercadopago')),
  check (char_length(event_id) between 1 and 200)
);

create table if not exists public.order_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  template text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (order_id, template)
);

alter table public.checkout_reservation_guards enable row level security;
alter table public.checkout_coupon_reservations enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.order_notification_outbox enable row level security;

revoke all on table public.checkout_reservation_guards from public, anon, authenticated;
revoke all on table public.checkout_coupon_reservations from public, anon, authenticated;
revoke all on table public.payment_webhook_events from public, anon, authenticated;
revoke all on table public.order_notification_outbox from public, anon, authenticated;

create or replace function public.acquire_checkout_reservation_guard(
  p_user_id uuid,
  p_idempotency_key text,
  p_expires_at timestamptz,
  p_max_open integer default 3
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_count integer;
begin
  if p_user_id is null
    or p_idempotency_key is null
    or char_length(p_idempotency_key) not between 8 and 200
    or p_expires_at is null
    or p_expires_at <= now()
    or p_max_open not between 1 and 10
  then
    raise exception 'Parámetros de reserva de checkout inválidos';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  delete from public.checkout_reservation_guards
  where user_id = p_user_id and expires_at <= now();

  if exists (
    select 1
    from public.checkout_reservation_guards
    where user_id = p_user_id and idempotency_key = p_idempotency_key
  ) then
    return false;
  end if;

  select count(*)::integer
  into active_count
  from public.checkout_reservation_guards
  where user_id = p_user_id and expires_at > now();

  if active_count >= p_max_open then
    return false;
  end if;

  insert into public.checkout_reservation_guards (
    user_id,
    idempotency_key,
    expires_at
  ) values (
    p_user_id,
    p_idempotency_key,
    p_expires_at
  );

  return true;
end;
$$;

create or replace function public.reserve_checkout_coupon(
  p_coupon_id uuid,
  p_user_id uuid,
  p_idempotency_key text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_coupon record;
  existing_reservation record;
  reserved_count integer;
begin
  if p_coupon_id is null then
    return true;
  end if;
  if p_user_id is null
    or p_idempotency_key is null
    or char_length(p_idempotency_key) not between 8 and 200
    or p_expires_at is null
    or p_expires_at <= now()
  then
    raise exception 'Parámetros de cupón inválidos';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_coupon_id::text, 1));

  update public.checkout_coupon_reservations
  set status = 'released',
      released_at = now()
  where coupon_id = p_coupon_id
    and status = 'reserved'
    and expires_at <= now();

  select id, active, starts_at, ends_at, usage_limit, used_count
  into target_coupon
  from public.coupons
  where id = p_coupon_id
  for update;

  if not found
    or not target_coupon.active
    or (target_coupon.starts_at is not null and target_coupon.starts_at > now())
    or (target_coupon.ends_at is not null and target_coupon.ends_at <= now())
  then
    return false;
  end if;

  select coupon_id, status
  into existing_reservation
  from public.checkout_coupon_reservations
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  for update;

  if found then
    return existing_reservation.coupon_id = p_coupon_id
      and existing_reservation.status in ('reserved', 'redeemed');
  end if;

  select count(*)::integer
  into reserved_count
  from public.checkout_coupon_reservations
  where coupon_id = p_coupon_id
    and status = 'reserved'
    and expires_at > now();

  if target_coupon.usage_limit is not null
    and target_coupon.used_count + reserved_count >= target_coupon.usage_limit
  then
    return false;
  end if;

  insert into public.checkout_coupon_reservations (
    coupon_id,
    user_id,
    idempotency_key,
    expires_at
  ) values (
    p_coupon_id,
    p_user_id,
    p_idempotency_key,
    p_expires_at
  );

  return true;
end;
$$;

create or replace function public.release_checkout_security_guards(
  p_user_id uuid,
  p_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_idempotency_key is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  update public.checkout_coupon_reservations
  set status = 'released',
      released_at = now()
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
    and status = 'reserved';

  delete from public.checkout_reservation_guards
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  return true;
end;
$$;

create or replace function public.cleanup_checkout_guards_on_order_terminal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is null or new.checkout_idempotency_key is null then
    return new;
  end if;

  if new.payment_status::text = 'payment_review'
    and new.reservation_expires_at is not null
    and new.reservation_expires_at > now()
  then
    update public.checkout_reservation_guards
    set expires_at = greatest(expires_at, new.reservation_expires_at)
    where user_id = new.user_id
      and idempotency_key = new.checkout_idempotency_key;

    update public.checkout_coupon_reservations
    set expires_at = greatest(expires_at, new.reservation_expires_at)
    where user_id = new.user_id
      and idempotency_key = new.checkout_idempotency_key
      and status = 'reserved';
  end if;

  if new.payment_status::text in ('paid', 'failed', 'cancelled', 'refunded')
    or new.status::text = 'cancelled'
  then
    if new.payment_status::text <> 'paid' then
      update public.checkout_coupon_reservations
      set status = 'released',
          released_at = now()
      where user_id = new.user_id
        and idempotency_key = new.checkout_idempotency_key
        and status = 'reserved';
    end if;

    delete from public.checkout_reservation_guards
    where user_id = new.user_id
      and idempotency_key = new.checkout_idempotency_key;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_cleanup_checkout_guards on public.orders;
create trigger orders_cleanup_checkout_guards
after update of status, payment_status on public.orders
for each row execute function public.cleanup_checkout_guards_on_order_terminal();

create or replace function public.finalize_paid_order(
  p_order_id uuid,
  p_provider text,
  p_provider_event_id text,
  p_provider_session_id text default null,
  p_provider_payment_id text default null,
  p_event_payload jsonb default '{}'::jsonb
)
returns table (
  user_id uuid,
  customer_email text,
  customer_name text,
  order_number text,
  notification_pending boolean,
  already_processed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order record;
  target_payment record;
  coupon_reservation record;
  event_inserted boolean := false;
  affected_rows integer;
begin
  if p_order_id is null
    or p_provider not in ('stripe', 'mercadopago')
    or p_provider_event_id is null
    or char_length(p_provider_event_id) not between 1 and 200
  then
    raise exception 'Parámetros de finalización inválidos';
  end if;

  select o.id, o.user_id, o.customer_email, o.customer_name, o.order_number,
         o.status::text as status, o.payment_status::text as payment_status,
         o.stock_released_at, o.coupon_id, o.checkout_idempotency_key
  into target_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado';
  end if;

  if target_order.payment_status <> 'paid'
    and (
      target_order.status = 'cancelled'
      or target_order.payment_status in ('failed', 'cancelled', 'refunded')
      or target_order.stock_released_at is not null
    )
  then
    raise exception 'PAYMENT_REQUIRES_REVIEW';
  end if;

  select id, provider_session_id
  into target_payment
  from public.payments
  where order_id = p_order_id
    and provider = p_provider
    and (
      p_provider_session_id is null
      or provider_session_id = p_provider_session_id
    )
  order by created_at
  limit 1
  for update;

  if not found then
    raise exception 'Registro de pago no encontrado';
  end if;

  insert into public.payment_webhook_events (
    provider,
    event_id,
    order_id,
    payload
  ) values (
    p_provider,
    p_provider_event_id,
    p_order_id,
    coalesce(p_event_payload, '{}'::jsonb)
  )
  on conflict (provider, event_id) do nothing
  returning true into event_inserted;

  if target_order.coupon_id is not null then
    if target_order.user_id is null
      or target_order.checkout_idempotency_key is null
    then
      raise exception 'PAYMENT_REQUIRES_REVIEW';
    end if;

    select ccr.id, ccr.coupon_id, ccr.status
    into coupon_reservation
    from public.checkout_coupon_reservations ccr
    where ccr.coupon_id = target_order.coupon_id
      and ccr.user_id = target_order.user_id
      and ccr.idempotency_key = target_order.checkout_idempotency_key
    for update;

    if not found
      or (
        target_order.payment_status <> 'paid'
        and coupon_reservation.status <> 'reserved'
      )
      or (
        target_order.payment_status = 'paid'
        and coupon_reservation.status not in ('reserved', 'redeemed')
      )
    then
      raise exception 'PAYMENT_REQUIRES_REVIEW';
    end if;

    if coupon_reservation.status = 'reserved' then
      update public.coupons
      set used_count = used_count + 1,
          updated_at = now()
      where id = coupon_reservation.coupon_id
        and (
          usage_limit is null
          or used_count < usage_limit
        );
      get diagnostics affected_rows = row_count;
      if affected_rows <> 1 then
        raise exception 'La capacidad reservada del cupón no está disponible';
      end if;

      update public.checkout_coupon_reservations
      set status = 'redeemed',
          redeemed_at = now()
      where id = coupon_reservation.id;
    end if;
  end if;

  update public.payments
  set status = 'paid',
      provider_payment_intent_id = coalesce(
        p_provider_payment_id,
        provider_payment_intent_id
      ),
      raw_payload = coalesce(p_event_payload, '{}'::jsonb),
      updated_at = now()
  where id = target_payment.id;

  update public.orders
  set status = 'paid',
      payment_status = 'paid',
      shipment_status = 'preparing',
      reservation_expires_at = null,
      updated_at = now()
  where id = p_order_id;

  insert into public.shipments (order_id, status)
  values (p_order_id, 'preparing')
  on conflict (order_id) do update
  set status = 'preparing',
      updated_at = now();

  insert into public.order_notification_outbox (order_id, template)
  values (p_order_id, 'order_paid')
  on conflict (order_id, template) do nothing;

  user_id := target_order.user_id;
  customer_email := target_order.customer_email;
  customer_name := target_order.customer_name;
  order_number := target_order.order_number;
  select status = 'pending'
  into notification_pending
  from public.order_notification_outbox
  where order_id = p_order_id and template = 'order_paid';
  already_processed := not coalesce(event_inserted, false);
  return next;
end;
$$;

create or replace function public.complete_order_notification_outbox(
  p_order_id uuid,
  p_template text,
  p_success boolean,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.order_notification_outbox
  set status = case when p_success then 'sent' else 'pending' end,
      attempts = attempts + 1,
      last_error = case
        when p_success then null
        else left(coalesce(p_error, 'delivery_failed'), 500)
      end,
      sent_at = case when p_success then now() else sent_at end,
      updated_at = now()
  where order_id = p_order_id and template = p_template;

  return found;
end;
$$;

create or replace function public.release_expired_checkout_security_guards()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  released_count integer;
begin
  update public.checkout_coupon_reservations
  set status = 'released',
      released_at = now()
  where status = 'reserved' and expires_at <= now();
  get diagnostics released_count = row_count;

  delete from public.checkout_reservation_guards
  where expires_at <= now();

  return released_count;
end;
$$;

revoke all on function public.acquire_checkout_reservation_guard(uuid, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.acquire_checkout_reservation_guard(uuid, text, timestamptz, integer) to service_role;

revoke all on function public.reserve_checkout_coupon(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_checkout_coupon(uuid, uuid, text, timestamptz) to service_role;

revoke all on function public.release_checkout_security_guards(uuid, text) from public, anon, authenticated;
grant execute on function public.release_checkout_security_guards(uuid, text) to service_role;

revoke all on function public.finalize_paid_order(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(uuid, text, text, text, text, jsonb) to service_role;

revoke all on function public.complete_order_notification_outbox(uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.complete_order_notification_outbox(uuid, text, boolean, text) to service_role;

revoke all on function public.release_expired_checkout_security_guards() from public, anon, authenticated;
grant execute on function public.release_expired_checkout_security_guards() to service_role;

revoke all on function public.cleanup_checkout_guards_on_order_terminal() from public, anon, authenticated;
