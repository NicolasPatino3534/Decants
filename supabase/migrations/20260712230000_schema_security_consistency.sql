-- Keep the legacy admin catalog and the modern storefront schema consistent,
-- and remove direct client writes that bypass the server-side checkout validation.

drop policy if exists "orders customer insert" on public.orders;
drop policy if exists "order items insert own order" on public.order_items;

create unique index if not exists products_slug_unique_idx on public.products (slug);

alter table public.coupons drop constraint if exists coupons_discount_type_check;

update public.coupons
set discount_type = 'percentage'
where discount_type::text = 'percent';

update public.coupons
set discount_type = 'fixed_amount'
where discount_type::text = 'fixed';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.coupons'::regclass
      and conname = 'coupons_discount_type_check'
  ) then
    execute 'alter table public.coupons
      add constraint coupons_discount_type_check
      check (discount_type::text in (''percentage'', ''fixed_amount''))';
  end if;
end $$;

drop policy if exists "product variants public read" on public.product_variants;
create policy "product variants public read" on public.product_variants
for select
using (
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

create or replace function public.sync_legacy_brand_to_storefront()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.perfume_brands where id = old.id;
    return old;
  end if;

  insert into public.perfume_brands (id, name, slug, country, active, updated_at)
  values (new.id, new.name, new.slug, new.country, true, now())
  on conflict (id) do update
  set name = excluded.name,
      slug = excluded.slug,
      country = excluded.country,
      active = excluded.active,
      updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists sync_legacy_brand_to_storefront on public.brands;
create trigger sync_legacy_brand_to_storefront
after insert or update or delete on public.brands
for each row execute function public.sync_legacy_brand_to_storefront();

create or replace function public.sync_legacy_category_to_storefront()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.categories where id = old.id;
    return old;
  end if;

  insert into public.categories (id, name, slug, active, updated_at)
  values (new.id, new.name, new.slug, true, now())
  on conflict (id) do update
  set name = excluded.name,
      slug = excluded.slug,
      active = excluded.active,
      updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists sync_legacy_category_to_storefront on public.fragrance_families;
create trigger sync_legacy_category_to_storefront
after insert or update or delete on public.fragrance_families
for each row execute function public.sync_legacy_category_to_storefront();

revoke all on function public.sync_legacy_brand_to_storefront() from public, anon, authenticated;
revoke all on function public.sync_legacy_category_to_storefront() from public, anon, authenticated;
