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
    return NextResponse.json({ error: "Firma invalida." }, { status: 400 });
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
      html: `<p>Hola ${customerName}, recibimos tu pago del pedido #${orderNumber}. Te avisamos cuando el envio este en camino.</p>`,
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
  await releaseReservedStockForOrder(admin, orderId, "Checkout expirado o pago asincronico fallido");
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

  for (const item of items as OrderItemStockRow[]) {
    if (!item.variant_id) continue;
    const released = await releaseLegacyVariantStock(admin, item.variant_id, item.quantity);
    if (!released) await releaseModernVariantStock(admin, item.variant_id, item.quantity);
  }

  await admin.from("orders").update({ status: "cancelled", payment_status: "failed" }).eq("id", orderId);
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
  const { data } = await admin.from("decant_variants").select("stock_on_hand").eq("id", variantId).maybeSingle();
  if (!data) return false;
  await admin
    .from("decant_variants")
    .update({ stock_on_hand: Number(data.stock_on_hand ?? 0) + quantity })
    .eq("id", variantId);
  return true;
}

async function releaseModernVariantStock(admin: AdminClient, variantId: string, quantity: number) {
  const { data } = await admin.from("product_variants").select("stock").eq("id", variantId).maybeSingle();
  if (!data) return false;
  await admin
    .from("product_variants")
    .update({ stock: Number(data.stock ?? 0) + quantity })
    .eq("id", variantId);
  return true;
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
