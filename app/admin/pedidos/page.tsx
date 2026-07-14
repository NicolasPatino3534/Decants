import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminOrdersDetailed } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";
import { orderStatusLabel } from "@/lib/orders/status-labels";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrdersDetailed();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6f24]">
            Pedidos
          </p>
          <h1 className="mt-2 text-3xl font-black text-ink">Ver pedidos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#665d50]">
            Lista de pedidos con acceso al detalle completo de cliente,
            productos, estado, fecha, total y datos de envío.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-[#665d50]">
          <ClipboardList size={17} className="text-[#b8872f]" />
          {orders.length} pedidos
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-md border border-line bg-white">
        <div className="grid gap-3 p-3 lg:hidden">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-md border border-line bg-[#fbfaf6] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-ink">#{order.orderNumber}</p>
                  <p className="mt-1 break-words text-sm font-bold text-ink">
                    {order.customerName}
                  </p>
                  <p className="mt-1 break-all text-xs text-[#756b5d]">
                    {order.customerEmail}
                  </p>
                </div>
                <p className="font-black text-ink">
                  {formatMoney(order.totalCents)}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge
                  tone={order.paymentStatus === "paid" ? "green" : "amber"}
                >
                  {orderStatusLabel(order.paymentStatus)}
                </StatusBadge>
                <StatusBadge
                  tone={
                    order.status === "cancelled"
                      ? "red"
                      : order.status === "delivered"
                        ? "green"
                        : "neutral"
                  }
                >
                  {orderStatusLabel(order.status)}
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm text-[#665d50]">
                {new Date(order.createdAt).toLocaleString("es-AR")}
              </p>
              <Link
                href={`/admin/pedidos/${order.id}`}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#caa55c] bg-white px-3 text-sm font-bold leading-none text-ink transition hover:bg-[#f8f1e3]"
              >
                Ver detalle <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line bg-mist text-[#665d50]">
              <tr>
                <th className="px-4 py-3 font-bold">Pedido</th>
                <th className="px-4 py-3 font-bold">Cliente</th>
                <th className="px-4 py-3 font-bold">Fecha</th>
                <th className="px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3 font-bold">Pago</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="px-4 py-4 font-black text-ink">
                    #{order.orderNumber}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-ink">{order.customerName}</p>
                    <p className="mt-1 text-xs text-[#756b5d]">
                      {order.customerEmail}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-[#665d50]">
                    {new Date(order.createdAt).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-4 font-black text-ink">
                    {formatMoney(order.totalCents)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      tone={order.paymentStatus === "paid" ? "green" : "amber"}
                    >
                      {orderStatusLabel(order.paymentStatus)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      tone={
                        order.status === "cancelled"
                          ? "red"
                          : order.status === "delivered"
                            ? "green"
                            : "neutral"
                      }
                    >
                      {orderStatusLabel(order.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#caa55c] bg-white px-3 text-sm font-bold leading-none text-ink transition hover:bg-[#f8f1e3]"
                    >
                      Ver detalle <ArrowRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 ? (
          <p className="p-6 text-sm text-[#665d50]">Todavía no hay pedidos.</p>
        ) : null}
      </section>
    </div>
  );
}
