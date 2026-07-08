import type { Metadata } from "next";
import { BadgeCheck, MapPin, MessageCircle, PackageCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { brand, whatsappUrl } from "@/lib/brand";
import { trustHighlights } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Quienes somos",
  description: "Conoce quien esta detras de Decants.CBA y como se preparan los decants originales desde Cordoba.",
  alternates: { canonical: "/quienes-somos" },
};

export default function AboutPage() {
  return (
    <main className="premium-shell">
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Quienes somos</p>
            <h1 className="font-display mt-3 text-5xl leading-tight text-ink sm:text-6xl">Una tienda de decants con trato directo</h1>
          </div>
          <div className="max-w-3xl text-base leading-8 text-[#514a40]">
            <p>
              {brand.displayName} nace en Cordoba para que puedas probar perfumes originales antes de invertir en una botella completa. La idea es simple:
              comprar menos a ciegas, comparar mejor y recibir cada decant identificado.
            </p>
            <p className="mt-4">
              Del otro lado hay una persona revisando stock, preparando atomizadores y respondiendo consultas por WhatsApp cuando necesitas una recomendacion.
            </p>
            <ButtonLink href={whatsappUrl("Hola DecantsCBA, quiero consultar por la tienda y los decants.")} className="mt-7">
              <MessageCircle size={17} /> Hablar por WhatsApp
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {trustHighlights.map((item, index) => (
            <article key={item.title} className="rounded-md border border-line bg-white p-5">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white">
                {index === 0 ? <BadgeCheck size={18} /> : index === 1 ? <MapPin size={18} /> : <PackageCheck size={18} />}
              </div>
              <h2 className="mt-5 font-display text-2xl text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f574c]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
