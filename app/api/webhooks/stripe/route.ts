import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import {
  clearFinalizedOrderCart,
  deliverPaidOrderNotification,
  finalizePaidOrder,
} from "@/lib/payments/finalization";
import { getStripe } from "@/lib/payments/stripe";
import { reconcilePaymentValues } from "@/lib/payments/reconciliation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

const PAYMENT_REVIEW_RESERVATION_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const stripe = getStripe();
  const admin = createSupabaseAdminClient();

  if (!stripe || !admin || !env.stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Webhook no configurado." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma faltante." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.stripeWebhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid")
        await handleCheckoutPaid(admin, event);
      else if (session.metadata?.orderId)
        await markPaymentReview(admin, session.metadata.orderId, event);
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      await handleCheckoutPaid(admin, event);
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      await handleCheckoutFailed(admin, event);
    }

    if (event.type === "payment_intent.payment_failed") {
      await handlePaymentIntentFailed(admin, event);
    }
  } catch (caught) {
    console.error("stripe_webhook_processing_error", caught);
    return NextResponse.json(
      { error: "No se pudo procesar el webhook." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutPaid(admin: AdminClient, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const reconciliation = await reconcileSession(admin, orderId, session);
  if (!reconciliation.ok) {
    console.error("stripe_payment_reconciliation_required", {
      orderId,
      sessionId: session.id,
      reason: reconciliation.reason,
    });
    await markPaymentReview(admin, orderId, event);
    await markLatePaymentReview(admin, orderId, event);
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
    console.error("stripe_late_paid_session_requires_review", {
      orderId,
      sessionId: session.id,
    });
    await markLatePaymentReview(admin, orderId, event);
    return;
  }

  try {
    const finalized = await finalizePaidOrder(admin, {
      orderId,
      provider: "stripe",
      providerEventId: event.id,
      providerSessionId: session.id,
      providerPaymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      eventPayload: safeStripeEventPayload(event),
    });
    await clearFinalizedOrderCart(admin, finalized.userId);
    await deliverPaidOrderNotification(admin, finalized);
  } catch (caught) {
    if (
      caught instanceof Error &&
      caught.message === "PAYMENT_REQUIRES_REVIEW"
    ) {
      await markLatePaymentReview(admin, orderId, event);
      return;
    }
    throw caught;
  }
}

async function handleCheckoutFailed(admin: AdminClient, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  await releaseReservedStockForOrder(
    admin,
    orderId,
    "Checkout expirado o pago asincrónico fallido",
  );
}

async function handlePaymentIntentFailed(
  admin: AdminClient,
  event: Stripe.Event,
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  await markPaymentFailedByIntent(admin, paymentIntent.id, event);
}

async function releaseReservedStockForOrder(
  admin: AdminClient,
  orderId: string,
  note: string,
) {
  const { error } = await admin.rpc("release_order_stock_reservation", {
    p_order_id: orderId,
    p_payment_status: "failed",
    p_note: note,
  });
  if (error) throw error;
}

async function markPaymentFailedByIntent(
  admin: AdminClient,
  paymentIntentId: string,
  event: Stripe.Event,
) {
  const payload = {
    status: "failed",
    raw_payload: safeStripeEventPayload(event),
  };
  const { error } = await admin
    .from("payments")
    .update(payload)
    .eq("provider_payment_intent_id", paymentIntentId)
    .neq("status", "paid")
    .neq("status", "refunded");
  if (!error) return;
  const { error: fallbackError } = await admin
    .from("payments")
    .update(payload)
    .eq("provider_payment_id", paymentIntentId)
    .neq("status", "paid")
    .neq("status", "refunded");
  if (fallbackError) throw fallbackError;
}

async function reconcileSession(
  admin: AdminClient,
  orderId: string,
  session: Stripe.Checkout.Session,
) {
  const { data: storedPayment, error } = await admin
    .from("payments")
    .select("amount_cents,currency,provider_session_id")
    .eq("order_id", orderId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (error || !storedPayment)
    return { ok: false as const, reason: "payment_record_missing" };
  const reason = reconcilePaymentValues({
    expectedAmountCents: Number(storedPayment.amount_cents),
    expectedCurrency: String(storedPayment.currency ?? ""),
    expectedSessionId: storedPayment.provider_session_id,
    receivedAmountCents: Number(session.amount_total ?? -1),
    receivedCurrency: String(session.currency ?? ""),
    receivedSessionId: session.id,
  });
  if (reason) return { ok: false as const, reason };

  return { ok: true as const };
}

async function markPaymentReview(
  admin: AdminClient,
  orderId: string,
  event: Stripe.Event,
) {
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
      raw_payload: safeStripeEventPayload(event),
    })
    .eq("order_id", orderId)
    .neq("status", "paid")
    .neq("status", "refunded");
  if (paymentError) throw paymentError;
}

async function markLatePaymentReview(
  admin: AdminClient,
  orderId: string,
  event: Stripe.Event,
) {
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
      raw_payload: safeStripeEventPayload(event),
    })
    .eq("order_id", orderId)
    .neq("status", "paid")
    .neq("status", "refunded");
  if (paymentError) throw paymentError;
}

function safeStripeEventPayload(event: Stripe.Event) {
  const object = event.data.object as
    Stripe.Checkout.Session | Stripe.PaymentIntent;
  return {
    event_id: event.id,
    event_type: event.type,
    created: event.created,
    livemode: event.livemode,
    object_id: object.id,
    status: "status" in object ? object.status : null,
  };
}
