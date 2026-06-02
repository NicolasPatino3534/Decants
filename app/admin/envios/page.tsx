import { updateShipmentStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminOrdersDetailed } from "@/lib/data/admin";

const shipmentStatuses = ["pending", "preparing", "in_transit", "delivered", "delayed"];

export default async function AdminShipmentsPage() {
  const orders = await getAdminOrdersDetailed();

  return (
    <div>
      <h1 className="text-3xl font-black">Envios</h1>
      <p className="mt-2 text-neutral-600">Seguimiento operativo de preparacion, transito y entrega.</p>

      <section className="mt-6 overflow-hidden rounded-md border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-mist text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Pedido</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Direccion</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Actualizar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-black">#{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{order.customerName}</p>
                    <p className="text-neutral-500">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    <p>{order.shippingAddress.street ?? "Sin direccion"}</p>
                    <p>{[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(", ")}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={order.shipmentStatus === "delivered" ? "green" : "amber"}>{order.shipmentStatus}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateShipmentStatus} className="flex gap-2">
                      <input type="hidden" name="orderId" value={order.id} />
                      <select name="shipmentStatus" defaultValue={order.shipmentStatus} className="h-10 rounded-md border border-line px-2 text-sm">
                        {shipmentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <Button variant="secondary" className="h-10">Guardar</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
