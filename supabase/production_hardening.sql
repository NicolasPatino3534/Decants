-- Production hardening for Aurum Decants.
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
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_admin boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    execute 'select exists (select 1 from public.profiles where id = $1 and role = ''admin'')'
    into is_admin
    using auth.uid();
  end if;

  if is_admin then
    return true;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_roles'
      and column_name = 'role'
  ) then
    execute 'select exists (select 1 from public.user_roles where user_id = $1 and role = ''admin'')'
    into is_admin
    using auth.uid();
  end if;

  return coalesce(is_admin, false);
end;
$$;

revoke all on function public.has_admin_role() from public;
grant execute on function public.has_admin_role() to authenticated;

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

-- Storage bucket must remain public for product image reads but write-only for admins.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product_images_storage_public_read" on storage.objects;
create policy "product_images_storage_public_read" on storage.objects
for select
using (bucket_id = 'product-images');

drop policy if exists "product_images_storage_admin_write" on storage.objects;
create policy "product_images_storage_admin_write" on storage.objects
for all to authenticated
using (bucket_id = 'product-images' and (select public.has_admin_role()))
with check (bucket_id = 'product-images' and (select public.has_admin_role()));
