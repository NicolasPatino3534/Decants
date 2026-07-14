import Link from "next/link";
import { Package, Truck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireCustomer } from "@/lib/auth/roles";
import { getAccountOrders } from "@/lib/data/orders";
import { formatMoney } from "@/lib/format";
import { orderStatusLabel } from "@/lib/orders/status-labels";

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
          {orders.length === 0 ? (
            <div className="rounded-md border border-line bg-paper p-8 text-center shadow-soft">
              <Package className="mx-auto text-amber" size={34} />
              <h2 className="font-display mt-4 text-3xl text-ink">
                Todavía no tenés pedidos
              </h2>
              <p className="mt-2 text-sm text-muted">
                Explorá el catálogo y elegí un decant para empezar.
              </p>
              <Link
                href="/catalogo"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-amber px-4 text-sm font-bold text-[var(--on-accent)]"
              >
                Explorar catálogo
              </Link>
            </div>
          ) : null}
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/cuenta/pedidos/${order.id}`}
              className="rounded-md border border-line bg-paper p-5 transition hover:shadow-soft"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-soft">
                    Pedido #{order.orderNumber}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-ink">
                    {formatMoney(order.totalCents)}
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    {order.items
                      .map((item) => `${item.productName} ${item.variantLabel}`)
                      .join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    tone={order.paymentStatus === "paid" ? "green" : "amber"}
                  >
                    <Package size={13} />{" "}
                    {orderStatusLabel(order.paymentStatus)}
                  </StatusBadge>
                  <StatusBadge
                    tone={
                      order.shipmentStatus === "delivered" ? "green" : "amber"
                    }
                  >
                    <Truck size={13} /> {orderStatusLabel(order.shipmentStatus)}
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
