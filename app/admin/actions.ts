"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const productStatuses = ["draft", "active", "archived"] as const;
const orderStatuses = ["pending_payment", "payment_review", "paid", "preparing", "ready_to_ship", "shipped", "delivered", "cancelled", "rejected"] as const;
const shipmentStatuses = ["pending", "preparing", "ready_to_ship", "shipped", "delivered", "delayed"] as const;

async function createAuthorizedAdminClient() {
  await requireAdmin();
  return createSupabaseAdminClient();
}

export async function createBrand(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const name = readString(formData, "name");
  if (!name) return;

  await admin.from("brands").upsert(
    {
      name,
      slug: slugify(name),
      country: readString(formData, "country") || null,
    },
    { onConflict: "slug" },
  );

  revalidateAdminCatalog();
}

export async function updateBrand(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const id = readString(formData, "id");
  const name = readString(formData, "name");
  if (!id || !name) return;

  await admin.from("brands").update({ name, slug: slugify(name), country: readString(formData, "country") || null }).eq("id", id);
  revalidateAdminCatalog();
}

export async function deleteBrand(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const id = readString(formData, "id");
  if (!id) return;
  await admin.from("brands").delete().eq("id", id);
  revalidateAdminCatalog();
}

export async function createCategory(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const name = readString(formData, "name");
  if (!name) return;

  await admin.from("fragrance_families").upsert({ name, slug: slugify(name) }, { onConflict: "slug" });
  revalidateAdminCatalog();
}

export async function updateCategory(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const id = readString(formData, "id");
  const name = readString(formData, "name");
  if (!id || !name) return;

  await admin.from("fragrance_families").update({ name, slug: slugify(name) }).eq("id", id);
  revalidateAdminCatalog();
}

export async function deleteCategory(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const id = readString(formData, "id");
  if (!id) return;
  await admin.from("fragrance_families").delete().eq("id", id);
  revalidateAdminCatalog();
}

export async function createProduct(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const name = readString(formData, "name");
  const brandId = readString(formData, "brandId");
  const categoryId = readString(formData, "categoryId");
  if (!name || !brandId || !categoryId) return;

  const status = normalizeOption(readString(formData, "status"), productStatuses, "draft");
  const { data: product } = await admin
    .from("products")
    .insert({
      brand_id: brandId,
      family_id: categoryId,
      category_id: categoryId,
      name,
      slug: slugify(name),
      concentration: readString(formData, "concentration") || "Eau de Parfum",
      description: readString(formData, "description"),
      gender: readString(formData, "gender") || "unisex",
      duration_estimate: readString(formData, "durationEstimate") || null,
      projection_estimate: readString(formData, "projectionEstimate") || null,
      recommended_occasion: readString(formData, "recommendedOccasion") || null,
      recommended_season: readString(formData, "recommendedSeason") || null,
      status,
      active: status === "active",
      featured: formData.get("featured") === "on",
      notes_top: splitNotes(readString(formData, "notesTop")),
      notes_heart: splitNotes(readString(formData, "notesHeart")),
      notes_base: splitNotes(readString(formData, "notesBase")),
      top_notes: splitNotes(readString(formData, "notesTop")),
      heart_notes: splitNotes(readString(formData, "notesHeart")),
      base_notes: splitNotes(readString(formData, "notesBase")),
    })
    .select("id")
    .single();

  if (product) {
    await uploadProductImage(formData, product.id, name);
  }

  revalidateAdminCatalog();
}

export async function updateProduct(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const id = readString(formData, "id");
  const name = readString(formData, "name");
  const brandId = readString(formData, "brandId");
  const categoryId = readString(formData, "categoryId");
  if (!id || !name || !brandId || !categoryId) return;

  const status = normalizeOption(readString(formData, "status"), productStatuses, "draft");
  await admin
    .from("products")
    .update({
      brand_id: brandId,
      family_id: categoryId,
      category_id: categoryId,
      name,
      slug: slugify(name),
      concentration: readString(formData, "concentration") || "Eau de Parfum",
      description: readString(formData, "description"),
      gender: readString(formData, "gender") || "unisex",
      duration_estimate: readString(formData, "durationEstimate") || null,
      projection_estimate: readString(formData, "projectionEstimate") || null,
      recommended_occasion: readString(formData, "recommendedOccasion") || null,
      recommended_season: readString(formData, "recommendedSeason") || null,
      status,
      active: status === "active",
      featured: formData.get("featured") === "on",
      notes_top: splitNotes(readString(formData, "notesTop")),
      notes_heart: splitNotes(readString(formData, "notesHeart")),
      notes_base: splitNotes(readString(formData, "notesBase")),
      top_notes: splitNotes(readString(formData, "notesTop")),
      heart_notes: splitNotes(readString(formData, "notesHeart")),
      base_notes: splitNotes(readString(formData, "notesBase")),
    })
    .eq("id", id);

  await uploadProductImage(formData, id, name);
  revalidateAdminCatalog();
}

export async function archiveProduct(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const id = readString(formData, "id");
  if (!id) return;
  await admin.from("products").update({ status: "archived", active: false }).eq("id", id);
  revalidateAdminCatalog();
}

export async function upsertVariant(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const id = readString(formData, "id");
  const productId = readString(formData, "productId");
  if (!productId) return;

  const payload = {
    product_id: productId,
    size_ml: readNumber(formData, "sizeMl"),
    sku: readString(formData, "sku"),
    price_cents: readMoneyCents(formData, "price"),
    stock_on_hand: readNumber(formData, "stock"),
    low_stock_threshold: readNumber(formData, "lowStockThreshold"),
    is_active: formData.get("active") === "on",
  };

  if (!payload.size_ml || !payload.sku || payload.price_cents < 0) return;

  if (id) {
    await admin.from("decant_variants").update(payload).eq("id", id);
  } else {
    await admin.from("decant_variants").insert(payload);
  }

  revalidateAdminCatalog();
}

export async function deleteVariant(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const id = readString(formData, "id");
  if (!id) return;
  await admin.from("decant_variants").delete().eq("id", id);
  revalidateAdminCatalog();
}

export async function adjustStock(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const variantId = readString(formData, "variantId");
  const quantity = readNumber(formData, "quantity");
  const note = readString(formData, "note");

  if (!variantId || !Number.isFinite(quantity) || quantity === 0) return;

  const { data } = await admin.from("decant_variants").select("stock_on_hand").eq("id", variantId).single();
  const nextStock = Math.max(0, Number(data?.stock_on_hand ?? 0) + quantity);
  await admin.from("decant_variants").update({ stock_on_hand: nextStock }).eq("id", variantId);
  await admin.from("inventory_movements").insert({
    variant_id: variantId,
    quantity,
    reason: "adjustment",
    note,
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/stock");
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
}

export async function updateOrderStatus(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const orderId = readString(formData, "orderId");
  const status = normalizeOption(readString(formData, "status"), orderStatuses, "pending_payment");
  if (!orderId) return;

  await admin.from("orders").update({ status }).eq("id", orderId);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin");
}

export async function updateShipmentStatus(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const orderId = readString(formData, "orderId");
  const shipmentStatus = normalizeOption(readString(formData, "shipmentStatus"), shipmentStatuses, "pending");
  if (!orderId) return;

  await admin.from("orders").update({ shipment_status: shipmentStatus }).eq("id", orderId);
  await admin.from("shipments").update({ status: shipmentStatus }).eq("order_id", orderId);
  revalidatePath("/admin/envios");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin");
}

export async function updateOrderNotes(formData: FormData) {
  const admin = await createAuthorizedAdminClient();
  if (!admin) return;

  const orderId = readString(formData, "orderId");
  if (!orderId) return;
  await admin.from("orders").update({ notes: readString(formData, "notes") || null }).eq("id", orderId);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}

async function uploadProductImage(formData: FormData, productId: string, productName: string) {
  const admin = await createAuthorizedAdminClient();
  const file = formData.get("image");
  if (!admin || !(file instanceof File) || file.size === 0) return;

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${productId}/${Date.now()}.${extension}`;
  const { error } = await admin.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) return;

  await admin.from("product_images").insert({
    product_id: productId,
    storage_path: path,
    alt: `${productName} decant`,
    sort_order: 0,
  });
}

function revalidateAdminCatalog() {
  revalidatePath("/admin");
  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/categorias");
  revalidatePath("/catalogo");
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readNumber(formData: FormData, key: string) {
  return Number(formData.get(key) ?? 0);
}

function readMoneyCents(formData: FormData, key: string) {
  const value = readString(formData, key).replace(",", ".");
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function splitNotes(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeOption<T extends readonly string[]>(value: string, allowed: T, fallback: T[number]): T[number] {
  return allowed.includes(value) ? (value as T[number]) : fallback;
}
