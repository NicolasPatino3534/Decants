-- STAGING VALIDATION ONLY.
-- Restore the storefront schema that historically lived in
-- supabase/decants_store_complete.sql but was never added to the migration chain.
--
-- The validation workdir builder copies this file between 0002 and 0003. It must
-- not be copied into supabase/migrations or applied to production.

create extension if not exists pgcrypto;

do $$
begin
  if to_regtype('public.cart_status') is null then
    create type public.cart_status as enum ('active', 'ordered', 'abandoned');
  end if;

  if to_regtype('public.coupon_discount_type') is null then
    create type public.coupon_discount_type as enum ('percentage', 'fixed_amount');
  end if;
end
$$;

create sequence if not exists public.order_number_seq start 10000;

alter table public.profiles
  add column if not exists role public.app_role not null default 'customer';

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

insert into public.perfume_brands (id, name, slug, country, active)
select id, name, slug, country, true
from public.brands
on conflict do nothing;

insert into public.categories (id, name, slug, active)
select id, name, slug, true
from public.fragrance_families
on conflict do nothing;

alter table public.products
  add column if not exists category_id uuid references public.categories(id),
  add column if not exists top_notes text[],
  add column if not exists heart_notes text[],
  add column if not exists base_notes text[],
  add column if not exists active boolean,
  add column if not exists featured boolean;

update public.products as product
set category_id = coalesce(
      product.category_id,
      (
        select category.id
        from public.fragrance_families as family
        join public.categories as category on category.slug = family.slug
        where family.id = product.family_id
      )
    ),
    top_notes = coalesce(top_notes, notes_top, '{}'::text[]),
    heart_notes = coalesce(heart_notes, notes_heart, '{}'::text[]),
    base_notes = coalesce(base_notes, notes_base, '{}'::text[]),
    active = coalesce(active, status = 'active'),
    featured = coalesce(featured, false)
where category_id is null
   or top_notes is null
   or heart_notes is null
   or base_notes is null
   or active is null
   or featured is null;

alter table public.products
  alter column top_notes set default '{}',
  alter column top_notes set not null,
  alter column heart_notes set default '{}',
  alter column heart_notes set not null,
  alter column base_notes set default '{}',
  alter column base_notes set not null,
  alter column active set default true,
  alter column active set not null,
  alter column featured set default false,
  alter column featured set not null;

do $$
begin
  if not exists (select 1 from public.products where category_id is null) then
    alter table public.products alter column category_id set not null;
  end if;
end
$$;

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

insert into public.product_variants (
  id,
  product_id,
  size_ml,
  sku,
  price_cents,
  stock,
  low_stock_threshold,
  active,
  created_at,
  updated_at
)
select
  id,
  product_id,
  size_ml,
  sku,
  price_cents,
  stock_on_hand,
  low_stock_threshold,
  is_active,
  created_at,
  updated_at
from public.decant_variants
on conflict do nothing;

alter table public.addresses
  add column if not exists apartment text,
  add column if not exists updated_at timestamptz not null default now();

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

alter table public.orders
  add column if not exists address_id uuid references public.addresses(id),
  add column if not exists shipping_method_id uuid references public.shipping_methods(id),
  add column if not exists coupon_id uuid references public.coupons(id);

alter table public.order_items
  add column if not exists created_at timestamptz not null default now();

alter table public.payments
  add column if not exists provider_payment_id text,
  add column if not exists paid_at timestamptz;

alter table public.shipments
  add column if not exists shipping_method_id uuid references public.shipping_methods(id);

alter table public.inventory_movements
  add column if not exists order_id uuid references public.orders(id) on delete set null;

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

do $$
begin
  if to_regprocedure('public.next_order_number()') is null then
    execute $function$
      create function public.next_order_number()
      returns text
      language sql
      set search_path = public
      as $body$
        select 'ORD-' || to_char(now(), 'YYYYMM') || '-' || nextval('public.order_number_seq')::text
      $body$
    $function$;
  end if;

  if to_regprocedure('public.is_admin()') is null then
    execute $function$
      create function public.is_admin()
      returns boolean
      language sql
      stable
      security invoker
      set search_path = ''
      as $body$
        select public.is_staff()
      $body$
    $function$;
  end if;

  if to_regprocedure('public.is_order_owner(uuid)') is null then
    execute $function$
      create function public.is_order_owner(target_order_id uuid)
      returns boolean
      language sql
      stable
      security invoker
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.orders
          where id = target_order_id
            and user_id = auth.uid()
        )
      $body$
    $function$;
  end if;

  if to_regprocedure('public.confirm_paid_order(uuid)') is null then
    execute $function$
      create function public.confirm_paid_order(target_order_id uuid)
      returns void
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        update public.orders
        set status = 'paid',
            payment_status = 'paid',
            shipment_status = 'preparing',
            updated_at = now()
        where id = target_order_id;

        update public.product_variants variant
        set stock = greatest(0, variant.stock - item.quantity),
            updated_at = now()
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
      end
      $body$
    $function$;
  end if;
end
$$;

revoke execute on function public.confirm_paid_order(uuid) from public, anon, authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'perfume_brands',
    'categories',
    'product_variants',
    'carts',
    'cart_items',
    'shipping_methods',
    'coupons',
    'reviews'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
  end loop;
end
$$;

drop policy if exists "brands_public_read_active" on public.perfume_brands;
create policy "brands_public_read_active" on public.perfume_brands
for select using (active = true or public.is_staff());

drop policy if exists "brands_admin_all" on public.perfume_brands;
create policy "brands_admin_all" on public.perfume_brands
for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "categories_public_read_active" on public.categories;
create policy "categories_public_read_active" on public.categories
for select using (active = true or public.is_staff());

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories
for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "product_variants_public_read_active" on public.product_variants;
create policy "product_variants_public_read_active" on public.product_variants
for select using (
  public.is_staff()
  or (
    active = true
    and exists (
      select 1
      from public.products
      where products.id = product_variants.product_id
        and products.status = 'active'
        and products.active = true
    )
  )
);

drop policy if exists "product_variants_admin_all" on public.product_variants;
create policy "product_variants_admin_all" on public.product_variants
for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "carts_select_own_or_admin" on public.carts;
create policy "carts_select_own_or_admin" on public.carts
for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists "carts_insert_own" on public.carts;
create policy "carts_insert_own" on public.carts
for insert with check (user_id = auth.uid());

drop policy if exists "carts_update_own_or_admin" on public.carts;
create policy "carts_update_own_or_admin" on public.carts
for update using (user_id = auth.uid() or public.is_staff())
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "cart_items_select_own_or_admin" on public.cart_items;
create policy "cart_items_select_own_or_admin" on public.cart_items
for select using (
  public.is_staff()
  or exists (
    select 1 from public.carts
    where carts.id = cart_items.cart_id and carts.user_id = auth.uid()
  )
);

drop policy if exists "cart_items_insert_own_cart" on public.cart_items;
create policy "cart_items_insert_own_cart" on public.cart_items
for insert with check (
  exists (
    select 1 from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
      and carts.status = 'active'
  )
);

drop policy if exists "cart_items_update_own_cart" on public.cart_items;
create policy "cart_items_update_own_cart" on public.cart_items
for update using (
  public.is_staff()
  or exists (
    select 1 from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
      and carts.status = 'active'
  )
)
with check (
  public.is_staff()
  or exists (
    select 1 from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
      and carts.status = 'active'
  )
);

drop policy if exists "cart_items_delete_own_cart" on public.cart_items;
create policy "cart_items_delete_own_cart" on public.cart_items
for delete using (
  public.is_staff()
  or exists (
    select 1 from public.carts
    where carts.id = cart_items.cart_id
      and carts.user_id = auth.uid()
      and carts.status = 'active'
  )
);

drop policy if exists "shipping_methods_public_read_active" on public.shipping_methods;
create policy "shipping_methods_public_read_active" on public.shipping_methods
for select using (active = true or public.is_staff());

drop policy if exists "shipping_methods_admin_all" on public.shipping_methods;
create policy "shipping_methods_admin_all" on public.shipping_methods
for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons
for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "reviews_public_read_approved" on public.reviews;
create policy "reviews_public_read_approved" on public.reviews
for select using (approved = true or user_id = auth.uid() or public.is_staff());

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
for insert with check (user_id = auth.uid());

drop policy if exists "reviews_update_own_unapproved_or_admin" on public.reviews;
create policy "reviews_update_own_unapproved_or_admin" on public.reviews
for update using (public.is_staff() or (user_id = auth.uid() and approved = false))
with check (public.is_staff() or (user_id = auth.uid() and approved = false));

drop policy if exists "reviews_delete_own_or_admin" on public.reviews;
create policy "reviews_delete_own_or_admin" on public.reviews
for delete using (user_id = auth.uid() or public.is_staff());

create index if not exists perfume_brands_active_idx on public.perfume_brands (active);
create index if not exists categories_active_idx on public.categories (active);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_featured_idx on public.products (active, featured);
create index if not exists product_variants_product_active_idx on public.product_variants (product_id, active);
create index if not exists product_variants_low_stock_idx
on public.product_variants (stock, low_stock_threshold)
where active = true;
create unique index if not exists carts_one_active_per_user_idx
on public.carts (user_id)
where status = 'active';
create index if not exists cart_items_cart_idx on public.cart_items (cart_id);
create index if not exists cart_items_variant_idx on public.cart_items (variant_id);
create unique index if not exists coupons_code_unique_idx on public.coupons (lower(code));
create index if not exists coupons_active_dates_idx on public.coupons (active, starts_at, ends_at);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists reviews_product_approved_idx on public.reviews (product_id, approved);
create index if not exists reviews_user_idx on public.reviews (user_id);

grant usage on sequence public.order_number_seq to authenticated, service_role;

grant select on public.perfume_brands to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant select on public.shipping_methods to anon, authenticated;
grant select on public.reviews to anon, authenticated;

grant all on public.perfume_brands to authenticated, service_role;
grant all on public.categories to authenticated, service_role;
grant all on public.product_variants to authenticated, service_role;
grant all on public.carts to authenticated, service_role;
grant all on public.cart_items to authenticated, service_role;
grant all on public.shipping_methods to authenticated, service_role;
grant all on public.coupons to authenticated, service_role;
grant all on public.reviews to authenticated, service_role;

do $$
declare
  target_table text;
  trigger_name text;
begin
  foreach target_table in array array[
    'perfume_brands',
    'categories',
    'product_variants',
    'carts',
    'cart_items',
    'shipping_methods',
    'coupons',
    'reviews'
  ]
  loop
    trigger_name := target_table || '_touch_updated_at';
    if not exists (
      select 1
      from pg_trigger
      where tgrelid = format('public.%I', target_table)::regclass
        and tgname = trigger_name
        and not tgisinternal
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
        trigger_name,
        target_table
      );
    end if;
  end loop;
end
$$;
