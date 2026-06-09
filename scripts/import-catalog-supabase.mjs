import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const env = await readEnvFile(".env.local");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
}

const catalogSource = await fs.readFile("lib/catalog-data.ts", "utf8");
const catalogJson = catalogSource
  .replace(/^import[^\n]+\n\nexport const catalogProducts: Product\[\] = /, "")
  .replace(/;\s*$/, "");
const products = JSON.parse(catalogJson);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const brands = uniqueBy(products.map((product) => product.brand), "slug");
const categories = uniqueBy(products.map((product) => product.category), "slug");

const perfumeBrands = await upsertAndSelect(
  "perfume_brands",
  brands.map(({ name, slug, country = null }) => ({ name, slug, country, active: true })),
  "slug",
);
await upsertAndSelect(
  "brands",
  perfumeBrands.map(({ id, name, slug, country }) => ({ id, name, slug, country })),
  "slug",
);

const categoryRows = await upsertAndSelect(
  "categories",
  categories.map(({ name, slug, description = null }) => ({ name, slug, description, active: true })),
  "slug",
);
await upsertAndSelect(
  "fragrance_families",
  categoryRows.map(({ id, name, slug }) => ({ id, name, slug })),
  "slug",
);

const brandIds = new Map(perfumeBrands.map((brand) => [brand.slug, brand.id]));
const categoryIds = new Map(categoryRows.map((category) => [category.slug, category.id]));
const productRows = products.map((product) => ({
  brand_id: brandIds.get(product.brand.slug),
  family_id: categoryIds.get(product.category.slug),
  category_id: categoryIds.get(product.category.slug),
  name: product.name,
  slug: product.slug,
  concentration: product.concentration,
  description: product.description,
  notes_top: product.notesTop,
  notes_heart: product.notesHeart,
  notes_base: product.notesBase,
  top_notes: product.notesTop,
  heart_notes: product.notesHeart,
  base_notes: product.notesBase,
  gender: product.gender,
  status: product.status,
  active: product.status === "active",
  featured: product.featured,
}));
const importedProducts = await upsertAndSelect("products", productRows, "slug");
const productIds = new Map(importedProducts.map((product) => [product.slug, product.id]));

const variants = products.flatMap((product) =>
  product.variants.map((variant) => ({
    product_id: productIds.get(product.slug),
    size_ml: variant.sizeMl,
    sku: variant.sku,
    price_cents: variant.priceCents,
    stock: variant.stockOnHand,
    low_stock_threshold: variant.lowStockThreshold,
    active: variant.active,
  })),
);
await upsertAndSelect("product_variants", variants, "sku");

const importedIds = [...productIds.values()];
for (const ids of chunks(importedIds, 100)) {
  const { error } = await supabase.from("product_images").delete().in("product_id", ids);
  if (error) throw error;
}

const images = products.map((product) => ({
  product_id: productIds.get(product.slug),
  storage_path: product.imageUrl,
  public_url: product.imageUrl.startsWith("http") ? product.imageUrl : null,
  alt: `${product.name} decant`,
  alt_text: `${product.name} decant`,
  is_primary: true,
  sort_order: 0,
}));
await insertInChunks("product_images", images);

await syncShippingMethods([
  {
    name: "Retiro en Córdoba",
    description: "Retiro coordinado sin costo.",
    carrier: "Decants CBA",
    base_price_cents: 0,
    estimated_days_min: 0,
    estimated_days_max: 2,
    active: true,
  },
  {
    name: "Envío estándar",
    description: "Envío a domicilio dentro de Argentina.",
    carrier: "Correo Argentino",
    base_price_cents: 650000,
    estimated_days_min: 3,
    estimated_days_max: 7,
    active: true,
  },
]);

console.log(`Imported ${products.length} products and ${variants.length} variants.`);

async function upsertAndSelect(table, rows, onConflict) {
  const results = [];
  for (const batch of chunks(rows, 100)) {
    const { data, error } = await supabase.from(table).upsert(batch, { onConflict }).select();
    if (error) throw new Error(`${table}: ${error.message}`);
    results.push(...data);
  }
  return results;
}

async function insertInChunks(table, rows) {
  for (const batch of chunks(rows, 100)) {
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function syncShippingMethods(methods) {
  for (const method of methods) {
    const { data: existing, error: selectError } = await supabase
      .from("shipping_methods")
      .select("id")
      .eq("name", method.name)
      .maybeSingle();
    if (selectError) throw new Error(`shipping_methods: ${selectError.message}`);

    const query = existing
      ? supabase.from("shipping_methods").update(method).eq("id", existing.id)
      : supabase.from("shipping_methods").insert(method);
    const { error } = await query;
    if (error) throw new Error(`shipping_methods: ${error.message}`);
  }
}

function uniqueBy(rows, key) {
  return [...new Map(rows.map((row) => [row[key], row])).values()];
}

function chunks(rows, size) {
  return Array.from({ length: Math.ceil(rows.length / size) }, (_, index) =>
    rows.slice(index * size, (index + 1) * size),
  );
}

async function readEnvFile(path) {
  const content = await fs.readFile(path, "utf8");
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
        return [key, value];
      }),
  );
}
