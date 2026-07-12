import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { env } from "@/lib/env";
import { sendOrderEmail } from "@/lib/notifications/email";
import { getMercadoPagoPayment } from "@/lib/payments/mercadopago";
import {
  getMercadoPagoOrderId,
  getMercadoPagoPaymentAction,
  getMercadoPagoPaymentId,
  getMercadoPagoWebhookDataId,
  parseMercadoPagoWebhookPayload,
} from "@/lib/payments/mercadopago-webhook";
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

type FailedPaymentStatus = "failed" | "cancelled";

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  const paymentClient = getMercadoPagoPayment();

  if (!admin || !paymentClient) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 500 });
  }

  if (process.env.NODE_ENV === "production" && !env.mercadoPagoWebhookSecret) {
    return NextResponse.json({ error: "Firma de webhook no configurada." }, { status: 500 });
  }

  const requestHeaders = await headers();
  const requestUrl = new URL(request.url);
  const rawBody = await request.text();
  const payload = parseMercadoPagoWebhookPayload(rawBody);
  const paymentId = getMercadoPagoPaymentId(payload, requestUrl);

  if (!paymentId) {
    return NextResponse.json({ error: "Pago no informado." }, { status: 400 });
  }

  if (env.mercadoPagoWebhookSecret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: requestHeaders.get("x-signature"),
        xRequestId: requestHeaders.get("x-request-id"),
        dataId: getMercadoPagoWebhookDataId(requestUrl),
        secret: env.mercadoPagoWebhookSecret,
        toleranceSeconds: 300,
      });
    } catch (caught) {
      if (caught instanceof InvalidWebhookSignatureError) {
        console.error("mercadopago_webhook_signature_error", caught.reason);
      }
      return NextResponse.json({ error: "Firma invalida." }, { status: 400 });
    }
  }

  let payment: PaymentResponse;
  try {
    payment = await paymentClient.get({ id: paymentId });
  } catch (caught) {
    console.error("mercadopago_payment_fetch_error", caught);
    return NextResponse.json({ error: "No se pudo consultar el pago." }, { status: 502 });
  }

  try {
    const action = getMercadoPagoPaymentAction(payment.status);
    if (action === "approved") {
      await handlePaymentApproved(admin, payment);
    } else if (action === "failed") {
      await handlePaymentFailed(admin, payment, `Mercado Pago ${payment.status}`);
    } else if (action === "review") {
      await markPaymentReview(admin, payment);
    }
  } catch (caught) {
    console.error("mercadopago_webhook_processing_error", caught);
    return NextResponse.json({ error: "No se pudo procesar el webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentApproved(admin: AdminClient, payment: PaymentResponse) {
  const orderId = getMercadoPagoOrderId(payment);
  if (!orderId) return;

  const { data: updatedOrders, error: orderError } = await admin
    .from("orders")
    .update({ status: "paid", payment_status: "paid", shipment_status: "preparing" })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .select("id");

  if (orderError) throw orderError;

  await markPaymentPaid(admin, orderId, payment);

  if (!updatedOrders?.length) return;

  await upsertPreparingShipment(admin, orderId);
  await sendPaidEmail(admin, orderId);
}

async function markPaymentReview(admin: AdminClient, payment: PaymentResponse) {
  const orderId = getMercadoPagoOrderId(payment);
  if (!orderId) return;

  await admin
    .from("orders")
    .update({ status: "payment_review", payment_status: "payment_review" })
    .eq("id", orderId)
    .eq("payment_status", "pending");

  await admin
    .from("payments")
    .update({
      status: "payment_review",
      provider_payment_intent_id: payment.id ? String(payment.id) : null,
      raw_payload: payment as unknown as Record<string, unknown>,
    })
    .eq("order_id", orderId);
}

async function handlePaymentFailed(admin: AdminClient, payment: PaymentResponse, note: string) {
  const orderId = getMercadoPagoOrderId(payment);
  if (!orderId) return;

  const status: FailedPaymentStatus = payment.status === "cancelled" ? "cancelled" : "failed";
  await markPaymentFailed(admin, orderId, payment, status);
  await releaseReservedStockForOrder(admin, orderId, note, status);
}

async function markPaymentPaid(admin: AdminClient, orderId: string, payment: PaymentResponse) {
  const payload = {
    status: "paid",
    provider_payment_intent_id: payment.id ? String(payment.id) : null,
    raw_payload: payment as unknown as Record<string, unknown>,
  };
  const { error } = await admin.from("payments").update(payload).eq("order_id", orderId);
  if (!error) return;

  const { provider_payment_intent_id: _providerPaymentIntentId, ...fallbackPayload } = payload;
  await admin.from("payments").update({ ...fallbackPayload, provider_payment_id: payload.provider_payment_intent_id }).eq("order_id", orderId);
}

async function markPaymentFailed(admin: AdminClient, orderId: string, payment: PaymentResponse, status: FailedPaymentStatus) {
  const payload = {
    status,
    provider_payment_intent_id: payment.id ? String(payment.id) : null,
    raw_payload: payment as unknown as Record<string, unknown>,
  };
  const { error } = await admin.from("payments").update(payload).eq("order_id", orderId);
  if (!error) return;

  const { provider_payment_intent_id: _providerPaymentIntentId, ...fallbackPayload } = payload;
  await admin.from("payments").update({ ...fallbackPayload, provider_payment_id: payload.provider_payment_intent_id }).eq("order_id", orderId);
}

async function upsertPreparingShipment(admin: AdminClient, orderId: string) {
  const { data, error } = await admin.from("shipments").update({ status: "preparing" }).eq("order_id", orderId).select("id");
  if (!error && data?.length) return;
  await admin.from("shipments").insert({ order_id: orderId, status: "preparing" });
}

async function sendPaidEmail(admin: AdminClient, orderId: string) {
  const { data: order } = await admin
    .from("orders")
    .select("id,customer_email,customer_name,order_number")
    .eq("id", orderId)
    .single();

  if (!order) return;

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

async function releaseReservedStockForOrder(admin: AdminClient, orderId: string, note: string, status: FailedPaymentStatus) {
  const { data: order } = await admin.from("orders").select("status,payment_status").eq("id", orderId).maybeSingle();
  if (!order || order.payment_status === "paid" || order.status === "cancelled") return;

  const { data: items, error } = await admin.from("order_items").select("variant_id,quantity").eq("order_id", orderId);
  if (error || !items) return;

  const { data: claimedOrders, error: claimError } = await admin
    .from("orders")
    .update({ status: "cancelled", payment_status: status })
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

  await admin.from("payments").update({ status }).eq("order_id", orderId);
  await insertReleaseMovements(admin, orderId, items as OrderItemStockRow[], note);
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
    console.error("mercadopago_webhook_stock_release_rpc_error", error);
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
