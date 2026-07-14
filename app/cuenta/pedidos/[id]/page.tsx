import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCustomer } from "@/lib/auth/roles";
import { getOrderById } from "@/lib/data/orders";
import { formatMoney } from "@/lib/format";
import { orderStatusLabel } from "@/lib/orders/status-labels";

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCustomer();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <main className="premium-shell min-h-[70vh] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-soft">
          Pedido #{order.orderNumber}
        </p>
        <h1 className="font-display mt-2 text-4xl text-ink">Seguimiento</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusBadge
            tone={order.paymentStatus === "paid" ? "green" : "amber"}
          >
            Pago: {orderStatusLabel(order.paymentStatus)}
          </StatusBadge>
          <StatusBadge
            tone={order.shipmentStatus === "delivered" ? "green" : "amber"}
          >
            Envío: {orderStatusLabel(order.shipmentStatus)}
          </StatusBadge>
        </div>
        <section className="mt-7 rounded-md border border-line bg-paper p-5 shadow-soft">
          <h2 className="text-lg font-black text-ink">Ítems</h2>
          <div className="mt-4 divide-y divide-line">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 py-3 text-sm text-ink"
              >
                <span>
                  {item.productName}{" "}
                  <span className="text-soft">
                    {item.variantLabel} x {item.quantity}
                  </span>
                </span>
                <span className="font-bold">
                  {formatMoney(item.unitPriceCents * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-black text-ink">
            <span>Total</span>
            <span>{formatMoney(order.totalCents)}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
