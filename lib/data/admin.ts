import { demoOrders, demoProducts } from "@/lib/demo-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Product, ProductVariant } from "@/lib/types";

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  country?: string | null;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  shipmentStatus: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  shippingAddress: AdminShippingAddress;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    variantLabel: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
  }>;
};

export type AdminShippingAddress = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type InventoryMovement = {
  id: string;
  productName: string;
  sku: string;
  sizeMl: number;
  quantity: number;
  reason: string;
  note: string | null;
  createdAt: string;
};

type LegacyAdminProductRow = {
  id: string;
  name: string;
  slug: string;
  concentration: string;
  description: string;
  notes_top: string[] | null;
  notes_heart: string[] | null;
  notes_base: string[] | null;
  gender: Product["gender"];
  status: Product["status"];
  brands: AdminBrand | null;
  fragrance_families: AdminCategory | null;
  product_images: Array<{ storage_path: string; sort_order: number }> | null;
  decant_variants: Array<{
    id: string;
    size_ml: number | string;
    price_cents: number;
    stock_on_hand: number;
    low_stock_threshold: number;
    sku: string;
    is_active: boolean;
  }> | null;
};

type LegacyAdminVariantRow = NonNullable<LegacyAdminProductRow["decant_variants"]>[number];

type AdminOrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  payment_status: string;
  shipment_status: string;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  shipping_address: AdminShippingAddress | null;
  notes: string | null;
  created_at: string;
  order_items: Array<{
    id: string;
    product_name: string;
    variant_label?: string | null;
    variant_size_ml?: number | string | null;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
  }>;
};

type InventoryMovementRow = {
  id: string;
  quantity: number;
  reason: string;
  note: string | null;
  created_at: string;
  decant_variants: {
    sku: string;
    size_ml: number | string;
    products: { name: string } | null;
  } | null;
};

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
  status,
  brands ( id, name, slug, country ),
  fragrance_families ( id, name, slug ),
  product_images ( storage_path, sort_order ),
  decant_variants ( id, size_ml, price_cents, stock_on_hand, low_stock_threshold, sku, is_active )
`;

const orderSelect = `
  id,
  order_number,
  customer_name,
  customer_email,
  status,
  payment_status,
  shipment_status,
  subtotal_cents,
  shipping_cents,
  discount_cents,
  total_cents,
  shipping_address,
  notes,
  created_at,
  order_items ( id, product_name, variant_label, variant_size_ml, quantity, unit_price_cents, total_cents )
`;

export async function getAdminCatalog() {
  const admin = createSupabaseAdminClient();
  if (!admin) return demoProducts;

  const { data, error } = await admin
    .from("products")
    .select(legacyProductSelect)
    .order("created_at", { ascending: false });

  if (error || !data) return demoProducts;
  return (data as unknown as LegacyAdminProductRow[]).map(mapLegacyAdminProduct);
}

export async function getAdminBrands() {
  const admin = createSupabaseAdminClient();
  if (!admin) return uniqueDemoBrands();

  const { data, error } = await admin.from("brands").select("id,name,slug,country").order("name");
  if (!error && data) return data as AdminBrand[];

  const fallback = await admin.from("perfume_brands").select("id,name,slug,country").order("name");
  return !fallback.error && fallback.data ? (fallback.data as AdminBrand[]) : uniqueDemoBrands();
}

export async function getAdminCategories() {
  const admin = createSupabaseAdminClient();
  if (!admin) return uniqueDemoCategories();

  const { data, error } = await admin.from("fragrance_families").select("id,name,slug").order("name");
  if (!error && data) return data as AdminCategory[];

  const fallback = await admin.from("categories").select("id,name,slug,description").order("name");
  return !fallback.error && fallback.data ? (fallback.data as AdminCategory[]) : uniqueDemoCategories();
}

export async function getAdminOrdersDetailed() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return demoOrders.map<AdminOrder>((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      status: order.status,
      paymentStatus: order.paymentStatus,
      shipmentStatus: order.shipmentStatus,
      subtotalCents: order.totalCents,
      shippingCents: 0,
      discountCents: 0,
      totalCents: order.totalCents,
      shippingAddress: {},
      notes: null,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({ ...item, totalCents: item.quantity * item.unitPriceCents })),
    }));
  }

  const { data, error } = await admin.from("orders").select(orderSelect).order("created_at", { ascending: false }).limit(100);
  if (error || !data) return [];
  return (data as unknown as AdminOrderRow[]).map(mapAdminOrder);
}

export async function getInventoryMovements(limit = 80) {
  const admin = createSupabaseAdminClient();
  if (!admin) return [] as InventoryMovement[];

  const { data, error } = await admin
    .from("inventory_movements")
    .select("id,quantity,reason,note,created_at,decant_variants ( sku, size_ml, products ( name ) )")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as unknown as InventoryMovementRow[]).map((row) => ({
    id: row.id,
    productName: row.decant_variants?.products?.name ?? "Producto",
    sku: row.decant_variants?.sku ?? "-",
    sizeMl: Number(row.decant_variants?.size_ml ?? 0),
    quantity: row.quantity,
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function getAdminDashboard() {
  const [orders, products] = await Promise.all([getAdminOrdersDetailed(), getAdminCatalog()]);
  const revenue = orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.totalCents, 0);
  const pendingOrders = orders.filter((order) => order.status === "pending" || order.status === "pending_payment" || order.status === "payment_review").length;
  const lowStock = products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.stockOnHand <= variant.lowStockThreshold)
      .map((variant) => ({ product, variant })),
  );

  return { orders, products, revenue, pendingOrders, lowStock };
}

function mapLegacyAdminProduct(row: LegacyAdminProductRow): Product {
  const category = row.fragrance_families ?? { id: "unknown", name: "Sin categoria", slug: "sin-categoria" };
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
    status: row.status,
    featured: row.status === "active",
    imageUrl: [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path ?? "/images/hero-decants.png",
    variants: (row.decant_variants ?? []).map(mapVariant).sort((a, b) => a.sizeMl - b.sizeMl),
  };
}

function mapVariant(row: LegacyAdminVariantRow): ProductVariant {
  return {
    id: row.id,
    sizeMl: Number(row.size_ml),
    priceCents: row.price_cents,
    stockOnHand: row.stock_on_hand,
    lowStockThreshold: row.low_stock_threshold,
    sku: row.sku,
    active: row.is_active,
  };
}

function mapAdminOrder(row: AdminOrderRow): AdminOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    status: row.status,
    paymentStatus: row.payment_status,
    shipmentStatus: row.shipment_status,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    discountCents: row.discount_cents,
    totalCents: row.total_cents,
    shippingAddress: row.shipping_address ?? {},
    notes: row.notes,
    createdAt: row.created_at,
    items: row.order_items.map((item) => ({
      id: item.id,
      productName: item.product_name,
      variantLabel: item.variant_label ?? `${Number(item.variant_size_ml ?? 0)}ml`,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      totalCents: item.total_cents,
    })),
  };
}

function uniqueDemoBrands() {
  return Array.from(new Map(demoProducts.map((product) => [product.brand.id, product.brand])).values());
}

function uniqueDemoCategories() {
  return Array.from(new Map(demoProducts.map((product) => [product.category.id, product.category])).values());
}
