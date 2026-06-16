insert into public.fragrance_families (name, slug) values
  ('Amaderada + Cítrica', 'amaderada-citrica'),
  ('Ámbar + Especiada', 'ambar-especiada'),
  ('Floral + Almizclada', 'floral-almizclada'),
  ('Oud + Cuero', 'oud-cuero')
on conflict (slug) do nothing;

insert into public.brands (name, slug, country) values
  ('DecantsCBA', 'decantscba', 'AR'),
  ('Maison Nube', 'maison-nube', 'FR'),
  ('Terra Lab', 'terra-lab', 'IT')
on conflict (slug) do nothing;

with data as (
  select
    b.id as brand_id,
    f.id as family_id,
    v.name,
    v.slug,
    v.concentration,
    v.description,
    v.notes_top,
    v.notes_heart,
    v.notes_base,
    v.gender
  from (
    values
      ('DecantsCBA', 'Amaderada + Cítrica', 'Citrus Woods', 'citrus-woods', 'Eau de Parfum', 'Bergamota, lima y maderas secas para probar un fresco con presencia.', array['Bergamota','Lima','Pimienta rosa'], array['Cedro','Neroli','Vetiver'], array['Sándalo','Musk','Ámbar'], 'unisex'),
      ('DecantsCBA', 'Ámbar + Especiada', 'Amber Spice', 'amber-spice', 'Eau de Parfum', 'Ámbar resinoso, canela y maderas cremosas para noches elegantes.', array['Canela','Cardamomo'], array['Resina','Iris'], array['Ámbar','Vainilla','Patchouli'], 'unisex'),
      ('Maison Nube', 'Floral + Almizclada', 'Fleur Blanche', 'fleur-blanche', 'Eau de Parfum', 'Flor blanca transparente, musk limpio y fondo suave.', array['Mandarina','Pera'], array['Jazmín','Azahar','Iris'], array['Musk','Cedro blanco'], 'feminine'),
      ('Terra Lab', 'Oud + Cuero', 'Oud Noir', 'oud-noir', 'Extrait de Parfum', 'Oud seco, cuero y humo suave para comparar rendimiento.', array['Azafrán','Pimienta negra'], array['Oud','Cuero'], array['Incienso','Ámbar gris'], 'masculine')
  ) as v(brand_name, family_name, name, slug, concentration, description, notes_top, notes_heart, notes_base, gender)
  join public.brands b on b.name = v.brand_name
  join public.fragrance_families f on f.name = v.family_name
)
insert into public.products (
  brand_id,
  family_id,
  name,
  slug,
  concentration,
  description,
  notes_top,
  notes_heart,
  notes_base,
  gender,
  status
)
select brand_id, family_id, name, slug, concentration, description, notes_top, notes_heart, notes_base, gender, 'active'
from data
on conflict (slug) do nothing;

insert into public.product_images (product_id, storage_path, alt, sort_order)
select id, 'https://d22fxaf9t8d39k.cloudfront.net/700ef8daf59477c9b3d0feb3b8dd3b06f50e0c58d05151bea3b3d1d28ff17a9b389501.png', name || ' decant', 0
from public.products
on conflict do nothing;

insert into public.decant_variants (product_id, size_ml, sku, price_cents, stock_on_hand, low_stock_threshold)
select p.id, v.size_ml, upper(left(replace(p.slug, '-', ''), 2)) || '-' || v.size_ml || 'ML', v.price_cents, v.stock_on_hand, v.low_stock_threshold
from public.products p
cross join (
  values
    (2::numeric, 1600000, 18, 5),
    (5::numeric, 2400000, 7, 6),
    (10::numeric, 3200000, 5, 4)
) as v(size_ml, price_cents, stock_on_hand, low_stock_threshold)
on conflict (product_id, size_ml) do nothing;
