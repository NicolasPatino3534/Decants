import Link from "next/link";
import { ArrowRight, ClipboardList, PackageSearch, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { getAdminDashboard } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";

export default async function AdminBalancePage() {
  const { orders, products, revenue } = await getAdminDashboard();
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const orderCount = orders.length;
  const paidOrderCount = paidOrders.length;
  const averageTicket = paidOrderCount > 0 ? Math.round(revenue / paidOrderCount) : 0;
  const now = new Date();
  const currentMonthRevenue = paidOrders
    .filter((order) => {
      const date = new Date(order.createdAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    })
    .reduce((sum, order) => sum + order.totalCents, 0);
  const lastSevenDaysRevenue = paidOrders
    .filter((order) => now.getTime() - new Date(order.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6f24]">Balance</p>
          <h1 className="mt-2 text-3xl font-black text-ink">Ingresos y ventas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#665d50]">
            Resumen básico para revisar ventas sin sumar secciones fuera del alcance del panel temporal.
          </p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<TrendingUp size={19} />} label="Ingresos totales" value={formatMoney(revenue)} helper="Pedidos con pago confirmado" />
        <Kpi icon={<ClipboardList size={19} />} label="Cantidad de pedidos" value={String(orderCount)} helper={`${paidOrderCount} pagos confirmados`} />
        <Kpi icon={<WalletCards size={19} />} label="Ticket promedio" value={formatMoney(averageTicket)} helper="Sobre pedidos pagados" />
        <Kpi icon={<ReceiptText size={19} />} label="Ingresos del mes" value={formatMoney(currentMonthRevenue)} helper="Periodo calendario actual" />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-lg font-black text-ink">Resumen de ventas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Summary label="Últimos 7 días" value={formatMoney(lastSevenDaysRevenue)} />
            <Summary label="Productos en catálogo" value={String(products.length)} />
            <Summary label="Pedidos pendientes" value={String(orders.filter((order) => order.paymentStatus !== "paid").length)} />
            <Summary label="Pedidos entregados" value={String(orders.filter((order) => order.status === "delivered").length)} />
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-lg font-black text-ink">Accesos del panel</h2>
          <div className="mt-4 grid gap-3">
            <AdminLink href="/admin/pedidos" icon={<ClipboardList size={18} />} title="Pedidos" text="Ver pedidos y entrar al detalle." />
            <AdminLink href="/admin/catalogo" icon={<PackageSearch size={18} />} title="Catálogo" text="Ver productos y editar datos." />
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-5">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-[#f6edda] text-[#8a611c]">{icon}</div>
      <p className="mt-4 text-sm font-bold text-[#665d50]">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
      <p className="mt-2 text-xs font-semibold text-[#756b5d]">{helper}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-[#fbfaf6] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#756b5d]">{label}</p>
      <p className="mt-2 text-xl font-black text-ink">{value}</p>
    </div>
  );
}

function AdminLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-4 rounded-md border border-line p-4 transition hover:border-[#caa55c] hover:bg-[#fbf7ed]">
      <span className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white">{icon}</span>
        <span>
          <span className="block font-black text-ink">{title}</span>
          <span className="mt-1 block text-sm text-[#665d50]">{text}</span>
        </span>
      </span>
      <ArrowRight size={17} />
    </Link>
  );
}
