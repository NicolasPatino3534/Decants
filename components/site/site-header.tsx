"use client";

import Image from "next/image";
import Link from "next/link";
import { HelpCircle, Menu, Search, ShieldCheck, ShoppingCart, Truck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { brand } from "@/lib/brand";

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/catalogo", label: "Catalogo" },
    { href: "/#situaciones", label: "Situaciones" },
    { href: "/#discovery-sets", label: "Sets" },
    { href: "/como-comprar", label: "Como comprar" },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-xl">
      <div className="hidden border-b border-line bg-mist lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-xs font-semibold text-amber">
          <span className="flex items-center gap-2">
            <ShieldCheck size={14} /> Decants originales, rotulados y con stock visible
          </span>
          <span className="flex items-center gap-2">
            <Truck size={14} /> Envios a todo el pais, retiro en Cordoba y atencion por WhatsApp
          </span>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[76px] lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-ink" onClick={() => setOpen(false)}>
          <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-md border border-line bg-white">
            <Image src={brand.logoUrl} alt={brand.name} fill sizes="40px" className="object-contain p-1" />
          </span>
          <span>
            <span className="font-display block text-xl font-semibold leading-none tracking-normal">{brand.displayName}</span>
            <span className="theme-muted mt-1 hidden text-[11px] font-bold uppercase tracking-[0.18em] sm:block">Perfumes originales</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-bold text-ink lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[#9a6f24]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="hidden lg:inline-flex">
            <ButtonLink href="/catalogo" variant="subtle" className="h-10 px-3" aria-label="Buscar perfumes">
              <Search size={18} />
            </ButtonLink>
          </span>
          <span className="hidden lg:inline-flex">
            <ButtonLink href="/contacto" variant="subtle" className="h-10 px-3" aria-label="Contacto">
              <HelpCircle size={18} />
            </ButtonLink>
          </span>
          <span className="hidden lg:inline-flex">
            <ButtonLink href="/auth" variant="subtle" className="h-10 px-3" aria-label="Cuenta">
              <UserRound size={18} />
            </ButtonLink>
          </span>
          <ButtonLink href="/carrito" variant="secondary" className="relative h-10 px-3" aria-label="Carrito">
            <ShoppingCart size={18} />
            {count > 0 ? (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-amber px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            ) : null}
          </ButtonLink>
          <button
            type="button"
            className="inline-grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line bg-white px-4 pb-4 shadow-[0_18px_44px_rgba(24,20,14,0.10)] lg:hidden">
          <nav className="grid gap-1 py-3 text-sm font-bold text-ink">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md px-3 py-3 hover:bg-mist" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link href="/cuenta" className="rounded-md px-3 py-3 hover:bg-mist" onClick={() => setOpen(false)}>
              Mi cuenta
            </Link>
            <Link href="/contacto" className="rounded-md px-3 py-3 hover:bg-mist" onClick={() => setOpen(false)}>
              Contacto
            </Link>
          </nav>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-amber">
            <span className="rounded-md bg-mist p-3">Frascos originales</span>
            <span className="rounded-md bg-mist p-3">Pedido rotulado</span>
          </div>
        </div>
      ) : null}
    </header>
  );
}
