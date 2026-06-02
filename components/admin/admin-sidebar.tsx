"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, LayoutDashboard, Package, Send, Tags, Users } from "lucide-react";

const items = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/marcas", label: "Marcas", icon: Tags },
  { href: "/admin/categorias", label: "Categorias", icon: Tags },
  { href: "/admin/stock", label: "Stock", icon: Boxes },
  { href: "/admin/envios", label: "Envios", icon: Send },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r border-[#202326] bg-ink text-white lg:min-h-screen">
      <div className="border-b border-white/10 p-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-white font-display text-xl text-ink">A</span>
          <span>
            <span className="block font-display text-xl leading-none">Aurum</span>
            <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Admin</span>
          </span>
        </Link>
      </div>
      <nav className="grid gap-1 px-3 py-4 text-sm">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-3 font-bold transition ${
                active ? "bg-white text-ink" : "text-white/68 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-3 mt-3 rounded-md border border-white/10 bg-white/[0.04] p-4 text-xs leading-5 text-white/58">
        Prioriza pedidos pagos, bajo stock y envios con demora para proteger experiencia y recompra.
      </div>
    </aside>
  );
}
