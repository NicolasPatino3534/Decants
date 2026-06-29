import { CheckCircle2 } from "lucide-react";
import { createHash } from "node:crypto";
import { PurchaseTracker } from "@/components/analytics/purchase-tracker";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; order?: string; pending?: string; failed?: string }>;
}) {
  const params = await searchParams;
  const order = params.order ? await getOrderForSuccess(params.order) : null;
  const isPaid = order?.paymentStatus === "paid";
  const isFailed =
    Boolean(params.failed) ||
    order?.paymentStatus === "failed" ||
    order?.paymentStatus === "rejected" ||
    order?.paymentStatus === "cancelled";
  const isPending = Boolean(params.pending) || order?.paymentStatus === "payment_review" || order?.paymentStatus === "pending";
  const title = isFailed ? "Pago no confirmado" : isPending ? "Pedido recibido" : "Pedido confirmado";
  const message = params.demo
    ? "Modo demo: el flujo completo quedo validado sin cobrar."
    : isFailed
      ? "No pudimos confirmar el pago. Si Mercado Pago te mostro un cobro aprobado, escribinos y lo revisamos."
      : isPending
        ? "Recibimos el pedido y estamos esperando la confirmacion del pago. Te vamos a contactar por WhatsApp si hace falta."
        : "Recibimos el pedido y te vamos a enviar las novedades del envio.";

  return (
    <main className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-4 py-16 text-center">
      {isPaid && order?.tracking ? <PurchaseTracker payload={order.tracking} /> : null}
      <div>
        <CheckCircle2 className="mx-auto text-moss" size={54} />
        <h1 className="mt-5 text-4xl font-black">{title}</h1>
        <p className="mt-3 text-neutral-600">{message}</p>
        <div className="mt-7 flex justify-center gap-3">
          <ButtonLink href="/cuenta">Ver pedidos</ButtonLink>
          <ButtonLink href="/catalogo" variant="secondary">
            Seguir comprando
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

async function getOrderForSuccess(orderId: string) {
  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  if (!admin || !supabase || !isUuid(orderId)) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: order } = await admin
    .from("orders")
    .select(
      "id,user_id,order_number,payment_status,total_cents,shipping_cents,discount_cents,customer_email,shipping_address,order_items ( id, variant_id, product_name, variant_label, variant_size_ml, quantity, unit_price_cents )",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.user_id !== user.id) return null;

  const paymentStatus = String(order.payment_status ?? "pending");
  const emailHash = hashForEnhancedConversion(String(order.customer_email ?? ""));
  const shippingAddress = isRecord(order.shipping_address) ? order.shipping_address : {};
  const phoneHash = hashForEnhancedConversion(String(shippingAddress.phone ?? "").replace(/\D/g, ""));

  return {
    paymentStatus,
    tracking:
      paymentStatus === "paid"
        ? {
            transactionId: String(order.order_number ?? order.id),
            valueCents: Number(order.total_cents ?? 0),
            shippingCents: Number(order.shipping_cents ?? 0),
            discountCents: Number(order.discount_cents ?? 0),
            enhancedConversionData: {
              sha256_email_address: emailHash,
              sha256_phone_number: phoneHash,
            },
            items: (order.order_items ?? []).map((item) => ({
              item_id: String(item.variant_id ?? item.id),
              item_name: String(item.product_name ?? "Decant"),
              item_variant: String(item.variant_size_ml ? `${item.variant_size_ml}ml` : item.variant_label ?? ""),
              price: Number((Number(item.unit_price_cents ?? 0) / 100).toFixed(2)),
              quantity: Number(item.quantity ?? 1),
            })),
          }
        : null,
  };
}

function hashForEnhancedConversion(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
