import type { Metadata } from "next";
import { ChevronRight, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/brand";
import { faqItems } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Preguntas frecuentes sobre decants originales, tamanos, preparacion, envios y reclamos.",
  alternates: { canonical: "/faq" },
};

export default function FAQPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main className="premium-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">FAQ</p>
          <h1 className="font-display mt-3 max-w-4xl text-5xl leading-tight text-ink sm:text-6xl">Respuestas antes de comprar</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[#514a40]">
            Reunimos las dudas mas comunes para que puedas comprar decants con contexto y sin sorpresas.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
        <aside className="h-fit rounded-md border border-line bg-white p-5 lg:sticky lg:top-28">
          <h2 className="font-display text-3xl text-ink">Necesitas ayuda puntual?</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f574c]">Si una respuesta no alcanza, escribinos con el perfume o situacion que tenes en mente.</p>
          <ButtonLink href={whatsappUrl("Hola DecantsCBA, tengo una duda sobre los decants.")} className="mt-5 w-full">
            <MessageCircle size={17} /> Consultar
          </ButtonLink>
        </aside>
        <div className="divide-y divide-line rounded-md border border-line bg-white">
          {faqItems.map((faq) => (
            <details key={faq.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink">
                {faq.q}
                <ChevronRight className="transition group-open:rotate-90" size={18} />
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f574c]">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
