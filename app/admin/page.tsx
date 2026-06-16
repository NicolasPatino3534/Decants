import { AlertTriangle, ArrowUpRight, ClipboardList, PackageSearch, TrendingUp, Truck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminDashboard } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";

export default async function AdminDashboardPage() {
  const { orders, revenue, pendingOrders, lowStock } = await getAdminDashboard();
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid").length;
  const shippingQueue = orders.filter((order) => order.shipmentStatus === "preparing" || order.shipmentStatus === "pending").length;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">Operación</p>
          <h1 className="font-display mt-2 text-4xl text-ink">Panel de control</h1>
        </div>
        <p className="max-w-md text-sm leading-6 text-[#5f574c]">
          Vista rápida para priorizar pedidos, ingresos, stock crítico y envíos del día.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<TrendingUp size={19} />} label="Ventas totales" value={formatMoney(revenue)} helper="Ingresos registrados" />
        <Kpi icon={<ClipboardList size={19} />} label="Pedidos pendientes" value={String(pendingOrders)} helper={`${paidOrders} pagos confirmados`} />
        <Kpi icon={<AlertTriangle size={19} />} label="Bajo stock" value={String(lowStock.length)} helper="Requiere reposición" tone="amber" />
        <Kpi icon={<Truck size={19} />} label="Envíos a preparar" value={String(shippingQueue)} helper="Prioridad operativa" tone="green" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="rounded-md border border-line bg-white p-5 shadow-[0_18px_50px_rgba(11,13,15,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-ink">Últimos pedidos</h2>
              <p className="mt-1 text-sm text-[#6f6658]">Gestioná primero pedidos confirmados y envíos pendientes.</p>
            </div>
            <ArrowUpRight size={18} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-[#6f6658]">
                <tr>
                  <th className="py-3 font-bold">Pedido</th>
                  <th className="py-3 font-bold">Cliente</th>
                  <th className="py-3 font-bold">Total</th>
                  <th className="py-3 font-bold">Pago</th>
                  <th className="py-3 font-bold">Estado</th>
                  <th className="py-3 font-bold">Envío</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.slice(0, 7).map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="py-3 font-black text-ink">#{order.orderNumber}</td>
                    <td className="py-3">
                      <p className="font-bold text-ink">{order.customerName}</p>
                      <p className="text-xs text-[#6f6658]">{order.customerEmail}</p>
                    </td>
                    <td className="py-3 font-black text-ink">{formatMoney(order.totalCents)}</td>
                    <td className="py-3">
                      <StatusBadge tone={order.paymentStatus === "paid" ? "green" : "amber"}>{order.paymentStatus}</StatusBadge>
                    </td>
                    <td className="py-3">
                      <StatusBadge tone={order.status === "cancelled" ? "red" : order.status === "delivered" ? "green" : "neutral"}>{order.status}</StatusBadge>
                    </td>
                    <td className="py-3">
                      <StatusBadge tone={order.shipmentStatus === "delivered" ? "green" : "amber"}>{order.shipmentStatus}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-[0_18px_50px_rgba(11,13,15,0.05)]">
          <div className="flex items-center gap-2">
            <PackageSearch className="text-[#8c682b]" size={19} />
            <h2 className="text-lg font-black text-ink">Stock crítico</h2>
          </div>
          <p className="mt-1 text-sm text-[#6f6658]">Variantes que pueden bloquear ventas si no se reponen.</p>
          <div className="mt-4 divide-y divide-line">
            {lowStock.slice(0, 10).map(({ product, variant }) => (
              <div key={variant.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-black text-ink">{product.name}</p>
                  <p className="text-[#6f6658]">
                    {variant.sizeMl}ml · {variant.sku}
                  </p>
                </div>
                <span className="rounded-md bg-[#fff5df] px-3 py-1 text-sm font-black text-[#8c682b]">{variant.stockOnHand}</span>
              </div>
            ))}
            {lowStock.length === 0 ? <p className="py-4 text-sm text-[#6f6658]">No hay productos con bajo stock.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  helper,
  tone = "ink",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  tone?: "ink" | "amber" | "green";
}) {
  const toneClass = tone === "green" ? "bg-[#f5faf6] text-[#47624f]" : tone === "amber" ? "bg-[#fff5df] text-[#8c682b]" : "bg-mist text-ink";

  return (
    <div className="rounded-md border border-line bg-white p-5 shadow-[0_18px_50px_rgba(11,13,15,0.04)]">
      <div className={`grid h-10 w-10 place-items-center rounded-md ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-sm font-bold text-[#6f6658]">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
      <p className="mt-2 text-xs font-semibold text-[#7b7164]">{helper}</p>
    </div>
  );
}
