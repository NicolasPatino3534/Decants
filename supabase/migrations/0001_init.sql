create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'staff', 'admin', 'owner');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.shipment_status as enum ('pending', 'preparing', 'in_transit', 'delivered', 'delayed');
create type public.inventory_reason as enum ('purchase', 'sale', 'adjustment', 'return', 'damage');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  country text,
  created_at timestamptz not null default now()
);

create table public.fragrance_families (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  family_id uuid not null references public.fragrance_families(id),
  name text not null,
  slug text not null unique,
  concentration text not null,
  description text not null,
  notes_top text[] not null default '{}',
  notes_heart text[] not null default '{}',
  notes_base text[] not null default '{}',
  gender text not null check (gender in ('unisex', 'feminine', 'masculine')),
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.decant_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_ml numeric(5,2) not null check (size_ml > 0),
  sku text not null unique,
  price_cents integer not null check (price_cents >= 0),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size_ml)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.decant_variants(id),
  quantity integer not null,
  reason public.inventory_reason not null,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  street text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'AR',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  order_number text not null unique,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  shipment_status public.shipment_status not null default 'pending',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  customer_email text not null,
  customer_name text not null,
  shipping_address jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  variant_id uuid references public.decant_variants(id),
  product_name text not null,
  variant_label text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer not null check (total_cents >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_session_id text unique,
  provider_payment_intent_id text,
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'ars',
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  tracking_url text,
  status public.shipment_status not null default 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'system')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  provider text not null,
  template text not null,
  recipient text not null,
  status text not null,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
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

create trigger touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger touch_products_updated_at before update on public.products
for each row execute function public.touch_updated_at();
create trigger touch_variants_updated_at before update on public.decant_variants
for each row execute function public.touch_updated_at();
create trigger touch_orders_updated_at before update on public.orders
for each row execute function public.touch_updated_at();
create trigger touch_payments_updated_at before update on public.payments
for each row execute function public.touch_updated_at();
create trigger touch_shipments_updated_at before update on public.shipments
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = required_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('staff', 'admin', 'owner')
  );
$$;

create index products_status_idx on public.products (status);
create index products_brand_idx on public.products (brand_id);
create index products_family_idx on public.products (family_id);
create index variants_product_active_idx on public.decant_variants (product_id, is_active);
create index variants_low_stock_idx on public.decant_variants (stock_on_hand, low_stock_threshold) where is_active = true;
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index payments_session_idx on public.payments (provider_session_id);
create unique index shipments_order_unique on public.shipments (order_id);
create index shipments_status_idx on public.shipments (status);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

create or replace function public.confirm_paid_order(
  target_order_id uuid,
  provider_payment_intent text default null,
  event_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'paid',
      payment_status = 'paid',
      updated_at = now()
  where id = target_order_id;

  update public.payments
  set status = 'paid',
      provider_payment_intent_id = coalesce(provider_payment_intent, provider_payment_intent_id),
      raw_payload = event_payload,
      updated_at = now()
  where order_id = target_order_id;

  update public.decant_variants as variant
  set stock_on_hand = greatest(0, variant.stock_on_hand - item.quantity),
      updated_at = now()
  from public.order_items as item
  where item.order_id = target_order_id
    and item.variant_id = variant.id;

  insert into public.shipments (order_id, status)
  values (target_order_id, 'preparing')
  on conflict do nothing;
end;
$$;

revoke all on function public.confirm_paid_order(uuid, text, jsonb) from public;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.brands enable row level security;
alter table public.fragrance_families enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.decant_variants enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.notifications enable row level security;
alter table public.email_events enable row level security;

create policy "profiles read own or staff" on public.profiles
for select using (id = auth.uid() or public.is_staff());
create policy "profiles update own or staff" on public.profiles
for update using (id = auth.uid() or public.is_staff()) with check (id = auth.uid() or public.is_staff());

create policy "roles read own or staff" on public.user_roles
for select using (user_id = auth.uid() or public.is_staff());
create policy "roles write admin owner" on public.user_roles
for all using (public.has_role('admin') or public.has_role('owner'))
with check (public.has_role('admin') or public.has_role('owner'));

create policy "brands public read" on public.brands for select using (true);
create policy "brands staff write" on public.brands for all using (public.is_staff()) with check (public.is_staff());

create policy "families public read" on public.fragrance_families for select using (true);
create policy "families staff write" on public.fragrance_families for all using (public.is_staff()) with check (public.is_staff());

create policy "products public active read" on public.products
for select using (status = 'active' or public.is_staff());
create policy "products staff write" on public.products
for all using (public.is_staff()) with check (public.is_staff());

create policy "product images public read" on public.product_images
for select using (
  exists (
    select 1 from public.products p
    where p.id = product_id and (p.status = 'active' or public.is_staff())
  )
);
create policy "product images staff write" on public.product_images
for all using (public.is_staff()) with check (public.is_staff());

create policy "variants public active read" on public.decant_variants
for select using (
  is_active = true and exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  ) or public.is_staff()
);
create policy "variants staff write" on public.decant_variants
for all using (public.is_staff()) with check (public.is_staff());

create policy "inventory staff read" on public.inventory_movements for select using (public.is_staff());
create policy "inventory staff insert" on public.inventory_movements for insert with check (public.is_staff());

create policy "addresses own or staff read" on public.addresses
for select using (user_id = auth.uid() or public.is_staff());
create policy "addresses own insert" on public.addresses
for insert with check (user_id = auth.uid());
create policy "addresses own or staff update" on public.addresses
for update using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "addresses own delete" on public.addresses
for delete using (user_id = auth.uid());

create policy "orders own or staff read" on public.orders
for select using (user_id = auth.uid() or public.is_staff());
create policy "orders customer insert" on public.orders
for insert with check (user_id = auth.uid() or user_id is null);
create policy "orders staff update" on public.orders
for update using (public.is_staff()) with check (public.is_staff());

create policy "order items own order or staff read" on public.order_items
for select using (
  public.is_staff() or exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  )
);
create policy "order items insert own order" on public.order_items
for insert with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or o.user_id is null)
  )
);
create policy "order items staff update" on public.order_items
for update using (public.is_staff()) with check (public.is_staff());

create policy "payments own order or staff read" on public.payments
for select using (
  public.is_staff() or exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  )
);
create policy "payments staff write" on public.payments
for all using (public.is_staff()) with check (public.is_staff());

create policy "shipments own order or staff read" on public.shipments
for select using (
  public.is_staff() or exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  )
);
create policy "shipments staff write" on public.shipments
for all using (public.is_staff()) with check (public.is_staff());

create policy "notifications own or staff read" on public.notifications
for select using (user_id = auth.uid() or public.is_staff());
create policy "notifications staff insert" on public.notifications
for insert with check (public.is_staff());
create policy "notifications own mark read" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "email events staff read" on public.email_events for select using (public.is_staff());
create policy "email events staff insert" on public.email_events for insert with check (public.is_staff());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

create policy "product images bucket public read" on storage.objects
for select using (bucket_id = 'product-images');
create policy "product images bucket staff write" on storage.objects
for all using (bucket_id = 'product-images' and public.is_staff())
with check (bucket_id = 'product-images' and public.is_staff());
