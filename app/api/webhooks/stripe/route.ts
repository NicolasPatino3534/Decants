import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { sendOrderEmail } from "@/lib/notifications/email";
import { getStripe } from "@/lib/payments/stripe";
import { escapeHtml } from "@/lib/security/sanitize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type OrderItemStockRow = {
  variant_id: string | null;
  quantity: number;
};

type StockTableConfig = {
  table: "decant_variants" | "product_variants";
  stockColumn: "stock_on_hand" | "stock";
  rpcName: "increment_decant_variant_stock" | "increment_variant_stock";
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const admin = createSupabaseAdminClient();

  if (!stripe || !admin || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma faltante." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await handleCheckoutPaid(admin, event);
    }

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      await handleCheckoutFailed(admin, event);
    }

    if (event.type === "payment_intent.payment_failed") {
      await handlePaymentIntentFailed(admin, event);
    }
  } catch (caught) {
    console.error("stripe_webhook_processing_error", caught);
    return NextResponse.json({ error: "No se pudo procesar el webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutPaid(admin: AdminClient, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const { data: updatedOrders, error: orderError } = await admin
    .from("orders")
    .update({ status: "paid", payment_status: "paid", shipment_status: "preparing" })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("id");

  if (orderError) throw orderError;

  await markPaymentPaid(admin, orderId, typeof session.payment_intent === "string" ? session.payment_intent : null, event);

  if (!updatedOrders?.length) return;

  await upsertPreparingShipment(admin, orderId);

  const { data: order } = await admin
    .from("orders")
    .select("id,customer_email,customer_name,order_number")
    .eq("id", orderId)
    .single();

  if (order) {
    const customerName = escapeHtml(order.customer_name ?? "");
    const orderNumber = escapeHtml(order.order_number ?? "");
    await sendOrderEmail({
      orderId,
      to: order.customer_email,
      subject: `Pedido #${order.order_number} confirmado`,
      template: "order_paid",
      html: `<p>Hola ${customerName}, recibimos tu pago del pedido #${orderNumber}. Te avisamos cuando el envío esté en camino.</p>`,
    });
  }
}

async function upsertPreparingShipment(admin: AdminClient, orderId: string) {
  const { data, error } = await admin.from("shipments").update({ status: "preparing" }).eq("order_id", orderId).select("id");
  if (!error && data?.length) return;
  await admin.from("shipments").insert({ order_id: orderId, status: "preparing" });
}

async function handleCheckoutFailed(admin: AdminClient, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  await releaseReservedStockForOrder(admin, orderId, "Checkout expirado o pago asincrónico fallido");
}

async function handlePaymentIntentFailed(admin: AdminClient, event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { data: payment } = await admin
    .from("payments")
    .select("order_id")
    .eq("provider_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  await markPaymentFailedByIntent(admin, paymentIntent.id, event);

  if (payment?.order_id) {
    await releaseReservedStockForOrder(admin, payment.order_id, "PaymentIntent fallido");
  }
}

async function releaseReservedStockForOrder(admin: AdminClient, orderId: string, note: string) {
  const { data: order } = await admin.from("orders").select("status,payment_status").eq("id", orderId).maybeSingle();
  if (!order || order.payment_status === "paid" || order.status === "cancelled") return;

  const { data: items, error } = await admin.from("order_items").select("variant_id,quantity").eq("order_id", orderId);
  if (error || !items) return;

  const { data: claimedOrders, error: claimError } = await admin
    .from("orders")
    .update({ status: "cancelled", payment_status: "failed" })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .neq("status", "cancelled")
    .select("id");

  if (claimError) throw claimError;
  if (!claimedOrders?.length) return;

  for (const item of items as OrderItemStockRow[]) {
    if (!item.variant_id) continue;
    const released = await releaseLegacyVariantStock(admin, item.variant_id, item.quantity);
    if (!released) await releaseModernVariantStock(admin, item.variant_id, item.quantity);
  }

  await admin.from("payments").update({ status: "failed" }).eq("order_id", orderId);
  await insertReleaseMovements(admin, orderId, items as OrderItemStockRow[], note);
}

async function markPaymentPaid(admin: AdminClient, orderId: string, paymentIntentId: string | null, event: Stripe.Event) {
  const payload = {
    status: "paid",
    provider_payment_intent_id: paymentIntentId,
    raw_payload: event as unknown as Record<string, unknown>,
  };
  const { error } = await admin.from("payments").update(payload).eq("order_id", orderId);
  if (!error) return;

  const { provider_payment_intent_id: _providerPaymentIntentId, ...fallbackPayload } = payload;
  await admin
    .from("payments")
    .update({ ...fallbackPayload, provider_payment_id: paymentIntentId })
    .eq("order_id", orderId);
}

async function markPaymentFailedByIntent(admin: AdminClient, paymentIntentId: string, event: Stripe.Event) {
  const payload = { status: "failed", raw_payload: event as unknown as Record<string, unknown> };
  const { error } = await admin.from("payments").update(payload).eq("provider_payment_intent_id", paymentIntentId);
  if (!error) return;
  await admin.from("payments").update(payload).eq("provider_payment_id", paymentIntentId);
}

async function releaseLegacyVariantStock(admin: AdminClient, variantId: string, quantity: number) {
  return incrementVariantStock(admin, variantId, quantity, {
    table: "decant_variants",
    stockColumn: "stock_on_hand",
    rpcName: "increment_decant_variant_stock",
  });
}

async function releaseModernVariantStock(admin: AdminClient, variantId: string, quantity: number) {
  return incrementVariantStock(admin, variantId, quantity, {
    table: "product_variants",
    stockColumn: "stock",
    rpcName: "increment_variant_stock",
  });
}

async function incrementVariantStock(admin: AdminClient, variantId: string, quantity: number, config: StockTableConfig) {
  const { data, error } = await admin.rpc(config.rpcName, { p_variant_id: variantId, p_quantity: quantity });

  if (!error && data !== false) return true;
  if (error && !isMissingRpcError(error)) {
    console.error("stripe_webhook_stock_release_rpc_error", error);
    return false;
  }

  const { data: current, error: selectError } = await admin
    .from(config.table)
    .select(config.stockColumn)
    .eq("id", variantId)
    .maybeSingle();

  if (selectError || !current) return false;

  const currentStock = Number((current as Record<string, unknown>)[config.stockColumn] ?? 0);
  const { error: updateError } = await admin
    .from(config.table)
    .update({ [config.stockColumn]: currentStock + quantity })
    .eq("id", variantId);

  return !updateError;
}

async function insertReleaseMovements(admin: AdminClient, orderId: string, items: OrderItemStockRow[], note: string) {
  const modernPayload = items
    .filter((item) => item.variant_id)
    .map((item) => ({
      variant_id: item.variant_id,
      order_id: orderId,
      quantity: item.quantity,
      reason: "return",
      note,
    }));

  const { error } = await admin.from("inventory_movements").insert(modernPayload);
  if (!error) return;

  const legacyPayload = items
    .filter((item) => item.variant_id)
    .map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      reason: "return",
      note: `${note}: ${orderId}`,
    }));
  await admin.from("inventory_movements").insert(legacyPayload);
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === "PGRST202" || /function .* does not exist|could not find the function/i.test(error.message ?? "");
}
