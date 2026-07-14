-- Release checkout reservations atomically. A failed release must remain retryable:
-- stock, payment state, movement audit and the release marker commit together.

create or replace function public.reserve_checkout_stock_mirrored(p_items jsonb)
returns table (
  variant_id uuid,
  variant_table text,
  previous_stock integer,
  next_stock integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  item_variant_id uuid;
  item_quantity integer;
  modern_stock integer;
  legacy_stock integer;
  modern_active boolean;
  legacy_active boolean;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Los items de stock deben ser un array JSON no vacío';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_variant_id := (item ->> 'variant_id')::uuid;
    item_quantity := (item ->> 'quantity')::integer;

    if item_quantity is null or item_quantity <= 0 then
      raise exception 'La cantidad de reserva debe ser positiva';
    end if;

    select pv.stock, dv.stock_on_hand, pv.active, dv.is_active
    into modern_stock, legacy_stock, modern_active, legacy_active
    from public.product_variants pv
    join public.decant_variants dv on dv.id = pv.id
    join public.products p on p.id = pv.product_id and p.id = dv.product_id
    where pv.id = item_variant_id
      and p.status = 'active'
      and p.active = true
    for update of pv, dv;

    if not found or not modern_active or not legacy_active then
      raise exception 'La variante % no está disponible', item_variant_id;
    end if;

    if modern_stock <> legacy_stock then
      raise exception 'El stock de la variante % requiere reconciliación', item_variant_id;
    end if;

    if modern_stock < item_quantity then
      raise exception 'Stock insuficiente para la variante %', item_variant_id;
    end if;

    update public.product_variants
    set stock = stock - item_quantity,
        updated_at = now()
    where id = item_variant_id;

    update public.decant_variants
    set stock_on_hand = stock_on_hand - item_quantity,
        updated_at = now()
    where id = item_variant_id;

    variant_id := item_variant_id;
    variant_table := 'product_variants';
    previous_stock := modern_stock;
    next_stock := modern_stock - item_quantity;
    return next;
  end loop;
end;
$$;

revoke all on function public.reserve_checkout_stock_mirrored(jsonb) from public, anon, authenticated;
grant execute on function public.reserve_checkout_stock_mirrored(jsonb) to service_role;

create or replace function public.release_checkout_stock_mirrored(p_items jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  item_variant_id uuid;
  item_quantity integer;
  modern_stock integer;
  legacy_stock integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Los items de stock deben ser un array JSON';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_variant_id := (item ->> 'variant_id')::uuid;
    item_quantity := (item ->> 'quantity')::integer;
    if item_quantity is null or item_quantity <= 0 then
      raise exception 'La cantidad a liberar debe ser positiva';
    end if;

    select pv.stock, dv.stock_on_hand
    into modern_stock, legacy_stock
    from public.product_variants pv
    join public.decant_variants dv on dv.id = pv.id
    where pv.id = item_variant_id
    for update of pv, dv;

    if not found or modern_stock <> legacy_stock then
      raise exception 'La variante % requiere reconciliación', item_variant_id;
    end if;

    update public.product_variants
    set stock = stock + item_quantity, updated_at = now()
    where id = item_variant_id;
    update public.decant_variants
    set stock_on_hand = stock_on_hand + item_quantity, updated_at = now()
    where id = item_variant_id;
  end loop;

  return true;
end;
$$;

revoke all on function public.release_checkout_stock_mirrored(jsonb) from public, anon, authenticated;
grant execute on function public.release_checkout_stock_mirrored(jsonb) to service_role;

create or replace function public.release_order_stock_reservation(
  p_order_id uuid,
  p_payment_status text default 'failed',
  p_note text default 'Reserva de checkout liberada'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order record;
  target_item record;
  modern_rows integer;
  legacy_rows integer;
begin
  if p_payment_status <> 'failed' then
    raise exception 'Estado terminal de pago no permitido: %', p_payment_status;
  end if;

  select id, status::text as status, payment_status::text as payment_status, stock_released_at
  into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found
    or target_order.stock_released_at is not null
    or target_order.status not in ('pending', 'pending_payment', 'payment_review')
    or target_order.payment_status in ('paid', 'refunded')
    or exists (
      select 1
      from public.payments
      where order_id = p_order_id and status::text in ('paid', 'refunded')
    )
  then
    return false;
  end if;

  for target_item in
    select variant_id, quantity
    from public.order_items
    where order_id = p_order_id and variant_id is not null
  loop
    update public.product_variants
    set stock = stock + target_item.quantity,
        updated_at = now()
    where id = target_item.variant_id;
    get diagnostics modern_rows = row_count;

    update public.decant_variants
    set stock_on_hand = stock_on_hand + target_item.quantity,
        updated_at = now()
    where id = target_item.variant_id;
    get diagnostics legacy_rows = row_count;

    if modern_rows <> 1 or legacy_rows <> 1 then
      raise exception 'La variante reservada % no existe en ambas tablas', target_item.variant_id;
    end if;

    insert into public.inventory_movements (variant_id, order_id, quantity, reason, note)
    values (target_item.variant_id, p_order_id, target_item.quantity, 'return', p_note);
  end loop;

  update public.payments
  set status = p_payment_status::public.payment_status,
      updated_at = now()
  where order_id = p_order_id
    and status::text not in ('paid', 'refunded');

  update public.orders
  set status = 'cancelled',
      payment_status = p_payment_status::public.payment_status,
      stock_released_at = now(),
      updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

revoke all on function public.release_order_stock_reservation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.release_order_stock_reservation(uuid, text, text) to service_role;

create or replace function public.release_expired_checkout_reservations(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order record;
  released_count integer := 0;
begin
  for target_order in
    select id
    from public.orders
    where reservation_expires_at < now()
      and stock_released_at is null
      and payment_status in ('pending', 'payment_review')
      and status <> 'cancelled'
    order by reservation_expires_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  loop
    if public.release_order_stock_reservation(
      target_order.id,
      'failed',
      'Reserva de checkout vencida'
    ) then
      released_count := released_count + 1;
    end if;
  end loop;

  return released_count;
end;
$$;

revoke all on function public.release_expired_checkout_reservations(integer) from public, anon, authenticated;
grant execute on function public.release_expired_checkout_reservations(integer) to service_role;
