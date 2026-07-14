import { sendOrderEmail } from "@/lib/notifications/email";
import { escapeHtml } from "@/lib/security/sanitize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type FinalizePaidOrderInput = {
  orderId: string;
  provider: "stripe" | "mercadopago";
  providerEventId: string;
  providerSessionId?: string | null;
  providerPaymentId?: string | null;
  eventPayload: Record<string, unknown>;
};

type FinalizationRow = {
  user_id: string | null;
  customer_email: string;
  customer_name: string;
  order_number: string;
  notification_pending: boolean;
  already_processed: boolean;
};

export type FinalizedPaidOrder = {
  orderId: string;
  userId: string | null;
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  notificationPending: boolean;
  alreadyProcessed: boolean;
};

export async function finalizePaidOrder(
  admin: AdminClient,
  input: FinalizePaidOrderInput,
): Promise<FinalizedPaidOrder> {
  const { data, error } = await admin.rpc("finalize_paid_order", {
    p_order_id: input.orderId,
    p_provider: input.provider,
    p_provider_event_id: input.providerEventId,
    p_provider_session_id: input.providerSessionId ?? null,
    p_provider_payment_id: input.providerPaymentId ?? null,
    p_event_payload: input.eventPayload,
  });

  if (error) {
    throw new Error(
      error.message?.includes("PAYMENT_REQUIRES_REVIEW")
        ? "PAYMENT_REQUIRES_REVIEW"
        : "PAYMENT_FINALIZATION_FAILED",
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as FinalizationRow | null;
  if (!row) throw new Error("PAYMENT_FINALIZATION_EMPTY");

  return {
    orderId: input.orderId,
    userId: row.user_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    orderNumber: row.order_number,
    notificationPending: Boolean(row.notification_pending),
    alreadyProcessed: Boolean(row.already_processed),
  };
}

export async function clearFinalizedOrderCart(
  admin: AdminClient,
  userId: string | null,
) {
  if (!userId) return;

  const { data: cart, error: cartError } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (cartError) throw new Error("CART_LOOKUP_FAILED");
  if (!cart) return;

  const { error: deleteError } = await admin
    .from("cart_items")
    .delete()
    .eq("cart_id", cart.id);
  if (deleteError) throw new Error("CART_CLEAR_FAILED");
}

export async function deliverPaidOrderNotification(
  admin: AdminClient,
  order: FinalizedPaidOrder,
) {
  if (!order.notificationPending) return;

  const customerName = escapeHtml(order.customerName);
  const orderNumber = escapeHtml(order.orderNumber);
  const delivery = await sendOrderEmail({
    orderId: order.orderId,
    to: order.customerEmail,
    subject: `Pedido #${order.orderNumber} confirmado`,
    template: "order_paid",
    idempotencyKey: `order-paid-${order.orderId}`,
    html: `<p>Hola ${customerName}, recibimos tu pago del pedido #${orderNumber}. Te avisamos cuando el envío esté en camino.</p>`,
  });

  const delivered = delivery.ok && !("skipped" in delivery && delivery.skipped);
  const deliveryError = delivered
    ? null
    : "skipped" in delivery && delivery.skipped
      ? "email_provider_not_configured"
      : "payload" in delivery
        ? (delivery.payload?.message ?? "email_delivery_failed")
        : "email_delivery_failed";

  const { error } = await admin.rpc("complete_order_notification_outbox", {
    p_order_id: order.orderId,
    p_template: "order_paid",
    p_success: delivered,
    p_error: deliveryError,
  });
  if (error) throw new Error("NOTIFICATION_OUTBOX_UPDATE_FAILED");
  if (!delivered) throw new Error("ORDER_NOTIFICATION_PENDING");
}
