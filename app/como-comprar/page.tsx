import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, MessageCircle, PackageCheck, Search, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { brand, whatsappUrl } from "@/lib/brand";
import { sizeGuide } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Como comprar",
  description: "Guia para elegir un decant, comparar tamanos, agregar al carrito y coordinar la entrega con Decants.CBA.",
  alternates: { canonical: "/como-comprar" },
};

const steps = [
  { title: "Busca", text: "Explora por perfume, marca, nota u ocasion desde el catalogo.", icon: <Search size={18} /> },
  { title: "Elegi ml", text: "Selecciona 2ml, 5ml o 10ml segun cuanto quieras probar.", icon: <CheckCircle2 size={18} /> },
  { title: "Confirmamos", text: "Revisamos stock, datos y preparacion antes de avanzar.", icon: <PackageCheck size={18} /> },
  { title: "Recibis", text: "Coordinamos retiro en Cordoba o envio con seguimiento.", icon: <Truck size={18} /> },
];

export default function HowToBuyPage() {
  return (
    <main className="premium-shell">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Como comprar</p>
          <h1 className="font-display mt-3 max-w-4xl text-5xl leading-tight text-ink sm:text-6xl">Elegir decants deberia sentirse simple</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[#514a40]">
            En {brand.displayName} la compra esta pensada para comparar perfiles, elegir tamano y resolver dudas antes de confirmar.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((step) => (
            <article key={step.title} className="rounded-md border border-line bg-white p-5">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white">{step.icon}</div>
              <h2 className="mt-5 font-display text-2xl text-ink">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f574c]">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="tamanos" className="border-y border-line bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Guia de tamano</p>
              <h2 className="font-display mt-2 text-4xl text-ink">2ml, 5ml o 10ml</h2>
            </div>
            <ButtonLink href="/catalogo" variant="secondary">
              Ir al catalogo <ArrowRight size={17} />
            </ButtonLink>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {sizeGuide.map((item) => (
              <article key={item.size} className="rounded-md border border-line bg-[#fbfaf7] p-5">
                <p className="font-display text-4xl text-ink">{item.size}</p>
                <h3 className="mt-3 font-black text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f574c]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-md border border-line bg-white p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="font-display text-3xl text-ink">No sabes por donde empezar?</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f574c]">Contanos que usas, para que ocasion lo queres y que estilos no te gustan.</p>
          </div>
          <ButtonLink href={whatsappUrl("Hola DecantsCBA, quiero ayuda para elegir mi primer decant.")} className="mt-5 sm:mt-0">
            <MessageCircle size={17} /> Pedir ayuda
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
