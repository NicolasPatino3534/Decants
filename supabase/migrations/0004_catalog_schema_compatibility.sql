alter table public.product_images
  add column if not exists public_url text,
  add column if not exists alt_text text,
  add column if not exists is_primary boolean not null default false;

update public.product_images
set alt_text = coalesce(alt_text, alt)
where alt_text is null;

alter table public.product_images
  alter column alt_text set not null;

insert into public.perfume_brands (id, name, slug, country, active)
select id, name, slug, country, true
from public.brands
on conflict (slug) do update
set name = excluded.name,
    country = excluded.country,
    active = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_brand_id_perfume_brands_fkey'
  ) then
    alter table public.products
      add constraint products_brand_id_perfume_brands_fkey
      foreign key (brand_id) references public.perfume_brands(id);
  end if;
end
$$;

drop index if exists public.products_slug_unique_idx;
