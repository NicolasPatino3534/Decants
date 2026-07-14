import Link from "next/link";
import { brand, whatsappUrl } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:px-8">
        <div className="min-w-0">
          <p className="font-display text-3xl">{brand.displayName}</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            {brand.tagline}. Envíos a todo el país, retiro en Córdoba y atención
            por WhatsApp.
          </p>
          <div className="mt-6 h-px w-32 luxury-rule" />
        </div>
        <div className="grid min-w-0 gap-6 text-sm text-muted sm:grid-cols-[repeat(3,minmax(0,1fr))]">
          <div className="min-w-0">
            <p className="font-semibold text-ink">Tienda</p>
            <Link className="mt-3 block hover:text-amber" href="/catalogo">
              Catálogo
            </Link>
            <Link
              className="mt-2 block hover:text-amber"
              href="/#discovery-sets"
            >
              Sets de descubrimiento
            </Link>
            <Link className="mt-2 block hover:text-amber" href="/#marcas">
              Marcas
            </Link>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Confianza</p>
            <Link className="mt-3 block hover:text-amber" href="/#confianza">
              Compra segura
            </Link>
            <p className="mt-2">Originalidad verificada</p>
            <p className="mt-2">Seguimiento del envío</p>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Contacto</p>
            <a
              className="mt-3 block hover:text-amber"
              href={whatsappUrl("Hola DecantsCBA, quiero hacer una consulta.")}
            >
              WhatsApp {brand.whatsapp}
            </a>
            <a
              className="mt-2 block break-all hover:text-amber"
              href={`mailto:${brand.email}`}
            >
              {brand.email}
            </a>
            <p className="mt-2">{brand.location}</p>
            <a
              className="mt-2 block hover:text-amber"
              href={brand.instagramUrl}
            >
              {brand.instagram}
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-line bg-mist px-4 py-4 text-center text-xs text-soft">
        Stock visible, preparación cuidada y atención por WhatsApp para cada
        pedido.
      </div>
    </footer>
  );
}
