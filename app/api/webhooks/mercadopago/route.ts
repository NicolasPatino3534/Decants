import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from "mercadopago";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { env } from "@/lib/env";
import {
  clearFinalizedOrderCart,
  deliverPaidOrderNotification,
  finalizePaidOrder,
} from "@/lib/payments/finalization";
import { getMercadoPagoPayment } from "@/lib/payments/mercadopago";
import { reconcilePaymentValues } from "@/lib/payments/reconciliation";
import {
  getMercadoPagoOrderId,
  getMercadoPagoPaymentAction,
  getMercadoPagoPaymentId,
  getMercadoPagoWebhookDataId,
  parseMercadoPagoWebhookPayload,
} from "@/lib/payments/mercadopago-webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

const PAYMENT_REVIEW_RESERVATION_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  const paymentClient = getMercadoPagoPayment();

  if (!admin || !paymentClient) {
    return NextResponse.json(
      { error: "Webhook no configurado." },
      { status: 500 },
    );
  }

  if (process.env.NODE_ENV === "production" && !env.mercadoPagoWebhookSecret) {
    return NextResponse.json(
      { error: "Firma de webhook no configurada." },
      { status: 500 },
    );
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
    return NextResponse.json(
      { error: "No se pudo consultar el pago." },
      { status: 502 },
    );
  }

  try {
    const action = getMercadoPagoPaymentAction(payment.status);
    if (action === "approved") {
      await handlePaymentApproved(admin, payment);
    } else if (action === "failed") {
      await handlePaymentFailed(admin, payment);
    } else if (action === "review") {
      await markPaymentReview(admin, payment);
    } else if (action === "reversed") {
      await handlePaymentReversed(admin, payment);
    }
  } catch (caught) {
    console.error("mercadopago_webhook_processing_error", caught);
    return NextResponse.json(
      { error: "No se pudo procesar el webhook." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentApproved(
  admin: AdminClient,
  payment: PaymentResponse,
) {
  const orderId = getMercadoPagoOrderId(payment);
  if (!orderId) return;

  const reconciliation = await reconcilePayment(admin, orderId, payment);
  if (!reconciliation.ok) {
    console.error("mercadopago_payment_reconciliation_required", {
      orderId,
      paymentId: payment.id ? String(payment.id) : null,
      reason: reconciliation.reason,
    });
    await markPaymentReview(admin, payment);
    await markLatePaymentReview(admin, payment);
    return;
  }

  const { data: currentOrder } = await admin
    .from("orders")
    .select("status,payment_status,stock_released_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!currentOrder) return;
  if (
    currentOrder.payment_status !== "paid" &&
    (currentOrder.status === "cancelled" ||
      currentOrder.payment_status === "failed" ||
      currentOrder.payment_status === "cancelled" ||
      currentOrder.stock_released_at != null)
  ) {
    console.error("mercadopago_late_approved_payment_requires_review", {
      orderId,
      paymentId: payment.id ? String(payment.id) : null,
    });
    await markLatePaymentReview(admin, payment);
    return;
  }

  try {
    const paymentId = payment.id ? String(payment.id) : "unknown";
    const finalized = await finalizePaidOrder(admin, {
      orderId,
      provider: "mercadopago",
      providerEventId: `${paymentId}:approved`,
      providerPaymentId: payment.id ? String(payment.id) : null,
      eventPayload: safePaymentPayload(payment),
    });
    await clearFinalizedOrderCart(admin, finalized.userId);
    await deliverPaidOrderNotification(admin, finalized);
  } catch (caught) {
    if (
      caught instanceof Error &&
      caught.message === "PAYMENT_REQUIRES_REVIEW"
    ) {
      await markLatePaymentReview(admin, payment);
      return;
    }
    throw caught;
  }
}

async function markPaymentReview(admin: AdminClient, payment: PaymentResponse) {
  const orderId = getMercadoPagoOrderId(payment);
  if (!orderId) return;

  const reservationExpiresAt = new Date(
    Date.now() + PAYMENT_REVIEW_RESERVATION_TTL_MS,
  ).toISOString();
  const { error: orderError } = await admin
    .from("orders")
    .update({
      status: "payment_review",
      payment_status: "payment_review",
      reservation_expires_at: reservationExpiresAt,
    })
    .eq("id", orderId)
    .in("payment_status", ["pending", "payment_review"])
    .is("stock_released_at", null);
  if (orderError) throw orderError;

  const { error: paymentError } = await admin
    .from("payments")
    .update({
      status: "payment_review",
      provider_payment_intent_id: payment.id ? String(payment.id) : null,
      raw_payload: safePaymentPayload(payment),
    })
    .eq("order_id", orderId)
    .neq("status", "paid")
    .neq("status", "refunded");
  if (paymentError) throw paymentError;
}

async function markLatePaymentReview(
  admin: AdminClient,
  payment: PaymentResponse,
) {
  const orderId = getMercadoPagoOrderId(payment);
  if (!orderId) return;

  const { error: orderError } = await admin
    .from("orders")
    .update({ status: "payment_review", payment_status: "payment_review" })
    .eq("id", orderId)
    .neq("payment_status", "paid")
    .neq("payment_status", "refunded");
  if (orderError) throw orderError;

  const { error: paymentError } = await admin
    .from("payments")
    .update({
      status: "payment_review",
      provider_payment_intent_id: payment.id ? String(payment.id) : null,
      raw_payload: safePaymentPayload(payment),
    })
    .eq("order_id", orderId)
    .neq("status", "paid")
    .neq("status", "refunded");
  if (paymentError) throw paymentError;
}

async function handlePaymentFailed(
  admin: AdminClient,
  payment: PaymentResponse,
) {
  const orderId = getMercadoPagoOrderId(payment);
  if (!orderId) return;
  await markPaymentFailed(admin, orderId, payment);
}

async function handlePaymentReversed(
  admin: AdminClient,
  payment: PaymentResponse,
) {
  const orderId = getMercadoPagoOrderId(payment);
  if (!orderId) return;

  const reconciliation = await reconcilePayment(admin, orderId, payment);
  if (!reconciliation.ok) {
    console.error("mercadopago_reversal_reconciliation_required", {
      orderId,
      paymentId: payment.id ? String(payment.id) : null,
      reason: reconciliation.reason,
    });
    return;
  }

  const refunded = payment.status === "refunded";
  const nextStatus = refunded ? "refunded" : "payment_review";
  const { error: orderError } = await admin
    .from("orders")
    .update({ status: nextStatus, payment_status: nextStatus })
    .eq("id", orderId)
    .eq("payment_status", "paid");
  if (orderError) throw orderError;

  const { error: paymentError } = await admin
    .from("payments")
    .update({ status: nextStatus, raw_payload: safePaymentPayload(payment) })
    .eq("order_id", orderId)
    .eq("status", "paid");
  if (paymentError) throw paymentError;
}

async function markPaymentFailed(
  admin: AdminClient,
  orderId: string,
  payment: PaymentResponse,
) {
  const payload = {
    status: "failed",
    provider_payment_intent_id: payment.id ? String(payment.id) : null,
    raw_payload: safePaymentPayload(payment),
  };
  const { error } = await admin
    .from("payments")
    .update(payload)
    .eq("order_id", orderId)
    .neq("status", "paid")
    .neq("status", "refunded");
  if (!error) return;

  const {
    provider_payment_intent_id: _providerPaymentIntentId,
    ...fallbackPayload
  } = payload;
  const { error: fallbackError } = await admin
    .from("payments")
    .update({
      ...fallbackPayload,
      provider_payment_id: payload.provider_payment_intent_id,
    })
    .eq("order_id", orderId)
    .neq("status", "paid")
    .neq("status", "refunded");
  if (fallbackError) throw fallbackError;
}

async function reconcilePayment(
  admin: AdminClient,
  orderId: string,
  payment: PaymentResponse,
) {
  const { data: storedPayment, error } = await admin
    .from("payments")
    .select("amount_cents,currency")
    .eq("order_id", orderId)
    .eq("provider", "mercadopago")
    .maybeSingle();

  if (error || !storedPayment)
    return { ok: false as const, reason: "payment_record_missing" };

  const reason = reconcilePaymentValues({
    expectedAmountCents: Number(storedPayment.amount_cents),
    expectedCurrency: String(storedPayment.currency ?? ""),
    receivedAmountCents: Math.round(
      Number(payment.transaction_amount ?? 0) * 100,
    ),
    receivedCurrency: String(payment.currency_id ?? ""),
  });
  if (reason) return { ok: false as const, reason };

  return { ok: true as const };
}

function safePaymentPayload(payment: PaymentResponse) {
  return {
    id: payment.id ?? null,
    status: payment.status ?? null,
    status_detail: payment.status_detail ?? null,
    transaction_amount: payment.transaction_amount ?? null,
    currency_id: payment.currency_id ?? null,
    external_reference: payment.external_reference ?? null,
    date_approved: payment.date_approved ?? null,
  };
}
