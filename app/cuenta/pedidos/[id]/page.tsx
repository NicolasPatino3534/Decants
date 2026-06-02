import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/roles";
import { getOrderById } from "@/lib/data/orders";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCustomer();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-neutral-500">Pedido #{order.orderNumber}</p>
      <h1 className="mt-2 text-4xl font-black">Seguimiento</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        <StatusBadge tone={order.paymentStatus === "paid" ? "green" : "amber"}>Pago {order.paymentStatus}</StatusBadge>
        <StatusBadge tone={order.shipmentStatus === "delivered" ? "green" : "amber"}>Envio {order.shipmentStatus}</StatusBadge>
      </div>
      <section className="mt-7 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">Items</h2>
        <div className="mt-4 divide-y divide-line">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {item.productName} <span className="text-neutral-500">{item.variantLabel} x {item.quantity}</span>
              </span>
              <span className="font-bold">{formatMoney(item.unitPriceCents * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-line pt-4 font-black">
          <span>Total</span>
          <span>{formatMoney(order.totalCents)}</span>
        </div>
      </section>
    </main>
  );
}
