import type { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { editorialGuides } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Guias",
  description: "Guias ligeras para elegir decants por tamano, ocasion y notas olfativas.",
  alternates: { canonical: "/guias" },
};

export default function GuidesPage() {
  return (
    <main className="premium-shell">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Guias</p>
          <h1 className="font-display mt-3 max-w-4xl text-5xl leading-tight text-ink sm:text-6xl">Elegir perfume con mas criterio</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[#514a40]">Puntos de partida para descubrir perfiles por uso, tamano y familia olfativa.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        {editorialGuides.map((guide) => (
          <ButtonLink key={guide.title} href={guide.href} variant="subtle" className="h-auto min-h-[160px] items-start justify-between p-5 text-left">
            <span>
              <span className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white"><BookOpen size={18} /></span>
              <span className="mt-5 block font-display text-2xl text-ink">{guide.title}</span>
              <span className="mt-2 block text-sm font-semibold leading-6 text-[#5f574c]">{guide.text}</span>
            </span>
            <ArrowRight className="mt-1 shrink-0" size={18} />
          </ButtonLink>
        ))}
      </section>
    </main>
  );
}
