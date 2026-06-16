-- Production hardening for DecantsCBA.
-- Run after the main schema/migrations in Supabase SQL Editor.

create extension if not exists pgcrypto;

alter table if exists public.orders
  add column if not exists checkout_idempotency_key text;

create unique index if not exists orders_customer_checkout_idempotency_idx
on public.orders(customer_email, checkout_idempotency_key)
where checkout_idempotency_key is not null;

create index if not exists orders_payment_status_created_idx
on public.orders(payment_status, created_at desc);

create index if not exists orders_status_created_idx
on public.orders(status, created_at desc);

create index if not exists payments_provider_session_idx
on public.payments(provider, provider_session_id);

create index if not exists inventory_movements_variant_created_idx
on public.inventory_movements(variant_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_roles',
    'brands',
    'fragrance_families',
    'perfume_brands',
    'categories',
    'products',
    'product_images',
    'decant_variants',
    'product_variants',
    'addresses',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'payments',
    'shipments',
    'inventory_movements',
    'reviews'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

create or replace function public.has_admin_role()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'role') in ('owner', 'admin', 'staff')
    or (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' -> 'roles') ?| array['owner', 'admin', 'staff'],
    false
  );
$$;

revoke all on function public.has_admin_role() from public;
grant execute on function public.has_admin_role() to authenticated;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  profile_role text;
  table_roles text[];
  roles text[] := array[]::text[];
  selected_role text := 'customer';
begin
  if event->>'user_id' is null then
    return event;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    execute 'select role::text from public.profiles where id = $1'
    into profile_role
    using (event->>'user_id')::uuid;
    if profile_role is not null then
      roles := roles || profile_role;
    end if;
  end if;

  if to_regclass('public.user_roles') is not null then
    execute 'select coalesce(array_agg(role::text), array[]::text[]) from public.user_roles where user_id = $1'
    into table_roles
    using (event->>'user_id')::uuid;
    roles := roles || coalesce(table_roles, array[]::text[]);
  end if;

  select array_agg(distinct role_value)
  into roles
  from unnest(roles || array['customer']) as role_value
  where role_value is not null and role_value <> '';

  if 'owner' = any(roles) then
    selected_role := 'owner';
  elsif 'admin' = any(roles) then
    selected_role := 'admin';
  elsif 'staff' = any(roles) then
    selected_role := 'staff';
  end if;

  claims := coalesce(event->'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{app_metadata}', coalesce(claims->'app_metadata', '{}'::jsonb), true);
  claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(selected_role), true);
  claims := jsonb_set(claims, '{app_metadata,roles}', to_jsonb(roles), true);

  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

create or replace function public.increment_variant_stock(p_variant_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad a incrementar debe ser positiva';
  end if;

  update public.product_variants
  set stock = stock + p_quantity,
      updated_at = now()
  where id = p_variant_id;

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

create or replace function public.increment_decant_variant_stock(p_variant_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad a incrementar debe ser positiva';
  end if;

  update public.decant_variants
  set stock_on_hand = stock_on_hand + p_quantity,
      updated_at = now()
  where id = p_variant_id;

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

create or replace function public.reserve_checkout_stock(p_items jsonb)
returns table (
  variant_id uuid,
  variant_table text,
  previous_stock integer,
  next_stock integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  item_variant_id uuid;
  item_table text;
  item_quantity integer;
  updated_previous_stock integer;
  updated_next_stock integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Los items de stock deben ser un array JSON';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_variant_id := (item ->> 'variant_id')::uuid;
    item_table := item ->> 'table_name';
    item_quantity := (item ->> 'quantity')::integer;
    updated_previous_stock := null;
    updated_next_stock := null;

    if item_quantity is null or item_quantity <= 0 then
      raise exception 'La cantidad de reserva debe ser positiva';
    end if;

    if item_table = 'product_variants' then
      update public.product_variants
      set stock = stock - item_quantity,
          updated_at = now()
      where id = item_variant_id
        and active = true
        and stock >= item_quantity
      returning stock + item_quantity, stock
      into updated_previous_stock, updated_next_stock;
    elsif item_table = 'decant_variants' then
      update public.decant_variants
      set stock_on_hand = stock_on_hand - item_quantity,
          updated_at = now()
      where id = item_variant_id
        and is_active = true
        and stock_on_hand >= item_quantity
      returning stock_on_hand + item_quantity, stock_on_hand
      into updated_previous_stock, updated_next_stock;
    else
      raise exception 'Tabla de variante no soportada: %', item_table;
    end if;

    if updated_previous_stock is null then
      raise exception 'Stock insuficiente para la variante %', item_variant_id;
    end if;

    variant_id := item_variant_id;
    variant_table := item_table;
    previous_stock := updated_previous_stock;
    next_stock := updated_next_stock;
    return next;
  end loop;
end;
$$;

revoke all on function public.increment_variant_stock(uuid, integer) from public;
revoke all on function public.increment_decant_variant_stock(uuid, integer) from public;
revoke all on function public.reserve_checkout_stock(jsonb) from public;
revoke execute on function public.increment_variant_stock(uuid, integer) from anon, authenticated;
revoke execute on function public.increment_decant_variant_stock(uuid, integer) from anon, authenticated;
revoke execute on function public.reserve_checkout_stock(jsonb) from anon, authenticated;

grant execute on function public.increment_variant_stock(uuid, integer) to service_role;
grant execute on function public.increment_decant_variant_stock(uuid, integer) to service_role;
grant execute on function public.reserve_checkout_stock(jsonb) to service_role;

do $$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'brands',
    'fragrance_families',
    'perfume_brands',
    'categories',
    'products',
    'decant_variants',
    'product_variants',
    'inventory_movements'
  ]
  loop
    if to_regclass('public.' || target_table) is not null then
      policy_name := target_table || '_admin_write';
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
      execute format(
        'create policy %I on public.%I for all to authenticated using ((select public.has_admin_role())) with check ((select public.has_admin_role()))',
        policy_name,
        target_table
      );
    end if;
  end loop;
end $$;

-- Storage bucket remains public for direct object URLs; avoid broad SELECT policies
-- that let clients list every object in the bucket.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product_images_storage_public_read" on storage.objects;
drop policy if exists "product images bucket public read" on storage.objects;

drop policy if exists "product_images_storage_admin_write" on storage.objects;
create policy "product_images_storage_admin_write" on storage.objects
for all to authenticated
using (bucket_id = 'product-images' and (select public.has_admin_role()))
with check (bucket_id = 'product-images' and (select public.has_admin_role()));
