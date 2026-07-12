import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { updateOrderNotes, updateOrderStatus, updateShipmentStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { whatsappUrl } from "@/lib/brand";
import { getAdminOrderById } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";

const statuses = ["pending_payment", "payment_review", "paid", "preparing", "ready_to_ship", "shipped", "delivered", "cancelled", "rejected"];
const shipmentStatuses = ["pending", "preparing", "ready_to_ship", "shipped", "delivered", "delayed"];

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getAdminOrderById(id);
  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm font-bold text-[#7a5a20] hover:text-ink">
        <ArrowLeft size={16} />
        Volver a pedidos
      </Link>

      <article className="mt-4 rounded-md border border-line bg-white p-5">
        <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-ink">Pedido #{order.orderNumber}</h1>
              <StatusBadge tone={order.status === "cancelled" ? "red" : order.status === "delivered" ? "green" : "neutral"}>{order.status}</StatusBadge>
              <StatusBadge tone={order.paymentStatus === "paid" ? "green" : "amber"}>{order.paymentStatus}</StatusBadge>
              <StatusBadge tone={order.shipmentStatus === "delivered" ? "green" : "amber"}>{order.shipmentStatus}</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-[#665d50]">{new Date(order.createdAt).toLocaleString("es-AR")}</p>
          </div>
          <p className="text-3xl font-black text-ink">{formatMoney(order.totalCents)}</p>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_1.2fr]">
          <section className="rounded-md border border-line bg-[#fbfaf6] p-4">
            <h2 className="font-black text-ink">Cliente</h2>
            <p className="mt-2 text-sm font-semibold">{order.customerName}</p>
            <p className="text-sm text-[#665d50]">{order.customerEmail}</p>
            {order.shippingAddress.phone ? (
              <a
                href={adminWhatsappUrl(order.shippingAddress.phone, order.orderNumber)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-[#caa55c] bg-white px-3 text-sm font-bold text-ink transition hover:bg-[#f8f1e3]"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
            ) : null}
          </section>

          <section className="rounded-md border border-line bg-[#fbfaf6] p-4">
            <h2 className="font-black text-ink">Contacto y envío</h2>
            <div className="mt-2 space-y-1 text-sm text-[#665d50]">
              <p>{order.shippingAddress.phone ? `Teléfono: ${order.shippingAddress.phone}` : "Sin teléfono"}</p>
              <p>{order.shippingAddress.street ?? "Sin dirección"}</p>
              <p>{[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode].filter(Boolean).join(", ")}</p>
              <p>{order.shippingAddress.country ?? ""}</p>
              {order.shippingAddress.reference ? <p>Referencia: {order.shippingAddress.reference}</p> : null}
            </div>
          </section>

          <section className="rounded-md border border-line bg-[#fbfaf6] p-4">
            <h2 className="font-black text-ink">Productos</h2>
            <div className="mt-2 divide-y divide-line rounded-md border border-line bg-white">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 p-3 text-sm">
                  <span>
                    {item.productName} <span className="text-[#756b5d]">{item.variantLabel} x {item.quantity}</span>
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
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" className="mt-3 h-10">
              Guardar
            </Button>
          </form>

          <form action={updateShipmentStatus} className="rounded-md border border-line p-4">
            <input type="hidden" name="orderId" value={order.id} />
            <label>
              <span className="mb-1 block text-sm font-bold">Estado de envío</span>
              <select name="shipmentStatus" defaultValue={order.shipmentStatus} className="h-10 w-full rounded-md border border-line px-2 text-sm">
                {shipmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" className="mt-3 h-10">
              Guardar
            </Button>
          </form>

          <form action={updateOrderNotes} className="rounded-md border border-line p-4">
            <input type="hidden" name="orderId" value={order.id} />
            <label>
              <span className="mb-1 block text-sm font-bold">Notas internas</span>
              <textarea name="notes" defaultValue={order.notes ?? ""} className="min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" />
            </label>
            <Button variant="secondary" className="mt-3 h-10">
              Guardar
            </Button>
          </form>
        </div>
      </article>
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
