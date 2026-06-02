import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.5fr] lg:px-8">
        <div>
          <p className="font-display text-3xl">Aurum Decants</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">
            Decants premium para descubrir perfumes de autor, comparar notas y comprar con mas certeza.
          </p>
          <div className="mt-6 h-px w-32 luxury-rule" />
        </div>
        <div className="grid gap-6 text-sm text-white/70 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-white">Tienda</p>
            <Link className="mt-3 block hover:text-white" href="/catalogo">Catalogo</Link>
            <Link className="mt-2 block hover:text-white" href="/#discovery-sets">Discovery sets</Link>
            <Link className="mt-2 block hover:text-white" href="/#marcas">Marcas</Link>
          </div>
          <div>
            <p className="font-semibold text-white">Confianza</p>
            <Link className="mt-3 block hover:text-white" href="/#confianza">Compra segura</Link>
            <p className="mt-2">Originalidad verificada</p>
            <p className="mt-2">Seguimiento del envio</p>
          </div>
          <div>
            <p className="font-semibold text-white">Soporte</p>
            <p className="mt-3">Envios</p>
            <p className="mt-2">Cambios</p>
            <p className="mt-2">Preguntas frecuentes</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/45">
        Pago protegido, stock visible y preparacion cuidada para cada pedido.
      </div>
    </footer>
  );
}
