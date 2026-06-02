-- Supabase schema for a perfume decants e-commerce.
-- Run this in Supabase SQL Editor on a fresh project.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('customer', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'product_gender') then
    create type public.product_gender as enum ('unisex', 'feminine', 'masculine');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending',
      'confirmed',
      'paid',
      'preparing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum (
      'pending',
      'authorized',
      'paid',
      'failed',
      'refunded',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'shipment_status') then
    create type public.shipment_status as enum (
      'pending',
      'preparing',
      'in_transit',
      'delivered',
      'delayed',
      'returned',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'cart_status') then
    create type public.cart_status as enum ('active', 'ordered', 'abandoned');
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_movement_reason') then
    create type public.inventory_movement_reason as enum (
      'purchase',
      'sale',
      'adjustment',
      'return',
      'damage',
      'reservation_release'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'coupon_discount_type') then
    create type public.coupon_discount_type as enum ('percentage', 'fixed_amount');
  end if;
end $$;

create sequence if not exists public.order_number_seq start 10000;

create or replace function public.next_order_number()
returns text
language sql
as $$
  select 'ORD-' || to_char(now(), 'YYYYMM') || '-' || nextval('public.order_number_seq')::text;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists role public.user_role not null default 'customer',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  alter column role set default 'customer';

create table if not exists public.perfume_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.perfume_brands(id),
  category_id uuid not null references public.categories(id),
  name text not null,
  slug text not null unique,
  description text not null,
  concentration text not null,
  gender public.product_gender not null default 'unisex',
  top_notes text[] not null default '{}',
  heart_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists brand_id uuid references public.perfume_brands(id),
  add column if not exists category_id uuid references public.categories(id),
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists concentration text,
  add column if not exists gender public.product_gender not null default 'unisex',
  add column if not exists top_notes text[] not null default '{}',
  add column if not exists heart_notes text[] not null default '{}',
  add column if not exists base_notes text[] not null default '{}',
  add column if not exists active boolean not null default true,
  add column if not exists featured boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists products_slug_unique_idx on public.products(slug);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_ml numeric(5,2) not null check (size_ml > 0),
  sku text not null unique,
  price_cents integer not null check (price_cents >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size_ml)
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  street text not null,
  apartment text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'AR',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.cart_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  carrier text,
  base_price_cents integer not null default 0 check (base_price_cents >= 0),
  estimated_days_min integer check (estimated_days_min is null or estimated_days_min >= 0),
  estimated_days_max integer check (estimated_days_max is null or estimated_days_max >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type public.coupon_discount_type not null,
  discount_value integer not null check (discount_value > 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  max_discount_cents integer check (max_discount_cents is null or max_discount_cents >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  order_number text not null unique default public.next_order_number(),
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  shipment_status public.shipment_status not null default 'pending',
  address_id uuid references public.addresses(id),
  shipping_method_id uuid references public.shipping_methods(id),
  coupon_id uuid references public.coupons(id),
  customer_email text not null,
  customer_name text not null,
  shipping_address jsonb not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  variant_id uuid references public.product_variants(id),
  product_name text not null,
  brand_name text,
  variant_size_ml numeric(5,2) not null,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  provider_session_id text,
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'ars',
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shipping_method_id uuid references public.shipping_methods(id),
  carrier text,
  tracking_number text,
  tracking_url text,
  status public.shipment_status not null default 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id),
  order_id uuid references public.orders(id) on delete set null,
  quantity integer not null,
  reason public.inventory_movement_reason not null,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists perfume_brands_touch_updated_at on public.perfume_brands;
create trigger perfume_brands_touch_updated_at before update on public.perfume_brands
for each row execute function public.touch_updated_at();

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at before update on public.categories
for each row execute function public.touch_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists product_variants_touch_updated_at on public.product_variants;
create trigger product_variants_touch_updated_at before update on public.product_variants
for each row execute function public.touch_updated_at();

drop trigger if exists addresses_touch_updated_at on public.addresses;
create trigger addresses_touch_updated_at before update on public.addresses
for each row execute function public.touch_updated_at();

drop trigger if exists carts_touch_updated_at on public.carts;
create trigger carts_touch_updated_at before update on public.carts
for each row execute function public.touch_updated_at();

drop trigger if exists cart_items_touch_updated_at on public.cart_items;
create trigger cart_items_touch_updated_at before update on public.cart_items
for each row execute function public.touch_updated_at();

drop trigger if exists shipping_methods_touch_updated_at on public.shipping_methods;
create trigger shipping_methods_touch_updated_at before update on public.shipping_methods
for each row execute function public.touch_updated_at();

drop trigger if exists coupons_touch_updated_at on public.coupons;
create trigger coupons_touch_updated_at before update on public.coupons
for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at before update on public.payments
for each row execute function public.touch_updated_at();

drop trigger if exists shipments_touch_updated_at on public.shipments;
create trigger shipments_touch_updated_at before update on public.shipments
for each row execute function public.touch_updated_at();

drop trigger if exists reviews_touch_updated_at on public.reviews;
create trigger reviews_touch_updated_at before update on public.reviews
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_order_owner(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where id = target_order_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.confirm_paid_order(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'paid',
      payment_status = 'paid',
      shipment_status = 'preparing'
  where id = target_order_id;

  update public.product_variants variant
  set stock = greatest(0, variant.stock - item.quantity)
  from public.order_items item
  where item.order_id = target_order_id
    and item.variant_id = variant.id;

  insert into public.inventory_movements (variant_id, order_id, quantity, reason, note)
  select item.variant_id, item.order_id, -item.quantity, 'sale', 'Stock descontado por pago confirmado'
  from public.order_items item
  where item.order_id = target_order_id
    and item.variant_id is not null;

  insert into public.shipments (order_id, status)
  values (target_order_id, 'preparing')
  on conflict (order_id) do update
  set status = excluded.status,
      updated_at = now();
end;
$$;

create index if not exists perfume_brands_active_idx on public.perfume_brands(active);
create index if not exists categories_active_idx on public.categories(active);
create index if not exists products_brand_idx on public.products(brand_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_featured_idx on public.products(active, featured);
create index if not exists product_images_product_order_idx on public.product_images(product_id, sort_order);
create index if not exists product_variants_product_active_idx on public.product_variants(product_id, active);
create index if not exists product_variants_low_stock_idx on public.product_variants(stock, low_stock_threshold) where active = true;
create index if not exists addresses_user_idx on public.addresses(user_id);
create unique index if not exists carts_one_active_per_user_idx on public.carts(user_id) where status = 'active';
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);
create index if not exists cart_items_variant_idx on public.cart_items(variant_id);
create unique index if not exists coupons_code_unique_idx on public.coupons(lower(code));
create index if not exists coupons_active_dates_idx on public.coupons(active, starts_at, ends_at);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_variant_idx on public.order_items(variant_id);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists payments_provider_session_idx on public.payments(provider, provider_session_id);
create index if not exists shipments_order_idx on public.shipments(order_id);
create index if not exists shipments_status_idx on public.shipments(status);
create index if not exists shipments_tracking_idx on public.shipments(tracking_number);
create index if not exists inventory_movements_variant_created_idx on public.inventory_movements(variant_id, created_at desc);
create index if not exists reviews_product_approved_idx on public.reviews(product_id, approved);
create index if not exists reviews_user_idx on public.reviews(user_id);

alter table public.profiles enable row level security;
alter table public.perfume_brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "brands_public_read_active" on public.perfume_brands;
create policy "brands_public_read_active" on public.perfume_brands
for select using (active = true or public.is_admin());

drop policy if exists "brands_admin_all" on public.perfume_brands;
create policy "brands_admin_all" on public.perfume_brands
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "categories_public_read_active" on public.categories;
create policy "categories_public_read_active" on public.categories
for select using (active = true or public.is_admin());

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products_public_read_active" on public.products;
create policy "products_public_read_active" on public.products
for select using (active = true or public.is_admin());

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "product_images_public_read_active_products" on public.product_images;
create policy "product_images_public_read_active_products" on public.product_images
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.active = true
  )
);

drop policy if exists "product_images_admin_all" on public.product_images;
create policy "product_images_admin_all" on public.product_images
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "product_variants_public_read_active" on public.product_variants;
create policy "product_variants_public_read_active" on public.product_variants
for select using (
  public.is_admin()
  or (
    active = true
    and exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.active = true
    )
  )
);

drop policy if exists "product_variants_admin_all" on public.product_variants;
create policy "product_variants_admin_all" on public.product_variants
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "addresses_select_own_or_admin" on public.addresses;
create policy "addresses_select_own_or_admin" on public.addresses
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "addresses_insert_own" on public.addresses;
create policy "addresses_insert_own" on public.addresses
for insert with check (user_id = auth.uid());

drop policy if exists "addresses_update_own_or_admin" on public.addresses;
create policy "addresses_update_own_or_admin" on public.addresses
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "addresses_delete_own_or_admin" on public.addresses;
create policy "addresses_delete_own_or_admin" on public.addresses
for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "carts_select_own_or_admin" on public.carts;
create policy "carts_select_own_or_admin" on public.carts
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "carts_insert_own" on public.carts;
create policy "carts_insert_own" on public.carts
for insert with check (user_id = auth.uid());

drop policy if exists "carts_update_own_or_admin" on public.carts;
create policy "carts_update_own_or_admin" on public.carts
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "cart_items_select_own_or_admin" on public.cart_items;
create policy "cart_items_select_own_or_admin" on public.cart_items
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "cart_items_insert_own_cart" on public.cart_items;
create policy "cart_items_insert_own_cart" on public.cart_items
for insert with check (
  exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = auth.uid()
      and c.status = 'active'
  )
);

drop policy if exists "cart_items_update_own_cart" on public.cart_items;
create policy "cart_items_update_own_cart" on public.cart_items
for update using (
  public.is_admin()
  or exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = auth.uid()
      and c.status = 'active'
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = auth.uid()
      and c.status = 'active'
  )
);

drop policy if exists "cart_items_delete_own_cart" on public.cart_items;
create policy "cart_items_delete_own_cart" on public.cart_items
for delete using (
  public.is_admin()
  or exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = auth.uid()
      and c.status = 'active'
  )
);

drop policy if exists "shipping_methods_public_read_active" on public.shipping_methods;
create policy "shipping_methods_public_read_active" on public.shipping_methods
for select using (active = true or public.is_admin());

drop policy if exists "shipping_methods_admin_all" on public.shipping_methods;
create policy "shipping_methods_admin_all" on public.shipping_methods
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "order_items_select_own_order_or_admin" on public.order_items;
create policy "order_items_select_own_order_or_admin" on public.order_items
for select using (public.is_admin() or public.is_order_owner(order_id));

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "payments_select_own_order_or_admin" on public.payments;
create policy "payments_select_own_order_or_admin" on public.payments
for select using (public.is_admin() or public.is_order_owner(order_id));

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "shipments_select_own_order_or_admin" on public.shipments;
create policy "shipments_select_own_order_or_admin" on public.shipments
for select using (public.is_admin() or public.is_order_owner(order_id));

drop policy if exists "shipments_admin_all" on public.shipments;
create policy "shipments_admin_all" on public.shipments
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "inventory_movements_admin_all" on public.inventory_movements;
create policy "inventory_movements_admin_all" on public.inventory_movements
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "reviews_public_read_approved" on public.reviews;
create policy "reviews_public_read_approved" on public.reviews
for select using (approved = true or user_id = auth.uid() or public.is_admin());

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
for insert with check (user_id = auth.uid());

drop policy if exists "reviews_update_own_unapproved_or_admin" on public.reviews;
create policy "reviews_update_own_unapproved_or_admin" on public.reviews
for update using (public.is_admin() or (user_id = auth.uid() and approved = false))
with check (public.is_admin() or (user_id = auth.uid() and approved = false));

drop policy if exists "reviews_delete_own_or_admin" on public.reviews;
create policy "reviews_delete_own_or_admin" on public.reviews
for delete using (user_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product_images_storage_public_read" on storage.objects;
create policy "product_images_storage_public_read" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "product_images_storage_admin_insert" on storage.objects;
create policy "product_images_storage_admin_insert" on storage.objects
for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_storage_admin_update" on storage.objects;
create policy "product_images_storage_admin_update" on storage.objects
for update using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_storage_admin_delete" on storage.objects;
create policy "product_images_storage_admin_delete" on storage.objects
for delete using (bucket_id = 'product-images' and public.is_admin());

grant usage on schema public to anon, authenticated;
grant usage on sequence public.order_number_seq to authenticated;

grant select on public.perfume_brands to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant select on public.shipping_methods to anon, authenticated;
grant select on public.reviews to anon, authenticated;

grant all on public.profiles to authenticated;
grant all on public.addresses to authenticated;
grant all on public.carts to authenticated;
grant all on public.cart_items to authenticated;
grant all on public.orders to authenticated;
grant all on public.order_items to authenticated;
grant all on public.payments to authenticated;
grant all on public.shipments to authenticated;
grant all on public.inventory_movements to authenticated;
grant all on public.coupons to authenticated;
grant all on public.perfume_brands to authenticated;
grant all on public.categories to authenticated;
grant all on public.products to authenticated;
grant all on public.product_images to authenticated;
grant all on public.product_variants to authenticated;
grant all on public.shipping_methods to authenticated;
grant all on public.reviews to authenticated;

-- Optional bootstrap after creating your first user:
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
