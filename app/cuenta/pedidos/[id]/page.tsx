import { notFound } from "next/navigation";
import { LogIn } from "lucide-react";
import { isDemoProfile, requireCustomer } from "@/lib/auth/roles";
import { getOrderById } from "@/lib/data/orders";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireCustomer();

  if (isDemoProfile(profile)) {
    return (
      <main className="premium-shell mx-auto grid min-h-[70vh] place-items-center px-4 py-16 text-center">
        <div className="max-w-md rounded-md border border-line bg-white p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[#f6edda] text-[#8a611c]">
            <LogIn size={20} />
          </div>
          <h1 className="font-display mt-5 text-4xl text-ink">Ingresa para ver pedidos reales</h1>
          <p className="mt-3 text-sm leading-6 text-[#6f6658]">Los detalles de pedidos no muestran informacion demo.</p>
          <ButtonLink href="/auth?next=/cuenta" className="mt-6">Ingresar</ButtonLink>
        </div>
      </main>
    );
  }

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <main className="premium-shell">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[#6f6658]">Pedido #{order.orderNumber}</p>
        <h1 className="font-display mt-2 text-4xl text-ink">Seguimiento</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusBadge tone={order.paymentStatus === "paid" ? "green" : "amber"}>Pago {order.paymentStatus}</StatusBadge>
          <StatusBadge tone={order.shipmentStatus === "delivered" ? "green" : "amber"}>Envio {order.shipmentStatus}</StatusBadge>
        </div>
        <section className="mt-7 rounded-md border border-line bg-white p-5">
          <h2 className="text-lg font-black text-ink">Items</h2>
          <div className="mt-4 divide-y divide-line">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  {item.productName} <span className="text-[#6f6658]">{item.variantLabel} x {item.quantity}</span>
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
      </div>
    </main>
  );
}
