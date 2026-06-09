import { NextResponse } from "next/server";
import { calculateCartTotals } from "@/lib/cart/pricing";
import { clearPersistedCart } from "@/lib/cart/server";
import { checkoutSchema, type CheckoutInput } from "@/lib/checkout/schema";
import { resolveCouponDiscount, resolveShippingMethod } from "@/lib/checkout/options";
import { buildCheckoutLines, CheckoutStockError, normalizeCheckoutItems } from "@/lib/checkout/stock";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/payments/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CheckoutVariant = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  brandName: string | null;
  sizeMl: number;
  sku: string;
  priceCents: number;
  stockOnHand: number;
  table: "decant_variants" | "product_variants";
  stockColumn: "stock_on_hand" | "stock";
};

type LegacyVariantRow = {
  id: string;
  size_ml: number | string;
  sku: string;
  price_cents: number;
  stock_on_hand: number;
  is_active: boolean;
  products: { id: string; name: string; slug: string; brands?: { name: string } | null } | null;
};

type ProductVariantRow = {
  id: string;
  size_ml: number | string;
  sku: string;
  price_cents: number;
  stock: number;
  active: boolean;
  products: { id: string; name: string; slug: string; perfume_brands?: { name: string } | null } | null;
};

type ReservedStock = {
  variant: CheckoutVariant;
  quantity: number;
  previousStock: number;
  nextStock: number;
};

type ReserveCheckoutStockRow = {
  variant_id: string;
  variant_table: CheckoutVariant["table"];
  previous_stock: number;
  next_stock: number;
};

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos de checkout invalidos." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin no esta configurado para crear pedidos." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const existing = await findExistingOrderByIdempotencyKey(admin, parsed.data);
  if (existing) {
    return NextResponse.json({ url: `${env.siteUrl}/checkout/success?order=${existing.id}`, orderId: existing.id, duplicate: true });
  }

  const items = normalizeCheckoutItems(parsed.data.items);
  const variants = await fetchCheckoutVariants(admin, items.map((item) => item.variantId));
  let lines: Array<{ variant: CheckoutVariant; quantity: number; totalCents: number }>;
  try {
    lines = buildCheckoutLines(items, variants);
  } catch (caught) {
    if (caught instanceof CheckoutStockError) {
      return NextResponse.json({ error: caught.message }, { status: caught.status });
    }
    console.error("checkout_stock_validation_error", caught);
    return NextResponse.json({ error: "No se pudo validar el stock." }, { status: 500 });
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  const [shippingMethod, coupon] = await Promise.all([
    resolveShippingMethod(admin, parsed.data.shippingMethodId),
    resolveCouponDiscount({
      supabase: admin,
      couponCode: parsed.data.couponCode,
      subtotalCents,
    }),
  ]);

  if (coupon.error) {
    return NextResponse.json({ error: coupon.error }, { status: 400 });
  }

  const totals = calculateCartTotals({
    lines: lines.map((line) => ({
      productId: line.variant.productId,
      productSlug: line.variant.productSlug,
      productName: line.variant.productName,
      imageUrl: "",
      variantId: line.variant.id,
      sizeMl: line.variant.sizeMl,
      priceCents: line.variant.priceCents,
      quantity: line.quantity,
    })),
    shippingCents: shippingMethod.basePriceCents,
    discountCents: coupon.discountCents,
  });

  const reservedStock = await reserveStock(admin, lines);
  if (!reservedStock.ok) {
    return NextResponse.json({ error: reservedStock.error }, { status: 409 });
  }

  let orderIdForRollback: string | null = null;

  try {
    const order = await createOrder(admin, {
      input: parsed.data,
      userId: user?.id ?? null,
      shippingMethodId: isUuid(shippingMethod.id) ? shippingMethod.id : null,
      couponId: coupon.couponId,
      totals,
    });
    orderIdForRollback = order.id;

    await createOrderItems(admin, order.id, lines);
    await createInventoryReservationMovements(admin, order.id, lines);
    await incrementCouponUsage(admin, coupon.couponId);
    if (user && supabase) await clearPersistedCart(supabase, user.id);

    const stripe = getStripe();
    if (!stripe) {
      await createPayment(admin, {
        orderId: order.id,
        provider: "manual",
        providerSessionId: null,
        totalCents: totals.totalCents,
      });
      return NextResponse.json({ url: `${env.siteUrl}/checkout/success?order=${order.id}&pending=1`, orderId: order.id, payment: "manual" });
    }

    let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
    try {
      const discounts = await createStripeDiscounts(stripe, {
        orderId: order.id,
        discountCents: totals.discountCents,
        couponCode: parsed.data.couponCode,
      });

      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: parsed.data.customer.email,
          success_url: `${env.siteUrl}/checkout/success?order=${order.id}`,
          cancel_url: `${env.siteUrl}/checkout`,
          metadata: { orderId: order.id, idempotencyKey: parsed.data.idempotencyKey },
          ...(discounts.length > 0 ? { discounts } : {}),
          line_items: [
            ...lines.map((line) => ({
              quantity: line.quantity,
              price_data: {
                currency: "ars",
                unit_amount: line.variant.priceCents,
                product_data: {
                  name: `${line.variant.productName} ${line.variant.sizeMl}ml`,
                },
              },
            })),
            {
              quantity: 1,
              price_data: {
                currency: "ars",
                unit_amount: totals.shippingCents,
                product_data: { name: shippingMethod.name },
              },
            },
          ],
        },
        { idempotencyKey: `checkout-session-${order.id}` },
      );
    } catch (caught) {
      console.error("stripe_checkout_session_error", caught);
      throw new CheckoutError("El proveedor de pagos no esta disponible. Intenta nuevamente en unos minutos.", 502);
    }

    if (!session.url) {
      throw new CheckoutError("Stripe no devolvio una URL de checkout.", 502);
    }

    await createPayment(admin, {
      orderId: order.id,
      provider: "stripe",
      providerSessionId: session.id,
      totalCents: totals.totalCents,
    });

    return NextResponse.json({ url: session.url, orderId: order.id, payment: "stripe" });
  } catch (caught) {
    await releaseStock(admin, reservedStock.reserved);
    if (orderIdForRollback) await markOrderCheckoutFailed(admin, orderIdForRollback);
    if (caught instanceof CheckoutError) {
      return NextResponse.json({ error: caught.message }, { status: caught.status });
    }
    console.error("checkout_create_order_error", caught);
    return NextResponse.json({ error: "No se pudo crear el pedido." }, { status: 500 });
  }
}

async function fetchCheckoutVariants(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, variantIds: string[]): Promise<CheckoutVariant[]> {
  const legacy = await admin
    .from("decant_variants")
    .select("id,size_ml,sku,price_cents,stock_on_hand,is_active,products ( id, name, slug, brands ( name ) )")
    .in("id", variantIds)
    .eq("is_active", true);

  if (!legacy.error && legacy.data && legacy.data.length > 0) {
    return (legacy.data as unknown as LegacyVariantRow[]).map((variant) => ({
      id: variant.id,
      productId: variant.products?.id ?? "",
      productName: variant.products?.name ?? "Decant",
      productSlug: variant.products?.slug ?? "",
      brandName: variant.products?.brands?.name ?? null,
      sizeMl: Number(variant.size_ml),
      sku: variant.sku,
      priceCents: variant.price_cents,
      stockOnHand: variant.stock_on_hand,
      table: "decant_variants" as const,
      stockColumn: "stock_on_hand" as const,
    }));
  }

  const modern = await admin
    .from("product_variants")
    .select("id,size_ml,sku,price_cents,stock,active,products ( id, name, slug, perfume_brands ( name ) )")
    .in("id", variantIds)
    .eq("active", true);

  if (modern.error || !modern.data) return [];

  return (modern.data as unknown as ProductVariantRow[]).map((variant) => ({
    id: variant.id,
    productId: variant.products?.id ?? "",
    productName: variant.products?.name ?? "Decant",
    productSlug: variant.products?.slug ?? "",
    brandName: variant.products?.perfume_brands?.name ?? null,
    sizeMl: Number(variant.size_ml),
    sku: variant.sku,
    priceCents: variant.price_cents,
    stockOnHand: variant.stock,
    table: "product_variants" as const,
    stockColumn: "stock" as const,
  }));
}

async function reserveStock(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  lines: Array<{ variant: CheckoutVariant; quantity: number }>,
) {
  const { data, error } = await admin.rpc("reserve_checkout_stock", {
    p_items: lines.map((line) => ({
      variant_id: line.variant.id,
      table_name: line.variant.table,
      quantity: line.quantity,
    })),
  });

  if (!error && data) {
    const rows = data as ReserveCheckoutStockRow[];
    const reservedByVariant = new Map(rows.map((row) => [row.variant_id, row]));
    return {
      ok: true as const,
      reserved: lines.map((line) => {
        const reserved = reservedByVariant.get(line.variant.id);
        return {
          variant: line.variant,
          quantity: line.quantity,
          previousStock: Number(reserved?.previous_stock ?? line.variant.stockOnHand),
          nextStock: Number(reserved?.next_stock ?? line.variant.stockOnHand - line.quantity),
        };
      }),
    };
  }

  if (error && !isMissingRpcError(error)) {
    return {
      ok: false as const,
      error: error.message || "El stock cambio. Revisa el carrito.",
      reserved: [],
    };
  }

  return reserveStockOptimistic(admin, lines);
}

async function reserveStockOptimistic(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  lines: Array<{ variant: CheckoutVariant; quantity: number }>,
) {
  const reserved: ReservedStock[] = [];

  for (const line of lines) {
    const nextStock = line.variant.stockOnHand - line.quantity;
    const { data, error } = await admin
      .from(line.variant.table)
      .update({ [line.variant.stockColumn]: nextStock })
      .eq("id", line.variant.id)
      .eq(line.variant.stockColumn, line.variant.stockOnHand)
      .select("id");

    if (error || !data || data.length === 0) {
      await releaseStock(admin, reserved);
      return { ok: false as const, error: `El stock de ${line.variant.productName} cambio. Revisa el carrito.`, reserved: [] };
    }

    reserved.push({ variant: line.variant, quantity: line.quantity, previousStock: line.variant.stockOnHand, nextStock });
  }

  return { ok: true as const, reserved };
}

async function releaseStock(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, reserved: ReservedStock[]) {
  await Promise.all(reserved.map((item) => incrementVariantStock(admin, item.variant, item.quantity)));
}

async function incrementVariantStock(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  variant: CheckoutVariant,
  quantity: number,
) {
  const rpcName = variant.table === "product_variants" ? "increment_variant_stock" : "increment_decant_variant_stock";
  const { data, error } = await admin.rpc(rpcName, { p_variant_id: variant.id, p_quantity: quantity });

  if (!error && data !== false) return true;
  if (error && !isMissingRpcError(error)) {
    console.error("checkout_stock_release_rpc_error", error);
    return false;
  }

  const { data: current, error: selectError } = await admin
    .from(variant.table)
    .select(variant.stockColumn)
    .eq("id", variant.id)
    .maybeSingle();

  if (selectError || !current) return false;

  const currentStock = Number((current as Record<string, unknown>)[variant.stockColumn] ?? 0);
  const { error: updateError } = await admin
    .from(variant.table)
    .update({ [variant.stockColumn]: currentStock + quantity })
    .eq("id", variant.id);

  return !updateError;
}

async function createStripeDiscounts(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  {
    orderId,
    discountCents,
    couponCode,
  }: {
    orderId: string;
    discountCents: number;
    couponCode?: string;
  },
) {
  if (discountCents <= 0) return [];

  const coupon = await stripe.coupons.create(
    {
      amount_off: discountCents,
      currency: "ars",
      duration: "once",
      name: couponCode?.trim() ? `Descuento ${couponCode.trim().toUpperCase()}` : "Descuento de checkout",
      metadata: { orderId },
    },
    { idempotencyKey: `checkout-discount-${orderId}-${discountCents}` },
  );

  return [{ coupon: coupon.id }];
}

async function createOrder(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    input,
    userId,
    shippingMethodId,
    couponId,
    totals,
  }: {
    input: CheckoutInput;
    userId: string | null;
    shippingMethodId: string | null;
    couponId: string | null;
    totals: { subtotalCents: number; discountCents: number; shippingCents: number; totalCents: number };
  },
) {
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const insertPayload = {
    user_id: userId,
    order_number: orderNumber,
    status: "pending",
    payment_status: "pending",
    shipment_status: "pending",
    shipping_method_id: shippingMethodId,
    coupon_id: couponId,
    subtotal_cents: totals.subtotalCents,
    shipping_cents: totals.shippingCents,
    discount_cents: totals.discountCents,
    total_cents: totals.totalCents,
    customer_email: input.customer.email,
    customer_name: input.customer.name,
    shipping_address: input.shippingAddress,
    checkout_idempotency_key: input.idempotencyKey,
    notes: `checkout:${input.idempotencyKey}`,
  };

  let { data, error } = await admin.from("orders").insert(insertPayload).select("id").single();

  if (
    error &&
    (error.message.includes("shipping_method_id") || error.message.includes("coupon_id") || error.message.includes("checkout_idempotency_key"))
  ) {
    const {
      shipping_method_id: _shippingMethodId,
      coupon_id: _couponId,
      checkout_idempotency_key: _checkoutIdempotencyKey,
      ...legacyPayload
    } = insertPayload;
    const retry = await admin.from("orders").insert(legacyPayload).select("id").single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) throw new CheckoutError("No se pudo crear el pedido.", 500);
  return data as { id: string };
}

async function createOrderItems(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  orderId: string,
  lines: Array<{ variant: CheckoutVariant; quantity: number; totalCents: number }>,
) {
  const legacyPayload = lines.map((line) => ({
    order_id: orderId,
    product_id: line.variant.productId,
    variant_id: line.variant.id,
    product_name: line.variant.productName,
    variant_label: `${line.variant.sizeMl}ml`,
    quantity: line.quantity,
    unit_price_cents: line.variant.priceCents,
    total_cents: line.totalCents,
  }));

  let { error } = await admin.from("order_items").insert(legacyPayload);
  if (!error) return;

  const modernPayload = lines.map((line) => ({
    order_id: orderId,
    product_id: line.variant.productId,
    variant_id: line.variant.id,
    product_name: line.variant.productName,
    brand_name: line.variant.brandName,
    variant_size_ml: line.variant.sizeMl,
    sku: line.variant.sku,
    quantity: line.quantity,
    unit_price_cents: line.variant.priceCents,
    total_cents: line.totalCents,
  }));

  const retry = await admin.from("order_items").insert(modernPayload);
  if (retry.error) throw new CheckoutError("No se pudieron crear los items del pedido.", 500);
}

async function createPayment(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    orderId,
    provider,
    providerSessionId,
    totalCents,
  }: {
    orderId: string;
    provider: string;
    providerSessionId: string | null;
    totalCents: number;
  },
) {
  await admin.from("payments").insert({
    order_id: orderId,
    provider,
    provider_session_id: providerSessionId,
    status: "pending",
    amount_cents: totalCents,
    currency: "ars",
  });
}

async function markOrderCheckoutFailed(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, orderId: string) {
  await admin
    .from("orders")
    .update({ status: "cancelled", payment_status: "failed" })
    .eq("id", orderId)
    .eq("payment_status", "pending");

  await admin.from("payments").update({ status: "failed" }).eq("order_id", orderId).eq("status", "pending");
}

async function createInventoryReservationMovements(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  orderId: string,
  lines: Array<{ variant: CheckoutVariant; quantity: number }>,
) {
  const modernPayload = lines.map((line) => ({
    variant_id: line.variant.id,
    order_id: orderId,
    quantity: -line.quantity,
    reason: "sale",
    note: "Stock reservado al confirmar checkout",
  }));

  const { error } = await admin.from("inventory_movements").insert(modernPayload);
  if (!error) return;

  const legacyPayload = lines.map((line) => ({
    variant_id: line.variant.id,
    quantity: -line.quantity,
    reason: "sale",
    note: `Stock reservado para pedido ${orderId}`,
  }));
  await admin.from("inventory_movements").insert(legacyPayload);
}

async function incrementCouponUsage(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, couponId: string | null) {
  if (!couponId) return;
  const { data } = await admin.from("coupons").select("used_count").eq("id", couponId).maybeSingle();
  const usedCount = Number(data?.used_count ?? 0);
  await admin.from("coupons").update({ used_count: usedCount + 1 }).eq("id", couponId);
}

async function findExistingOrderByIdempotencyKey(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, input: CheckoutInput) {
  const byColumn = await admin
    .from("orders")
    .select("id,status,payment_status")
    .eq("customer_email", input.customer.email)
    .eq("checkout_idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (!byColumn.error && byColumn.data && canReuseExistingOrder(byColumn.data)) {
    return byColumn.data as { id: string };
  }

  const { data } = await admin
    .from("orders")
    .select("id,status,payment_status")
    .eq("customer_email", input.customer.email)
    .ilike("notes", `%checkout:${input.idempotencyKey}%`)
    .maybeSingle();

  return data && canReuseExistingOrder(data) ? (data as { id: string }) : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === "PGRST202" || /function .* does not exist|could not find the function/i.test(error.message ?? "");
}

function canReuseExistingOrder(order: { status?: string | null; payment_status?: string | null }) {
  return order.status !== "cancelled" && order.payment_status !== "failed" && order.payment_status !== "cancelled";
}

class CheckoutError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
