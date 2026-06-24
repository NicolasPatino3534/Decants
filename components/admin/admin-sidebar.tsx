"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Package, WalletCards } from "lucide-react";
import { brand } from "@/lib/brand";

const items = [
  { href: "/admin", label: "Balance", icon: WalletCards },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/catalogo", label: "Catalogo", icon: Package },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-line bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="border-b border-line p-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative h-10 w-10 overflow-hidden rounded-md border border-line bg-white">
            <Image src={brand.logoUrl} alt="" fill sizes="40px" className="object-contain p-1" />
          </span>
          <span>
            <span className="block font-display text-xl leading-none text-ink">{brand.displayName}</span>
            <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6a2f]">Admin</span>
          </span>
        </Link>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 py-3 text-sm lg:grid lg:overflow-visible lg:py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-fit items-center gap-3 rounded-md px-3 py-3 font-bold transition ${
                active ? "bg-[#b8872f] text-white" : "text-[#665d50] hover:bg-[#f8f1e3] hover:text-ink"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-3 mb-4 hidden rounded-md border border-line bg-[#fbf7ed] p-4 text-xs leading-5 text-[#665d50] lg:block">
        Panel reducido a pedidos, catalogo y balance para operar sin ruido mientras se prepara autenticacion real.
      </div>
    </aside>
  );
}
