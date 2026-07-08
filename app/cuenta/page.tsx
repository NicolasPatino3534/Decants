import Link from "next/link";
import { LogIn, Package, ShoppingBag, Truck } from "lucide-react";
import { isDemoProfile, requireCustomer } from "@/lib/auth/roles";
import { getAccountOrders } from "@/lib/data/orders";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await requireCustomer();

  if (isDemoProfile(profile)) {
    return (
      <main className="premium-shell mx-auto grid min-h-[70vh] place-items-center px-4 py-16 text-center">
        <div className="max-w-md rounded-md border border-line bg-white p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[#f6edda] text-[#8a611c]">
            <LogIn size={20} />
          </div>
          <h1 className="font-display mt-5 text-4xl text-ink">Ingresa para ver tus pedidos</h1>
          <p className="mt-3 text-sm leading-6 text-[#6f6658]">
            Esta seccion muestra pedidos reales cuando hay una cuenta activa. No publicamos pedidos demo en produccion.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/auth?next=/cuenta">Ingresar</ButtonLink>
            <ButtonLink href="/catalogo" variant="secondary">
              <ShoppingBag size={17} /> Explorar catalogo
            </ButtonLink>
          </div>
        </div>
      </main>
    );
  }

  const orders = await getAccountOrders(profile.id);

  return (
    <main className="premium-shell">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Cuenta</p>
            <h1 className="font-display mt-2 text-4xl text-ink sm:text-5xl">Mis pedidos</h1>
            <p className="mt-2 text-sm text-[#6f6658]">{profile.email}</p>
          </div>
        </div>
        {orders.length > 0 ? (
          <div className="mt-7 grid gap-5">
            {orders.map((order) => (
              <Link key={order.id} href={`/cuenta/pedidos/${order.id}`} className="rounded-md border border-line bg-white p-5 transition hover:border-[#caa55c]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#6f6658]">Pedido #{order.orderNumber}</p>
                    <h2 className="mt-1 text-xl font-black text-ink">{formatMoney(order.totalCents)}</h2>
                    <p className="mt-2 text-sm text-[#5f574c]">{order.items.map((item) => `${item.productName} ${item.variantLabel}`).join(", ")}</p>
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
        ) : (
          <div className="mt-7 rounded-md border border-line bg-white p-8 text-center">
            <Package className="mx-auto text-[#b88939]" size={28} />
            <h2 className="font-display mt-4 text-3xl text-ink">Todavia no hay pedidos</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6f6658]">Cuando confirmes un pedido, vas a poder seguirlo desde esta cuenta.</p>
            <ButtonLink href="/catalogo" className="mt-6">
              Explorar catalogo
            </ButtonLink>
          </div>
        )}
      </div>
    </main>
  );
}
