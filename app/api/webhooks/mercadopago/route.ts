import { NextResponse } from "next/server";
import { sendOrderEmail } from "@/lib/notifications/email";
import { getMercadoPagoPayment, validateMercadoPagoWebhookSignature } from "@/lib/payments/mercado-pago";
import { escapeHtml } from "@/lib/security/sanitize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type MercadoPagoNotification = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

type OrderForPayment = {
  id: string;
  order_number: string | null;
  customer_email: string;
  customer_name: string | null;
  status: string | null;
  payment_status: string | null;
  total_cents: number | null;
};

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
  const admin = createSupabaseAdminClient();
  const paymentClient = getMercadoPagoPayment();

  if (!admin || !paymentClient) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 500 });
  }

  const url = new URL(request.url);
  let payload: MercadoPagoNotification;

  try {
    payload = (await request.json()) as MercadoPagoNotification;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const dataId = url.searchParams.get("data.id") ?? stringifyId(payload.data?.id);
  const signatureOk = validateMercadoPagoWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });

  if (!signatureOk) {
    return NextResponse.json({ error: "Firma invalida." }, { status: 401 });
  }

  const eventType = payload.type ?? url.searchParams.get("type");
  if (eventType !== "payment") {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (!dataId) {
    return NextResponse.json({ error: "Pago sin identificador." }, { status: 400 });
  }

  try {
    const payment = await paymentClient.get({ id: dataId });
    const orderId = payment.external_reference ?? stringifyMetadata(payment.metadata, "order_id");
    if (!orderId) return NextResponse.json({ received: true, ignored: true });

    const { data: order, error } = await admin
      .from("orders")
      .select("id,order_number,customer_email,customer_name,status,payment_status,total_cents")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;
    if (!order) return NextResponse.json({ received: true, ignored: true });

    const amountMatches = centsFromAmount(payment.transaction_amount) === Number(order.total_cents ?? 0);
    if (payment.status === "approved" && amountMatches) {
      await handlePaymentApproved(admin, order as OrderForPayment, payment.id ? String(payment.id) : dataId, payment);
    } else if (payment.status === "approved" && !amountMatches) {
      await markPaymentReview(admin, order.id, payment.id ? String(payment.id) : dataId, payment);
    } else if (isReviewStatus(payment.status)) {
      await markPaymentReview(admin, order.id, payment.id ? String(payment.id) : dataId, payment);
    } else if (isFailedStatus(payment.status)) {
      await releaseReservedStockForOrder(admin, order.id, payment.status ?? "Pago rechazado", payment);
    }
  } catch (caught) {
    console.error("mercadopago_webhook_processing_error", caught);
    return NextResponse.json({ error: "No se pudo procesar el webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentApproved(admin: AdminClient, order: OrderForPayment, paymentId: string, rawPayload: unknown) {
  const { data: updatedOrders, error: orderError } = await admin
    .from("orders")
    .update({ status: "paid", payment_status: "paid", shipment_status: "preparing" })
    .eq("id", order.id)
    .neq("payment_status", "paid")
    .select("id");

  if (orderError) throw orderError;

  await markPayment(admin, order.id, {
    providerPaymentId: paymentId,
    status: "paid",
    rawPayload,
  });

  if (!updatedOrders?.length) return;

  await upsertPreparingShipment(admin, order.id);

  const customerName = escapeHtml(order.customer_name ?? "");
  const orderNumber = escapeHtml(order.order_number ?? "");
  await sendOrderEmail({
    orderId: order.id,
    to: order.customer_email,
    subject: `Pedido #${order.order_number} confirmado`,
    template: "order_paid",
    html: `<p>Hola ${customerName}, recibimos tu pago del pedido #${orderNumber}. Te avisamos cuando el envio este en camino.</p>`,
  });
}

async function markPaymentReview(admin: AdminClient, orderId: string, paymentId: string, rawPayload: unknown) {
  await admin
    .from("orders")
    .update({ status: "payment_review", payment_status: "payment_review" })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .neq("status", "cancelled");

  await markPayment(admin, orderId, {
    providerPaymentId: paymentId,
    status: "payment_review",
    rawPayload,
  });
}

async function markPayment(
  admin: AdminClient,
  orderId: string,
  {
    providerPaymentId,
    status,
    rawPayload,
  }: {
    providerPaymentId: string;
    status: "paid" | "payment_review" | "failed" | "rejected" | "cancelled" | "refunded";
    rawPayload: unknown;
  },
) {
  const payload = {
    status,
    provider_payment_id: providerPaymentId,
    raw_payload: rawPayload as Record<string, unknown>,
  };

  await admin.from("payments").update(payload).eq("order_id", orderId).eq("provider", "mercadopago");
}

async function upsertPreparingShipment(admin: AdminClient, orderId: string) {
  const { data, error } = await admin.from("shipments").update({ status: "preparing" }).eq("order_id", orderId).select("id");
  if (!error && data?.length) return;
  await admin.from("shipments").insert({ order_id: orderId, status: "preparing" });
}

async function releaseReservedStockForOrder(admin: AdminClient, orderId: string, status: string, rawPayload: unknown) {
  const { data: order } = await admin.from("orders").select("status,payment_status").eq("id", orderId).maybeSingle();
  if (!order || order.payment_status === "paid" || order.status === "cancelled") return;

  const { data: items, error } = await admin.from("order_items").select("variant_id,quantity").eq("order_id", orderId);
  if (error || !items) return;

  const paymentStatus = status === "cancelled" ? "cancelled" : "rejected";
  const { data: claimedOrders, error: claimError } = await admin
    .from("orders")
    .update({ status: "cancelled", payment_status: paymentStatus })
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

  await markPayment(admin, orderId, {
    providerPaymentId: stringifyMetadata(rawPayload, "id") ?? "",
    status: paymentStatus,
    rawPayload,
  });
  await insertReleaseMovements(admin, orderId, items as OrderItemStockRow[], `Mercado Pago ${status}`);
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

function isReviewStatus(status?: string) {
  return status === "pending" || status === "in_process" || status === "authorized";
}

function isFailedStatus(status?: string) {
  return status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back";
}

function centsFromAmount(amount?: number) {
  return Math.round(Number(amount ?? 0) * 100);
}

function stringifyId(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

function stringifyMetadata(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>)[key];
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === "PGRST202" || /function .* does not exist|could not find the function/i.test(error.message ?? "");
}
