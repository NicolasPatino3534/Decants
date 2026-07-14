import { NextResponse } from "next/server";
import { calculateCartTotals } from "@/lib/cart/pricing";
import { checkoutSchema, type CheckoutInput } from "@/lib/checkout/schema";
import {
  CheckoutShippingMethodError,
  resolveCouponDiscount,
  resolveShippingMethod,
} from "@/lib/checkout/options";
import {
  buildCheckoutLines,
  CheckoutStockError,
  normalizeCheckoutItems,
  selectCheckoutVariantsForItems,
} from "@/lib/checkout/stock";
import { env, getPaymentConfigurationError } from "@/lib/env";
import { getMercadoPagoPreference } from "@/lib/payments/mercadopago";
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
  products: {
    id: string;
    name: string;
    slug: string;
    status: string;
    brands?: { name: string } | null;
  } | null;
};

type ProductVariantRow = {
  id: string;
  size_ml: number | string;
  sku: string;
  price_cents: number;
  stock: number;
  active: boolean;
  products: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    perfume_brands?: { name: string } | null;
  } | null;
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

const PAYMENT_SESSION_TTL_MS = 35 * 60 * 1000;
const RESERVATION_RELEASE_GRACE_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 },
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Datos de checkout inválidos.",
      },
      { status: 400 },
    );
  }

  const configurationIssue = getPaymentConfigurationError();
  if (configurationIssue) {
    console.error("checkout_payment_configuration_error", {
      provider: env.paymentProvider,
    });
    return NextResponse.json(
      { error: "El sistema de pagos no está disponible temporalmente." },
      { status: 503 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin no está configurado para crear pedidos." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    return NextResponse.json(
      { error: "Necesitás iniciar sesión para comprar." },
      { status: 401 },
    );
  }

  const { data: profile } = supabase
    ? await supabase
        .from("profiles")
        .select("email,full_name,phone")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const checkoutInput: CheckoutInput = {
    ...parsed.data,
    customer: {
      ...parsed.data.customer,
      email: (
        profile?.email ??
        user.email ??
        parsed.data.customer.email
      ).toLowerCase(),
      name: parsed.data.customer.name || profile?.full_name || "",
      phone: parsed.data.customer.phone || profile?.phone || "",
    },
  };

  const existing = await findExistingOrderByIdempotencyKey(
    admin,
    checkoutInput,
  );
  if (existing) {
    return NextResponse.json({
      url: `${env.siteUrl}/checkout/success?order=${existing.id}`,
      orderId: existing.id,
      duplicate: true,
    });
  }

  const items = normalizeCheckoutItems(checkoutInput.items);
  const variants = await fetchCheckoutVariants(
    admin,
    items.map((item) => item.variantId),
  );
  let lines: Array<{
    variant: CheckoutVariant;
    quantity: number;
    totalCents: number;
  }>;
  try {
    lines = buildCheckoutLines(items, variants);
  } catch (caught) {
    if (caught instanceof CheckoutStockError) {
      logCheckoutStockValidationFailure(caught, items, variants);
      return NextResponse.json(
        { error: caught.message },
        { status: caught.status },
      );
    }
    console.error("checkout_stock_validation_error", caught);
    return NextResponse.json(
      { error: "No se pudo validar el stock." },
      { status: 500 },
    );
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  let shippingMethod;
  try {
    shippingMethod = await resolveShippingMethod(
      admin,
      checkoutInput.shippingMethodId,
    );
  } catch (caught) {
    if (caught instanceof CheckoutShippingMethodError) {
      return NextResponse.json(
        { error: caught.message },
        { status: caught.status },
      );
    }
    console.error("checkout_shipping_method_resolution_error");
    return NextResponse.json(
      { error: "No se pudo validar el método de envío." },
      { status: 500 },
    );
  }

  const coupon = await resolveCouponDiscount({
    supabase: admin,
    couponCode: checkoutInput.couponCode,
    subtotalCents,
  });

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

  const paymentExpiresAt = new Date(Date.now() + PAYMENT_SESSION_TTL_MS);
  const reservationExpiresAt = new Date(
    paymentExpiresAt.getTime() + RESERVATION_RELEASE_GRACE_MS,
  );
  const reservationGuard = await acquireCheckoutReservationGuard(admin, {
    userId: user.id,
    idempotencyKey: checkoutInput.idempotencyKey,
    expiresAt: reservationExpiresAt,
  });
  if (!reservationGuard.ok) {
    return NextResponse.json(
      { error: reservationGuard.error },
      { status: reservationGuard.status },
    );
  }

  const couponReservation = await reserveCheckoutCoupon(admin, {
    couponId: coupon.couponId,
    userId: user.id,
    idempotencyKey: checkoutInput.idempotencyKey,
    expiresAt: reservationExpiresAt,
  });
  if (!couponReservation.ok) {
    await releaseCheckoutSecurityGuards(
      admin,
      user.id,
      checkoutInput.idempotencyKey,
    );
    return NextResponse.json(
      { error: couponReservation.error },
      { status: couponReservation.status },
    );
  }

  const reservedStock = await reserveStock(admin, lines);
  if (!reservedStock.ok) {
    await releaseCheckoutSecurityGuards(
      admin,
      user.id,
      checkoutInput.idempotencyKey,
    );
    return NextResponse.json({ error: reservedStock.error }, { status: 409 });
  }

  let orderIdForRollback: string | null = null;
  let orderItemsPersisted = false;

  try {
    const order = await createOrder(admin, {
      input: checkoutInput,
      userId: user.id,
      shippingMethodId: shippingMethod.id,
      couponId: coupon.couponId,
      totals,
      reservationExpiresAt,
    });
    orderIdForRollback = order.id;

    await createOrderItems(admin, order.id, lines);
    orderItemsPersisted = true;
    await createInventoryReservationMovements(admin, order.id, lines);

    if (env.paymentProvider === "mercadopago") {
      const preferenceClient = getMercadoPagoPreference();
      if (!preferenceClient) {
        throw new CheckoutError(
          "Mercado Pago no esta configurado. Revisa MERCADOPAGO_ACCESS_TOKEN.",
          503,
        );
      }
      const mercadoPagoSiteUrl = getMercadoPagoSiteUrl();

      let preference: Awaited<ReturnType<typeof preferenceClient.create>>;
      try {
        preference = await preferenceClient.create({
          body: {
            items: [
              {
                id: order.id,
                title: `Pedido Decants CBA #${order.id.slice(0, 8)}`,
                description: `${lines.length} producto(s), envío incluido`,
                quantity: 1,
                unit_price: centsToMoney(totals.totalCents),
                currency_id: "ARS",
              },
            ],
            payer: {
              name: checkoutInput.customer.name,
              email: checkoutInput.customer.email,
              phone: { number: checkoutInput.customer.phone },
            },
            back_urls: {
              success: `${mercadoPagoSiteUrl}/checkout/success?order=${order.id}`,
              pending: `${mercadoPagoSiteUrl}/checkout/success?order=${order.id}&pending=1`,
              failure: `${mercadoPagoSiteUrl}/checkout?payment=failed`,
            },
            auto_return: "approved",
            external_reference: order.id,
            metadata: {
              orderId: order.id,
              idempotencyKey: checkoutInput.idempotencyKey,
            },
            notification_url: `${mercadoPagoSiteUrl}/api/webhooks/mercadopago`,
            statement_descriptor: "DECANTS CBA",
            expires: true,
            expiration_date_to: paymentExpiresAt.toISOString(),
          },
          requestOptions: {
            idempotencyKey: `mercadopago-preference-${order.id}`,
          },
        });
      } catch (caught) {
        console.error("mercadopago_preference_error", caught);
        throw new CheckoutError(
          "Mercado Pago no esta disponible. Intenta nuevamente en unos minutos.",
          502,
        );
      }

      const checkoutUrl =
        preference.init_point ?? preference.sandbox_init_point;
      if (!preference.id || !checkoutUrl) {
        throw new CheckoutError(
          "Mercado Pago no devolvio una URL de checkout.",
          502,
        );
      }

      await createPayment(admin, {
        orderId: order.id,
        provider: "mercadopago",
        providerSessionId: preference.id,
        totalCents: totals.totalCents,
      });

      return NextResponse.json({
        url: checkoutUrl,
        orderId: order.id,
        payment: "mercadopago",
      });
    }

    if (env.paymentProvider === "manual") {
      if (process.env.NODE_ENV === "production") {
        throw new CheckoutError(
          "El pago manual no está habilitado en producción.",
          503,
        );
      }
      await createPayment(admin, {
        orderId: order.id,
        provider: "manual",
        providerSessionId: null,
        totalCents: totals.totalCents,
      });
      return NextResponse.json({
        url: `${env.siteUrl}/checkout/success?order=${order.id}&pending=1`,
        orderId: order.id,
        payment: "manual",
      });
    }

    if (env.paymentProvider !== "stripe") {
      throw new CheckoutError(
        "PAYMENT_PROVIDER no tiene un valor válido.",
        503,
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new CheckoutError(
        "Stripe no está configurado. Revisá STRIPE_SECRET_KEY.",
        503,
      );
    }

    let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
    try {
      const discounts = await createStripeDiscounts(stripe, {
        orderId: order.id,
        discountCents: totals.discountCents,
        couponCode: checkoutInput.couponCode,
      });

      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: checkoutInput.customer.email,
          success_url: `${env.siteUrl}/checkout/success?order=${order.id}`,
          cancel_url: `${env.siteUrl}/checkout`,
          metadata: {
            orderId: order.id,
            idempotencyKey: checkoutInput.idempotencyKey,
          },
          expires_at: Math.floor(paymentExpiresAt.getTime() / 1000),
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
      throw new CheckoutError(
        "El proveedor de pagos no está disponible. Intentá nuevamente en unos minutos.",
        502,
      );
    }

    if (!session.url) {
      throw new CheckoutError("Stripe no devolvió una URL de checkout.", 502);
    }

    await createPayment(admin, {
      orderId: order.id,
      provider: "stripe",
      providerSessionId: session.id,
      totalCents: totals.totalCents,
    });

    return NextResponse.json({
      url: session.url,
      orderId: order.id,
      payment: "stripe",
    });
  } catch (caught) {
    if (orderIdForRollback && orderItemsPersisted) {
      const { error: releaseError } = await admin.rpc(
        "release_order_stock_reservation",
        {
          p_order_id: orderIdForRollback,
          p_payment_status: "failed",
          p_note: "Checkout interrumpido antes de redirigir al proveedor",
        },
      );
      if (releaseError) {
        console.error("checkout_transactional_stock_release_error", {
          orderId: orderIdForRollback,
          code: releaseError.code,
        });
      }
    } else {
      await releaseStock(admin, reservedStock.reserved);
      if (orderIdForRollback)
        await markOrderCheckoutFailed(admin, orderIdForRollback);
    }
    await releaseCheckoutSecurityGuards(
      admin,
      user.id,
      checkoutInput.idempotencyKey,
    );
    if (caught instanceof CheckoutDuplicateError) {
      return NextResponse.json(
        {
          error:
            "Este checkout ya se está procesando. Revisá tus pedidos antes de reintentar.",
        },
        { status: 409 },
      );
    }
    if (caught instanceof CheckoutError) {
      return NextResponse.json(
        { error: caught.message },
        { status: caught.status },
      );
    }
    console.error("checkout_create_order_error", caught);
    return NextResponse.json(
      { error: "No se pudo crear el pedido." },
      { status: 500 },
    );
  }
}

function logCheckoutStockValidationFailure(
  error: CheckoutStockError,
  items: Array<{ variantId: string; quantity: number }>,
  variants: CheckoutVariant[],
) {
  const resolvedVariantIds = new Set(variants.map((variant) => variant.id));
  console.warn("checkout_stock_validation_failed", {
    itemCount: items.length,
    resolvedVariantCount: variants.length,
    missingVariantCount: items.filter(
      (item) => !resolvedVariantIds.has(item.variantId),
    ).length,
    message: error.message,
  });
}

async function fetchCheckoutVariants(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  variantIds: string[],
): Promise<CheckoutVariant[]> {
  if (variantIds.length === 0) return [];

  const [legacy, modern] = await Promise.all([
    admin
      .from("decant_variants")
      .select(
        "id,size_ml,sku,price_cents,stock_on_hand,is_active,products!inner ( id, name, slug, status, brands ( name ) )",
      )
      .in("id", variantIds)
      .eq("is_active", true)
      .eq("products.status", "active"),
    admin
      .from("product_variants")
      .select(
        "id,size_ml,sku,price_cents,stock,active,products!inner ( id, name, slug, active, perfume_brands ( name ) )",
      )
      .in("id", variantIds)
      .eq("active", true)
      .eq("products.active", true),
  ]);

  const legacyVariants =
    !legacy.error && legacy.data
      ? (legacy.data as unknown as LegacyVariantRow[]).map((variant) => ({
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
        }))
      : [];

  const modernVariants =
    !modern.error && modern.data
      ? (modern.data as unknown as ProductVariantRow[]).map((variant) => ({
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
        }))
      : [];

  return selectCheckoutVariantsForItems(
    variantIds.map((variantId) => ({ variantId, quantity: 1 })),
    [...legacyVariants, ...modernVariants],
  );
}

async function acquireCheckoutReservationGuard(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    userId,
    idempotencyKey,
    expiresAt,
  }: { userId: string; idempotencyKey: string; expiresAt: Date },
) {
  const { data, error } = await admin.rpc(
    "acquire_checkout_reservation_guard",
    {
      p_user_id: userId,
      p_idempotency_key: idempotencyKey,
      p_expires_at: expiresAt.toISOString(),
      p_max_open: 3,
    },
  );

  if (error) {
    console.error("checkout_reservation_guard_error", { code: error.code });
    return {
      ok: false as const,
      status: 503,
      error: "La reserva de checkout no est\u00e1 disponible temporalmente.",
    };
  }
  if (data !== true) {
    return {
      ok: false as const,
      status: 429,
      error:
        "Alcanzaste el l\u00edmite de checkouts pendientes. Finaliz\u00e1 o esper\u00e1 que venzan antes de reintentar.",
    };
  }
  return { ok: true as const };
}

async function reserveCheckoutCoupon(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  {
    couponId,
    userId,
    idempotencyKey,
    expiresAt,
  }: {
    couponId: string | null;
    userId: string;
    idempotencyKey: string;
    expiresAt: Date;
  },
) {
  if (!couponId) return { ok: true as const };

  const { data, error } = await admin.rpc("reserve_checkout_coupon", {
    p_coupon_id: couponId,
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) {
    console.error("checkout_coupon_reservation_error", { code: error.code });
    return {
      ok: false as const,
      status: 503,
      error: "No se pudo reservar el cup\u00f3n temporalmente.",
    };
  }
  if (data !== true) {
    return {
      ok: false as const,
      status: 409,
      error: "El cup\u00f3n alcanz\u00f3 su l\u00edmite de usos.",
    };
  }
  return { ok: true as const };
}

async function releaseCheckoutSecurityGuards(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  idempotencyKey: string,
) {
  const { error } = await admin.rpc("release_checkout_security_guards", {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    console.error("checkout_security_guard_release_error", {
      code: error.code,
    });
  }
}

async function reserveStock(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  lines: Array<{ variant: CheckoutVariant; quantity: number }>,
) {
  const { data, error } = await admin.rpc("reserve_checkout_stock_mirrored", {
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
          previousStock: Number(
            reserved?.previous_stock ?? line.variant.stockOnHand,
          ),
          nextStock: Number(
            reserved?.next_stock ?? line.variant.stockOnHand - line.quantity,
          ),
        };
      }),
    };
  }

  if (error && !isMissingRpcError(error)) {
    console.warn("checkout_atomic_stock_reservation_rejected", {
      code: error.code,
    });
    return {
      ok: false as const,
      error: "El stock cambió. Revisá el carrito antes de continuar.",
      reserved: [],
    };
  }

  if (process.env.NODE_ENV === "production") {
    console.error("checkout_atomic_stock_reservation_unavailable", {
      code: error?.code,
    });
    return {
      ok: false as const,
      error: "La reserva de stock no está disponible temporalmente.",
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
      return {
        ok: false as const,
        error: `El stock de ${line.variant.productName} cambió. Revisá el carrito.`,
        reserved: [],
      };
    }

    await syncMirroredVariantStock(admin, line.variant, nextStock);
    reserved.push({
      variant: line.variant,
      quantity: line.quantity,
      previousStock: line.variant.stockOnHand,
      nextStock,
    });
  }

  return { ok: true as const, reserved };
}

async function releaseStock(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  reserved: ReservedStock[],
) {
  if (reserved.length === 0) return;
  const { error } = await admin.rpc("release_checkout_stock_mirrored", {
    p_items: reserved.map((item) => ({
      variant_id: item.variant.id,
      quantity: item.quantity,
    })),
  });
  if (!error) return;

  if (process.env.NODE_ENV === "production") {
    console.error("checkout_atomic_stock_rollback_error", {
      code: error.code,
    });
    return;
  }

  await Promise.all(
    reserved.flatMap((item) => [
      incrementVariantStock(
        admin,
        { ...item.variant, table: "product_variants", stockColumn: "stock" },
        item.quantity,
      ),
      incrementVariantStock(
        admin,
        {
          ...item.variant,
          table: "decant_variants",
          stockColumn: "stock_on_hand",
        },
        item.quantity,
      ),
    ]),
  );
}

async function syncMirroredVariantStock(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  variant: CheckoutVariant,
  nextStock: number,
) {
  const table =
    variant.table === "product_variants"
      ? "decant_variants"
      : "product_variants";
  const stockColumn =
    variant.table === "product_variants" ? "stock_on_hand" : "stock";
  const { error } = await admin
    .from(table)
    .update({ [stockColumn]: nextStock })
    .eq("id", variant.id);
  if (error && !/relation .* does not exist/i.test(error.message)) {
    console.error("checkout_stock_mirror_error", {
      variantId: variant.id,
      table,
      code: error.code,
    });
  }
}

async function incrementVariantStock(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  variant: CheckoutVariant,
  quantity: number,
) {
  const rpcName =
    variant.table === "product_variants"
      ? "increment_variant_stock"
      : "increment_decant_variant_stock";
  const { data, error } = await admin.rpc(rpcName, {
    p_variant_id: variant.id,
    p_quantity: quantity,
  });

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

  const currentStock = Number(
    (current as Record<string, unknown>)[variant.stockColumn] ?? 0,
  );
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
      name: couponCode?.trim()
        ? `Descuento ${couponCode.trim().toUpperCase()}`
        : "Descuento de checkout",
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
    reservationExpiresAt,
  }: {
    input: CheckoutInput;
    userId: string | null;
    shippingMethodId: string | null;
    couponId: string | null;
    totals: {
      subtotalCents: number;
      discountCents: number;
      shippingCents: number;
      totalCents: number;
    };
    reservationExpiresAt: Date;
  },
) {
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const insertPayload = {
    user_id: userId,
    order_number: orderNumber,
    status: "pending_payment",
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
    shipping_address: {
      ...input.shippingAddress,
      fullName: input.customer.name,
      phone: input.customer.phone,
    },
    checkout_idempotency_key: input.idempotencyKey,
    reservation_expires_at: reservationExpiresAt.toISOString(),
    notes: `checkout:${input.idempotencyKey}`,
  };

  const { data, error } = await admin
    .from("orders")
    .insert(insertPayload)
    .select("id")
    .single();

  if (
    error?.code === "23505" &&
    /checkout_idempotency_key|idempotency/i.test(error.message)
  ) {
    throw new CheckoutDuplicateError();
  }

  if (error || !data)
    throw new CheckoutError("No se pudo crear el pedido.", 500);
  return data as { id: string };
}

async function createOrderItems(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  orderId: string,
  lines: Array<{
    variant: CheckoutVariant;
    quantity: number;
    totalCents: number;
  }>,
) {
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

  let { error } = await admin.from("order_items").insert(modernPayload);
  if (!error) return;

  const modernError = error;
  const hybridPayload = lines.map((line) => ({
    order_id: orderId,
    product_id: line.variant.productId,
    variant_id: line.variant.id,
    product_name: line.variant.productName,
    variant_label: `${line.variant.sizeMl}ml`,
    brand_name: line.variant.brandName,
    variant_size_ml: line.variant.sizeMl,
    sku: line.variant.sku,
    quantity: line.quantity,
    unit_price_cents: line.variant.priceCents,
    total_cents: line.totalCents,
  }));

  const hybridRetry = await admin.from("order_items").insert(hybridPayload);
  if (!hybridRetry.error) return;

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

  const legacyRetry = await admin.from("order_items").insert(legacyPayload);
  if (!legacyRetry.error) return;

  console.error("checkout_order_items_insert_error", {
    modern: serializePostgrestError(modernError),
    hybrid: serializePostgrestError(hybridRetry.error),
    legacy: serializePostgrestError(legacyRetry.error),
    lineCount: lines.length,
    variantTables: Array.from(new Set(lines.map((line) => line.variant.table))),
  });
  throw new CheckoutError("No se pudieron crear los items del pedido.", 500);
}

function serializePostgrestError(error: {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}) {
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  };
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
  const { error } = await admin.from("payments").insert({
    order_id: orderId,
    provider,
    provider_session_id: providerSessionId,
    status: "pending",
    amount_cents: totalCents,
    currency: "ars",
  });
  if (error)
    throw new CheckoutError("No se pudo registrar el pago del pedido.", 500);
}

async function markOrderCheckoutFailed(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  orderId: string,
) {
  await admin
    .from("orders")
    .update({ status: "cancelled", payment_status: "failed" })
    .eq("id", orderId)
    .eq("payment_status", "pending");

  await admin
    .from("payments")
    .update({ status: "failed" })
    .eq("order_id", orderId)
    .eq("status", "pending");
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

  const { error } = await admin
    .from("inventory_movements")
    .insert(modernPayload);
  if (!error) return;

  const legacyPayload = lines.map((line) => ({
    variant_id: line.variant.id,
    quantity: -line.quantity,
    reason: "sale",
    note: `Stock reservado para pedido ${orderId}`,
  }));
  await admin.from("inventory_movements").insert(legacyPayload);
}

async function findExistingOrderByIdempotencyKey(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  input: CheckoutInput,
) {
  const byColumn = await admin
    .from("orders")
    .select("id,status,payment_status")
    .eq("customer_email", input.customer.email)
    .eq("checkout_idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (
    !byColumn.error &&
    byColumn.data &&
    canReuseExistingOrder(byColumn.data)
  ) {
    return byColumn.data as { id: string };
  }

  const { data } = await admin
    .from("orders")
    .select("id,status,payment_status")
    .eq("customer_email", input.customer.email)
    .eq("notes", `checkout:${input.idempotencyKey}`)
    .maybeSingle();

  return data && canReuseExistingOrder(data) ? (data as { id: string }) : null;
}

function centsToMoney(cents: number) {
  return Math.round(cents) / 100;
}

function getMercadoPagoSiteUrl() {
  const siteUrl = env.siteUrl.replace(/\/$/, "");
  if (
    process.env.NODE_ENV === "production" &&
    !siteUrl.startsWith("https://")
  ) {
    throw new CheckoutError(
      "NEXT_PUBLIC_SITE_URL debe ser una URL HTTPS publica para usar Mercado Pago en produccion.",
      503,
    );
  }
  return siteUrl;
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST202" ||
    /function .* does not exist|could not find the function/i.test(
      error.message ?? "",
    )
  );
}

function canReuseExistingOrder(order: {
  status?: string | null;
  payment_status?: string | null;
}) {
  return (
    order.status !== "cancelled" &&
    order.payment_status !== "failed" &&
    order.payment_status !== "cancelled"
  );
}

class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

class CheckoutDuplicateError extends Error {}
