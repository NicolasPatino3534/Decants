import Link from "next/link";
import { brand, whatsappUrl } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:px-8">
        <div className="min-w-0">
          <p className="font-display text-3xl">{brand.displayName}</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#665d50]">
            {brand.tagline}. Envios a todo el pais, retiro en Cordoba y atencion por WhatsApp.
          </p>
          <div className="mt-6 h-px w-32 luxury-rule" />
        </div>
        <div className="grid min-w-0 gap-6 text-sm text-[#665d50] sm:grid-cols-[repeat(3,minmax(0,1fr))]">
          <div className="min-w-0">
            <p className="font-semibold text-ink">Tienda</p>
            <Link className="mt-3 block hover:text-[#9a6f24]" href="/catalogo">Catalogo</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/#discovery-sets">Discovery sets</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/#marcas">Marcas</Link>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Confianza</p>
            <Link className="mt-3 block hover:text-[#9a6f24]" href="/#confianza">Compra segura</Link>
            <p className="mt-2">Originalidad verificada</p>
            <p className="mt-2">Seguimiento del envio</p>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Contacto</p>
            <a className="mt-3 block hover:text-[#9a6f24]" href={whatsappUrl("Hola DecantsCBA, quiero hacer una consulta.")}>WhatsApp {brand.whatsapp}</a>
            <a className="mt-2 block break-all hover:text-[#9a6f24]" href={`mailto:${brand.email}`}>{brand.email}</a>
            <p className="mt-2">{brand.location}</p>
            <a className="mt-2 block hover:text-[#9a6f24]" href={brand.instagramUrl}>{brand.instagram}</a>
          </div>
        </div>
      </div>
      <div className="border-t border-line bg-[#fbfaf6] px-4 py-4 text-center text-xs text-[#756b5d]">
        Stock visible, preparacion cuidada y atencion por WhatsApp para cada pedido.
      </div>
    </footer>
  );
}
