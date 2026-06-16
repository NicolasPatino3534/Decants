import Link from "next/link";
import { brand, whatsappUrl } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.5fr] lg:px-8">
        <div>
          <p className="font-display text-3xl">{brand.displayName}</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">
            {brand.tagline}. Envíos a todo el país, retiro en Córdoba y atención por WhatsApp.
          </p>
          <div className="mt-6 h-px w-32 luxury-rule" />
        </div>
        <div className="grid gap-6 text-sm text-white/70 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-white">Tienda</p>
            <Link className="mt-3 block hover:text-white" href="/catalogo">Catálogo</Link>
            <Link className="mt-2 block hover:text-white" href="/#discovery-sets">Discovery sets</Link>
            <Link className="mt-2 block hover:text-white" href="/#marcas">Marcas</Link>
          </div>
          <div>
            <p className="font-semibold text-white">Confianza</p>
            <Link className="mt-3 block hover:text-white" href="/#confianza">Compra segura</Link>
            <p className="mt-2">Originalidad verificada</p>
            <p className="mt-2">Seguimiento del envío</p>
          </div>
          <div>
            <p className="font-semibold text-white">Contacto</p>
            <a className="mt-3 block hover:text-white" href={whatsappUrl("Hola DecantsCBA, quiero hacer una consulta.")}>WhatsApp {brand.whatsapp}</a>
            <a className="mt-2 block hover:text-white" href={`mailto:${brand.email}`}>{brand.email}</a>
            <p className="mt-2">{brand.location}</p>
            <a className="mt-2 block hover:text-white" href={brand.instagramUrl}>{brand.instagram}</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/45">
        Stock visible, preparación cuidada y atención por WhatsApp para cada pedido.
      </div>
    </footer>
  );
}
