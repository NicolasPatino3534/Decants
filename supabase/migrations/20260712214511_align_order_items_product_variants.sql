alter table public.order_items
  add column if not exists brand_name text,
  add column if not exists variant_size_ml numeric(5,2),
  add column if not exists sku text;

alter table public.order_items
  add column if not exists total_cents integer;

update public.order_items
set total_cents = unit_price_cents * quantity
where total_cents is null;

update public.order_items
set variant_size_ml = nullif(regexp_replace(coalesce(variant_label, ''), '[^0-9.]', '', 'g'), '')::numeric
where variant_size_ml is null
  and coalesce(variant_label, '') ~ '[0-9]';

alter table public.order_items
  drop constraint if exists order_items_variant_id_fkey;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'order_items'
      and constraint_name = 'order_items_variant_id_product_variants_fkey'
  ) then
    alter table public.order_items
      add constraint order_items_variant_id_product_variants_fkey
      foreign key (variant_id)
      references public.product_variants(id)
      not valid;
  end if;
end $$;

alter table public.inventory_movements
  add column if not exists order_id uuid references public.orders(id) on delete set null;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_variant_id_fkey;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'inventory_movements'
      and constraint_name = 'inventory_movements_variant_id_product_variants_fkey'
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_variant_id_product_variants_fkey
      foreign key (variant_id)
      references public.product_variants(id)
      not valid;
  end if;
end $$;
