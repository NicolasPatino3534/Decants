import type { SupabaseClient } from "@supabase/supabase-js";
import { demoProducts } from "@/lib/demo-data";
import { filterProducts, sortProducts, type ProductFilters } from "@/lib/catalog/filters";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Brand, Category, Product, ProductVariant } from "@/lib/types";

const productImagesBucket = "product-images";

type ProductImageRow = {
  storage_path: string;
  public_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

type ProductVariantRow = {
  id: string;
  size_ml: number | string;
  price_cents: number;
  stock: number;
  low_stock_threshold: number;
  sku: string;
  active: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  concentration: string;
  description: string;
  top_notes: string[] | null;
  heart_notes: string[] | null;
  base_notes: string[] | null;
  gender: Product["gender"];
  duration_estimate: string | null;
  projection_estimate: string | null;
  recommended_occasion: string | null;
  recommended_season: string | null;
  active: boolean;
  featured: boolean;
  perfume_brands: (Brand & { active?: boolean }) | null;
  categories: (Category & { active?: boolean }) | null;
  product_images: ProductImageRow[] | null;
  product_variants: ProductVariantRow[] | null;
};

type LegacyProductRow = {
  id: string;
  name: string;
  slug: string;
  concentration: string;
  description: string;
  notes_top: string[] | null;
  notes_heart: string[] | null;
  notes_base: string[] | null;
  gender: Product["gender"];
  duration_estimate: string | null;
  projection_estimate: string | null;
  recommended_occasion: string | null;
  recommended_season: string | null;
  status: Product["status"];
  brands: Brand | null;
  fragrance_families: Category | null;
  product_images: Array<{ storage_path: string; alt: string | null; sort_order: number }> | null;
  decant_variants: Array<{
    id: string;
    size_ml: number | string;
    price_cents: number;
    stock_on_hand: number;
    low_stock_threshold: number;
    sku: string;
  }> | null;
};

const productSelect = `
  id,
  name,
  slug,
  concentration,
  description,
  top_notes,
  heart_notes,
  base_notes,
  gender,
  duration_estimate,
  projection_estimate,
  recommended_occasion,
  recommended_season,
  active,
  featured,
  perfume_brands!inner ( id, name, slug, country, active ),
  categories!inner ( id, name, slug, description, active ),
  product_images ( storage_path, public_url, alt_text, is_primary, sort_order ),
  product_variants!inner ( id, size_ml, price_cents, stock, low_stock_threshold, sku, active )
`;

const legacyProductSelect = `
  id,
  name,
  slug,
  concentration,
  description,
  notes_top,
  notes_heart,
  notes_base,
  gender,
  duration_estimate,
  projection_estimate,
  recommended_occasion,
  recommended_season,
  status,
  brands ( id, name, slug ),
  fragrance_families ( id, name, slug ),
  product_images ( storage_path, alt, sort_order ),
  decant_variants ( id, size_ml, price_cents, stock_on_hand, low_stock_threshold, sku )
`;

export async function getProducts(filters: ProductFilters = {}) {
  const supabase = (createSupabaseAdminClient() as SupabaseClient | null) ?? (await createSupabaseServerClient());
  if (!supabase) return filterProducts(demoProducts, filters);

  const { products, error } = await fetchProductsFromSupabase(supabase, filters);
  if (error) return [];
  return products;
}

export async function getProductBySlug(slug: string) {
  const supabase = (createSupabaseAdminClient() as SupabaseClient | null) ?? (await createSupabaseServerClient());
  if (!supabase) return demoProducts.find((product) => product.slug === slug) ?? null;

  const { product, error } = await fetchProductBySlugFromSupabase(supabase, slug);
  if (error) return null;
  return product;
}

export async function getAdminProducts() {
  const supabase = (createSupabaseAdminClient() as SupabaseClient | null) ?? (await createSupabaseServerClient());
  if (!supabase) return demoProducts;

  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .order("created_at", { ascending: false });

  if (error || !data) return demoProducts;
  return sortProducts((data as unknown as ProductRow[]).map((row) => mapProduct(row, supabase)), "name-asc");
}

export async function fetchProductsFromSupabase(supabase: SupabaseClient, filters: ProductFilters = {}) {
  let query = supabase
    .from("products")
    .select(productSelect)
    .eq("active", true)
    .eq("perfume_brands.active", true)
    .eq("categories.active", true)
    .eq("product_variants.active", true);

  if (filters.query?.trim()) query = query.ilike("name", `%${filters.query.trim()}%`);
  if (filters.brand) query = query.eq("perfume_brands.slug", filters.brand);
  if (filters.category) query = query.eq("categories.slug", filters.category);
  if (filters.family) query = query.eq("categories.slug", filters.family);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.sizeMl) query = query.eq("product_variants.size_ml", filters.sizeMl);
  if (filters.minPriceCents != null) query = query.gte("product_variants.price_cents", filters.minPriceCents);
  if (filters.maxPriceCents != null) query = query.lte("product_variants.price_cents", filters.maxPriceCents);

  const { data, error } = await query.order("featured", { ascending: false }).order("name");

  if (error || !data) {
    if (shouldUseLegacyCatalog(error)) return fetchLegacyProductsFromSupabase(supabase, filters);
    return { products: [] as Product[], error: error ?? new Error("No se pudieron cargar los productos.") };
  }

  const products = (data as unknown as ProductRow[])
    .map((row) => mapProduct(row, supabase))
    .filter((product) => product.variants.length > 0);

  return { products: sortProducts(products, filters.sort), error: null };
}

export async function fetchProductBySlugFromSupabase(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("active", true)
    .eq("perfume_brands.active", true)
    .eq("categories.active", true)
    .eq("product_variants.active", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (shouldUseLegacyCatalog(error)) return fetchLegacyProductBySlugFromSupabase(supabase, slug);
    return { product: null, error };
  }
  if (!data) return { product: null, error: null };
  return { product: mapProduct(data as unknown as ProductRow, supabase), error: null };
}

async function fetchLegacyProductsFromSupabase(supabase: SupabaseClient, filters: ProductFilters = {}) {
  const { data, error } = await supabase
    .from("products")
    .select(legacyProductSelect)
    .eq("status", "active")
    .order("name");

  if (error || !data) {
    return { products: [] as Product[], error: error ?? new Error("No se pudieron cargar los productos.") };
  }

  const products = (data as unknown as LegacyProductRow[])
    .map((row) => mapLegacyProduct(row, supabase))
    .filter((product) => product.variants.length > 0);

  return { products: filterProducts(products, filters), error: null };
}

async function fetchLegacyProductBySlugFromSupabase(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(legacyProductSelect)
    .eq("status", "active")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return { product: null, error };
  if (!data) return { product: null, error: null };
  return { product: mapLegacyProduct(data as unknown as LegacyProductRow, supabase), error: null };
}

function mapProduct(row: ProductRow, supabase: SupabaseClient): Product {
  const category = row.categories ?? { id: "unknown", name: "Sin categoria", slug: "sin-categoria", description: null };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.perfume_brands ?? { id: "unknown", name: "Sin marca", slug: "sin-marca", country: null },
    category,
    family: category,
    concentration: row.concentration,
    description: row.description,
    notesTop: row.top_notes ?? [],
    notesHeart: row.heart_notes ?? [],
    notesBase: row.base_notes ?? [],
    gender: row.gender,
    durationEstimate: row.duration_estimate,
    projectionEstimate: row.projection_estimate,
    recommendedOccasion: row.recommended_occasion,
    recommendedSeason: row.recommended_season,
    status: row.active ? "active" : "archived",
    featured: row.featured,
    imageUrl: resolveProductImageUrl(row.product_images, supabase),
    variants: mapVariants(row.product_variants),
  };
}

function mapLegacyProduct(row: LegacyProductRow, supabase: SupabaseClient): Product {
  const category = row.fragrance_families ?? { id: "unknown", name: "Sin categoria", slug: "sin-categoria", description: null };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brands ?? { id: "unknown", name: "Sin marca", slug: "sin-marca" },
    category,
    family: category,
    concentration: row.concentration,
    description: row.description,
    notesTop: row.notes_top ?? [],
    notesHeart: row.notes_heart ?? [],
    notesBase: row.notes_base ?? [],
    gender: row.gender,
    durationEstimate: row.duration_estimate,
    projectionEstimate: row.projection_estimate,
    recommendedOccasion: row.recommended_occasion,
    recommendedSeason: row.recommended_season,
    status: row.status,
    featured: false,
    imageUrl: resolveLegacyProductImageUrl(row.product_images, supabase),
    variants: (row.decant_variants ?? [])
      .map((variant) => ({
        id: variant.id,
        sizeMl: Number(variant.size_ml),
        priceCents: variant.price_cents,
        stockOnHand: variant.stock_on_hand,
        lowStockThreshold: variant.low_stock_threshold,
        sku: variant.sku,
        active: true,
      }))
      .sort((a, b) => a.sizeMl - b.sizeMl),
  };
}

function mapVariants(variants: ProductVariantRow[] | null): ProductVariant[] {
  return (variants ?? [])
    .filter((variant) => variant.active)
    .map((variant) => ({
      id: variant.id,
      sizeMl: Number(variant.size_ml),
      priceCents: variant.price_cents,
      stockOnHand: variant.stock,
      lowStockThreshold: variant.low_stock_threshold,
      sku: variant.sku,
      active: variant.active,
    }))
    .sort((a, b) => a.sizeMl - b.sizeMl);
}

function resolveProductImageUrl(images: ProductImageRow[] | null, supabase: SupabaseClient) {
  const image = [...(images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
  if (!image) return "https://d22fxaf9t8d39k.cloudfront.net/700ef8daf59477c9b3d0feb3b8dd3b06f50e0c58d05151bea3b3d1d28ff17a9b389501.png";
  if (image.public_url) return image.public_url;
  if (image.storage_path.startsWith("http") || image.storage_path.startsWith("/")) return image.storage_path;
  return supabase.storage.from(productImagesBucket).getPublicUrl(image.storage_path).data.publicUrl;
}

function resolveLegacyProductImageUrl(images: LegacyProductRow["product_images"], supabase: SupabaseClient) {
  const image = [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  if (!image) return "https://d22fxaf9t8d39k.cloudfront.net/700ef8daf59477c9b3d0feb3b8dd3b06f50e0c58d05151bea3b3d1d28ff17a9b389501.png";
  if (image.storage_path.startsWith("http") || image.storage_path.startsWith("/")) return image.storage_path;
  return supabase.storage.from(productImagesBucket).getPublicUrl(image.storage_path).data.publicUrl;
}

function shouldUseLegacyCatalog(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return code === "PGRST200" || message.includes("perfume_brands") || message.includes("product_variants");
}
