import type { Metadata } from "next";
import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { CheckoutSuccessClearCart } from "@/components/checkout/checkout-success-clear-cart";
import { ButtonLink } from "@/components/ui/button";
import { requireCustomer } from "@/lib/auth/roles";
import { getOrderById } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: "Estado del pedido",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  await requireCustomer("/checkout/success");
  const { order: orderId } = await searchParams;
  const order = orderId ? await getOrderById(orderId) : null;

  if (!order) {
    return (
      <StatusCard
        icon={<AlertCircle className="mx-auto text-danger" size={54} />}
        title="No pudimos verificar el pedido"
        description="Ingresá a tu cuenta para consultar tus pedidos o volvé al catálogo para seguir comprando."
      />
    );
  }

  const paid = order.paymentStatus === "paid";
  const failed =
    order.paymentStatus === "failed" ||
    order.paymentStatus === "cancelled" ||
    order.paymentStatus === "rejected";

  if (failed) {
    return (
      <StatusCard
        icon={<AlertCircle className="mx-auto text-danger" size={54} />}
        title="El pago no se confirmó"
        description="Tu pedido no fue cobrado. Conservamos el carrito para que puedas revisar los datos e intentarlo nuevamente."
      />
    );
  }

  return (
    <>
      {paid ? <CheckoutSuccessClearCart /> : null}
      <StatusCard
        icon={
          paid ? (
            <CheckCircle2 className="mx-auto text-moss" size={54} />
          ) : (
            <Clock3 className="mx-auto text-amber" size={54} />
          )
        }
        title={paid ? "Pago confirmado" : "Pedido recibido"}
        description={
          paid
            ? `Confirmamos el pedido #${order.orderNumber}. Te avisaremos cuando el envío esté en camino.`
            : `El pedido #${order.orderNumber} está pendiente de confirmación. Podés seguir su estado desde tu cuenta.`
        }
      />
    </>
  );
}

function StatusCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="premium-shell grid min-h-[65vh] place-items-center px-4 py-16 text-center">
      <div className="max-w-3xl rounded-md border border-line bg-paper p-8 shadow-soft">
        {icon}
        <h1 className="font-display mt-5 text-4xl text-ink">{title}</h1>
        <p className="mt-3 text-muted">{description}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/cuenta">Ver pedidos</ButtonLink>
          <ButtonLink href="/catalogo" variant="secondary">
            Seguir comprando
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
