import Link from "next/link";
import { Package, Truck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCustomer } from "@/lib/auth/roles";
import { getAccountOrders } from "@/lib/data/orders";
import { formatMoney } from "@/lib/format";

export default async function AccountPage() {
  const profile = await requireCustomer();
  const orders = await getAccountOrders(profile.id);

  return (
    <main className="premium-shell min-h-[70vh] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl text-ink">Mis pedidos</h1>
            <p className="mt-2 text-muted">{profile.email}</p>
          </div>
        </div>
        <div className="mt-7 grid gap-5">
          {orders.map((order) => (
            <Link key={order.id} href={`/cuenta/pedidos/${order.id}`} className="rounded-md border border-line bg-paper p-5 transition hover:shadow-soft">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-soft">Pedido #{order.orderNumber}</p>
                  <h2 className="mt-1 text-xl font-black text-ink">{formatMoney(order.totalCents)}</h2>
                  <p className="mt-2 text-sm text-muted">{order.items.map((item) => `${item.productName} ${item.variantLabel}`).join(", ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={order.paymentStatus === "paid" ? "green" : "amber"}>
                    <Package size={13} /> {order.paymentStatus}
                  </StatusBadge>
                  <StatusBadge tone={order.shipmentStatus === "delivered" ? "green" : "amber"}>
                    <Truck size={13} /> {order.shipmentStatus}
                  </StatusBadge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
