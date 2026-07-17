-- Forward-only release guard for constraints that were created NOT VALID in
-- 20260712214511. Keep lock waits short so a busy database fails closed
-- instead of stalling checkout traffic during a release window.
set lock_timeout = '5s';
set statement_timeout = '10min';

do $$
begin
  if to_regclass('public.order_items') is null
     or to_regclass('public.inventory_movements') is null
     or to_regclass('public.product_variants') is null
     or to_regclass('public.decant_variants') is null
     or to_regclass('public.coupons') is null then
    raise exception 'RELEASE_PREFLIGHT_MISSING_STOREFRONT_SCHEMA';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.order_items'::regclass
      and conname = 'order_items_variant_id_product_variants_fkey'
      and contype = 'f'
  ) then
    raise exception 'RELEASE_PREFLIGHT_MISSING_ORDER_ITEMS_VARIANT_FK';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inventory_movements'::regclass
      and conname = 'inventory_movements_variant_id_product_variants_fkey'
      and contype = 'f'
  ) then
    raise exception 'RELEASE_PREFLIGHT_MISSING_INVENTORY_VARIANT_FK';
  end if;

  if exists (
    select 1
    from public.order_items oi
    left join public.product_variants pv on pv.id = oi.variant_id
    where oi.variant_id is not null and pv.id is null
  ) then
    raise exception 'RELEASE_PREFLIGHT_ORPHAN_ORDER_ITEM_VARIANT';
  end if;

  if exists (
    select 1
    from public.inventory_movements movement
    left join public.product_variants pv on pv.id = movement.variant_id
    where movement.variant_id is not null and pv.id is null
  ) then
    raise exception 'RELEASE_PREFLIGHT_ORPHAN_INVENTORY_VARIANT';
  end if;

  if exists (
    select 1
    from public.product_variants pv
    full join public.decant_variants dv on dv.id = pv.id
    where pv.id is null or dv.id is null
  ) then
    raise exception 'RELEASE_PREFLIGHT_VARIANT_MIRROR_MISSING';
  end if;

  if exists (
    select 1
    from public.product_variants pv
    join public.decant_variants dv on dv.id = pv.id
    where pv.stock <> dv.stock_on_hand
  ) then
    raise exception 'RELEASE_PREFLIGHT_VARIANT_STOCK_DIVERGENCE';
  end if;

  if exists (
    select 1
    from public.coupons
    group by upper(btrim(code))
    having count(*) > 1
  ) then
    raise exception 'RELEASE_PREFLIGHT_COUPON_CODE_COLLISION';
  end if;

  if exists (
    select 1 from public.coupons where btrim(code) = ''
  ) then
    raise exception 'RELEASE_PREFLIGHT_EMPTY_COUPON_CODE';
  end if;
end
$$;

alter table public.order_items
  validate constraint order_items_variant_id_product_variants_fkey;

alter table public.inventory_movements
  validate constraint inventory_movements_variant_id_product_variants_fkey;

update public.coupons
set code = upper(btrim(code))
where code is distinct from upper(btrim(code));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.coupons'::regclass
      and conname = 'coupons_code_normalized_check'
  ) then
    alter table public.coupons
      add constraint coupons_code_normalized_check
      check (code = upper(btrim(code)) and code <> '')
      not valid;
  end if;
end
$$;

alter table public.coupons
  validate constraint coupons_code_normalized_check;

-- The legacy Auth role helper is deprecated and this trigger never needs elevated table
-- privileges. Recreate it as SECURITY INVOKER with an empty search_path.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     and new.role::text <> 'customer'
     and coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'profile role cannot be assigned by the profile owner';
  end if;

  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'profile role cannot be changed by the profile owner';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_profile_role_escalation()
from public, anon, authenticated;
grant execute on function public.prevent_profile_role_escalation()
to service_role;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid in (
      'public.order_items'::regclass,
      'public.inventory_movements'::regclass
    )
      and conname in (
        'order_items_variant_id_product_variants_fkey',
        'inventory_movements_variant_id_product_variants_fkey'
      )
      and not convalidated
  ) then
    raise exception 'RELEASE_POSTCHECK_UNVALIDATED_VARIANT_FK';
  end if;

  if exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'prevent_profile_role_escalation'
      and pg_proc.prosecdef
  ) then
    raise exception 'RELEASE_POSTCHECK_PROFILE_GUARD_IS_SECURITY_DEFINER';
  end if;
end
$$;
