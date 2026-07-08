import Link from "next/link";
import { brand, whatsappUrl } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:px-8">
        <div className="min-w-0">
          <p className="font-display text-3xl">{brand.displayName}</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#665d50]">
            {brand.tagline}. Cada decant se entrega rotulado, protegido y con stock confirmado antes de avanzar.
          </p>
          <div className="mt-6 h-px w-32 luxury-rule" />
        </div>
        <div className="grid min-w-0 gap-6 text-sm text-[#665d50] sm:grid-cols-[repeat(4,minmax(0,1fr))]">
          <div className="min-w-0">
            <p className="font-semibold text-ink">Tienda</p>
            <Link className="mt-3 block hover:text-[#9a6f24]" href="/catalogo">Catalogo</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/#situaciones">Situaciones</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/#discovery-sets">Sets</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/guias">Guias</Link>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Confianza</p>
            <Link className="mt-3 block hover:text-[#9a6f24]" href="/quienes-somos">Quienes somos</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/como-comprar">Como comprar</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/faq">FAQ</Link>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Ayuda</p>
            <Link className="mt-3 block hover:text-[#9a6f24]" href="/envios">Envios</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/devoluciones">Devoluciones</Link>
            <Link className="mt-2 block hover:text-[#9a6f24]" href="/contacto">Contacto</Link>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Contacto</p>
            <a className="mt-3 block hover:text-[#9a6f24]" href={whatsappUrl("Hola DecantsCBA, quiero hacer una consulta.")}>WhatsApp {brand.whatsapp}</a>
            <a className="mt-2 block break-all hover:text-[#9a6f24]" href={`mailto:${brand.email}`}>{brand.email}</a>
            <p className="mt-2">{brand.location}</p>
            {brand.instagramUrl ? (
              <a className="mt-2 block hover:text-[#9a6f24]" href={brand.instagramUrl}>{brand.instagram}</a>
            ) : (
              <p className="mt-2">{brand.instagram}</p>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-line bg-[#fbfaf6] px-4 py-4 text-center text-xs text-[#756b5d]">
        Stock visible, preparacion cuidada, atomizadores rotulados y atencion por WhatsApp para cada pedido.
      </div>
    </footer>
  );
}
