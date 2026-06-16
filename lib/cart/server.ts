import type { SupabaseClient } from "@supabase/supabase-js";
import { clampCartQuantity } from "@/lib/cart/pricing";
import type { CartLine } from "@/lib/types";

type CartItemInput = {
  variantId: string;
  quantity: number;
};

type LegacyVariantRow = {
  id: string;
  size_ml: number | string;
  price_cents: number;
  stock_on_hand: number;
  is_active: boolean;
  products: {
    id: string;
    name: string;
    slug: string;
    product_images: Array<{ storage_path: string; sort_order: number }> | null;
  } | null;
};

type ProductVariantRow = {
  id: string;
  size_ml: number | string;
  price_cents: number;
  stock: number;
  active: boolean;
  products: {
    id: string;
    name: string;
    slug: string;
    product_images: Array<{ storage_path: string; public_url: string | null; sort_order: number; is_primary: boolean }> | null;
  } | null;
};

type CartItemRow = {
  variant_id: string;
  quantity: number;
};

const productImagesBucket = "product-images";

export async function buildCartLinesFromItems(supabase: SupabaseClient, items: CartItemInput[]) {
  const normalizedItems = normalizeCartItems(items);
  if (normalizedItems.length === 0) return [] as CartLine[];

  const legacy = await buildLegacyCartLines(supabase, normalizedItems);
  if (legacy.length === normalizedItems.length) return legacy;

  const modern = await buildProductVariantCartLines(supabase, normalizedItems);
  return modern.length > 0 ? modern : legacy;
}

export async function getPersistedCartLines(supabase: SupabaseClient, userId: string) {
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!cart) return [] as CartLine[];

  const { data, error } = await supabase.from("cart_items").select("variant_id,quantity").eq("cart_id", cart.id);
  if (error || !data) return [] as CartLine[];
  return buildCartLinesFromItems(
    supabase,
    (data as CartItemRow[]).map((item) => ({ variantId: item.variant_id, quantity: item.quantity })),
  );
}

export async function replacePersistedCart(supabase: SupabaseClient, userId: string, lines: CartLine[]) {
  const cart = await ensureActiveCart(supabase, userId);
  if (!cart) return { ok: false, error: "No se pudo crear el carrito." };

  const refreshedLines = await buildCartLinesFromItems(
    supabase,
    lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
  );

  const { error: deleteError } = await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  if (deleteError) return { ok: false, error: deleteError.message };

  if (refreshedLines.length === 0) return { ok: true, lines: refreshedLines };

  const { error: insertError } = await supabase.from("cart_items").insert(
    refreshedLines.map((line) => ({
      cart_id: cart.id,
      variant_id: line.variantId,
      quantity: line.quantity,
    })),
  );

  if (insertError) return { ok: false, error: insertError.message, lines: refreshedLines };
  return { ok: true, lines: refreshedLines };
}

export async function clearPersistedCart(supabase: SupabaseClient, userId: string) {
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!cart) return { ok: true };
  const { error } = await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  return { ok: !error, error: error?.message };
}

async function ensureActiveCart(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) return existing;

  const { data } = await supabase
    .from("carts")
    .insert({ user_id: userId, status: "active" })
    .select("id")
    .single();

  return data;
}

function normalizeCartItems(items: CartItemInput[]) {
  const byVariant = new Map<string, number>();
  items.forEach((item) => {
    const quantity = Math.max(1, Math.trunc(Number(item.quantity)));
    if (!item.variantId || !Number.isFinite(quantity)) return;
    byVariant.set(item.variantId, (byVariant.get(item.variantId) ?? 0) + quantity);
  });
  return Array.from(byVariant.entries()).map(([variantId, quantity]) => ({ variantId, quantity }));
}

async function buildLegacyCartLines(supabase: SupabaseClient, items: CartItemInput[]) {
  const quantities = new Map(items.map((item) => [item.variantId, item.quantity]));
  const { data, error } = await supabase
    .from("decant_variants")
    .select("id,size_ml,price_cents,stock_on_hand,is_active,products ( id, name, slug, product_images ( storage_path, sort_order ) )")
    .in("id", items.map((item) => item.variantId))
    .eq("is_active", true);

  if (error || !data) return [] as CartLine[];

  return (data as unknown as LegacyVariantRow[])
    .filter((variant) => variant.products && variant.stock_on_hand > 0)
    .map((variant) => ({
      productId: variant.products?.id ?? "",
      productSlug: variant.products?.slug ?? "",
      productName: variant.products?.name ?? "Decant",
      imageUrl: resolveLegacyImageUrl(variant.products?.product_images),
      variantId: variant.id,
      sizeMl: Number(variant.size_ml),
      priceCents: variant.price_cents,
      stockOnHand: variant.stock_on_hand,
      quantity: clampCartQuantity(quantities.get(variant.id) ?? 1, variant.stock_on_hand),
    }))
    .filter((line) => line.quantity > 0);
}

async function buildProductVariantCartLines(supabase: SupabaseClient, items: CartItemInput[]) {
  const quantities = new Map(items.map((item) => [item.variantId, item.quantity]));
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,size_ml,price_cents,stock,active,products ( id, name, slug, product_images ( storage_path, public_url, sort_order, is_primary ) )")
    .in("id", items.map((item) => item.variantId))
    .eq("active", true);

  if (error || !data) return [] as CartLine[];

  return (data as unknown as ProductVariantRow[])
    .filter((variant) => variant.products && variant.stock > 0)
    .map((variant) => ({
      productId: variant.products?.id ?? "",
      productSlug: variant.products?.slug ?? "",
      productName: variant.products?.name ?? "Decant",
      imageUrl: resolveProductImageUrl(variant.products?.product_images, supabase),
      variantId: variant.id,
      sizeMl: Number(variant.size_ml),
      priceCents: variant.price_cents,
      stockOnHand: variant.stock,
      quantity: clampCartQuantity(quantities.get(variant.id) ?? 1, variant.stock),
    }))
    .filter((line) => line.quantity > 0);
}

function resolveLegacyImageUrl(images: NonNullable<LegacyVariantRow["products"]>["product_images"] | undefined) {
  const image = [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return image?.storage_path ?? "https://d22fxaf9t8d39k.cloudfront.net/700ef8daf59477c9b3d0feb3b8dd3b06f50e0c58d05151bea3b3d1d28ff17a9b389501.png";
}

function resolveProductImageUrl(images: NonNullable<ProductVariantRow["products"]>["product_images"] | undefined, supabase: SupabaseClient) {
  const image = [...(images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
  if (!image) return "https://d22fxaf9t8d39k.cloudfront.net/700ef8daf59477c9b3d0feb3b8dd3b06f50e0c58d05151bea3b3d1d28ff17a9b389501.png";
  if (image.public_url) return image.public_url;
  if (image.storage_path.startsWith("http") || image.storage_path.startsWith("/")) return image.storage_path;
  return supabase.storage.from(productImagesBucket).getPublicUrl(image.storage_path).data.publicUrl;
}
