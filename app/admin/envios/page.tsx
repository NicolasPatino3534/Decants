import { updateShipmentStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { whatsappUrl } from "@/lib/brand";
import { getAdminOrdersDetailed } from "@/lib/data/admin";
import { MessageCircle } from "lucide-react";

const shipmentStatuses = ["pending", "preparing", "ready_to_ship", "shipped", "delivered", "delayed"];

export default async function AdminShipmentsPage() {
  const orders = await getAdminOrdersDetailed();

  return (
    <div>
      <h1 className="text-3xl font-black">Envíos</h1>
      <p className="mt-2 text-neutral-600">Seguimiento operativo de preparación, tránsito y entrega.</p>

      <section className="mt-6 overflow-hidden rounded-md border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-mist text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Pedido</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Dirección</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
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
                    <p>{order.shippingAddress.street ?? "Sin dirección"}</p>
                    <p>{[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(", ")}</p>
                    {order.shippingAddress.reference ? <p className="text-xs">Ref.: {order.shippingAddress.reference}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={order.shipmentStatus === "delivered" ? "green" : "amber"}>{order.shipmentStatus}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {order.shippingAddress.phone ? (
                      <a
                        href={adminWhatsappUrl(order.shippingAddress.phone, order.orderNumber)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm font-bold text-[#47624f] transition hover:bg-[#f5faf6]"
                      >
                        <MessageCircle size={15} />
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-neutral-400">Sin teléfono</span>
                    )}
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

function adminWhatsappUrl(phone: string, orderNumber: string) {
  const cleanPhone = phone.replace(/[^\d]/g, "");
  if (cleanPhone.length >= 8) {
    const international = cleanPhone.startsWith("54") ? cleanPhone : `549${cleanPhone}`;
    return `https://wa.me/${international}?text=${encodeURIComponent(`Hola, te escribimos de DecantsCBA por tu pedido #${orderNumber}.`)}`;
  }
  return whatsappUrl(`Hola, te escribimos de DecantsCBA por el pedido #${orderNumber}.`);
}
