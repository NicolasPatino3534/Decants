import { updateOrderNotes, updateOrderStatus, updateShipmentStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminOrdersDetailed } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";

const statuses = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled"];
const shipmentStatuses = ["pending", "preparing", "in_transit", "delivered", "delayed"];

export default async function AdminOrdersPage() {
  const orders = await getAdminOrdersDetailed();

  return (
    <div>
      <h1 className="text-3xl font-black">Pedidos</h1>
      <p className="mt-2 text-neutral-600">Vista operativa de pedidos, cliente, direccion y notas internas.</p>

      <section className="mt-6 grid gap-5">
        {orders.map((order) => (
          <article key={order.id} className="rounded-md border border-line bg-white p-5">
            <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black">#{order.orderNumber}</h2>
                  <StatusBadge tone={order.status === "cancelled" ? "red" : order.status === "delivered" ? "green" : "neutral"}>{order.status}</StatusBadge>
                  <StatusBadge tone={order.paymentStatus === "paid" ? "green" : "amber"}>{order.paymentStatus}</StatusBadge>
                  <StatusBadge tone={order.shipmentStatus === "delivered" ? "green" : "amber"}>{order.shipmentStatus}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-neutral-500">{new Date(order.createdAt).toLocaleString("es-AR")}</p>
              </div>
              <p className="text-2xl font-black">{formatMoney(order.totalCents)}</p>
            </div>

            <div className="mt-4 grid gap-5 xl:grid-cols-[1fr_1fr_1.2fr]">
              <section>
                <h3 className="font-black">Cliente</h3>
                <p className="mt-2 text-sm font-semibold">{order.customerName}</p>
                <p className="text-sm text-neutral-500">{order.customerEmail}</p>
              </section>

              <section>
                <h3 className="font-black">Direccion de envio</h3>
                <div className="mt-2 space-y-1 text-sm text-neutral-600">
                  <p>{order.shippingAddress.street ?? "Sin direccion"}</p>
                  <p>
                    {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p>{order.shippingAddress.country ?? ""}</p>
                </div>
              </section>

              <section>
                <h3 className="font-black">Items</h3>
                <div className="mt-2 divide-y divide-line rounded-md border border-line">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3 p-3 text-sm">
                      <span>
                        {item.productName} <span className="text-neutral-500">{item.variantLabel} x {item.quantity}</span>
                      </span>
                      <span className="font-bold">{formatMoney(item.totalCents)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <form action={updateOrderStatus} className="rounded-md border border-line p-4">
                <input type="hidden" name="orderId" value={order.id} />
                <label>
                  <span className="mb-1 block text-sm font-bold">Estado de pedido</span>
                  <select name="status" defaultValue={order.status} className="h-10 w-full rounded-md border border-line px-2 text-sm">
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <Button variant="secondary" className="mt-3 h-10">Guardar</Button>
              </form>

              <form action={updateShipmentStatus} className="rounded-md border border-line p-4">
                <input type="hidden" name="orderId" value={order.id} />
                <label>
                  <span className="mb-1 block text-sm font-bold">Estado de envio</span>
                  <select name="shipmentStatus" defaultValue={order.shipmentStatus} className="h-10 w-full rounded-md border border-line px-2 text-sm">
                    {shipmentStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <Button variant="secondary" className="mt-3 h-10">Guardar</Button>
              </form>

              <form action={updateOrderNotes} className="rounded-md border border-line p-4">
                <input type="hidden" name="orderId" value={order.id} />
                <label>
                  <span className="mb-1 block text-sm font-bold">Notas internas</span>
                  <textarea name="notes" defaultValue={order.notes ?? ""} className="min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" />
                </label>
                <Button variant="secondary" className="mt-3 h-10">Guardar</Button>
              </form>
            </div>
          </article>
        ))}
        {orders.length === 0 ? <p className="rounded-md border border-line bg-white p-6 text-sm text-neutral-500">Todavia no hay pedidos.</p> : null}
      </section>
    </div>
  );
}
