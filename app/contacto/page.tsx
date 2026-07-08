import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { brand, whatsappUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contacta a Decants.CBA por WhatsApp o email para consultas sobre perfumes, decants y pedidos.",
  alternates: { canonical: "/contacto" },
};

export default function ContactPage() {
  return (
    <main className="premium-shell">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Contacto</p>
          <h1 className="font-display mt-3 max-w-4xl text-5xl leading-tight text-ink sm:text-6xl">Hablemos antes de que compres a ciegas</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[#514a40]">
            Si necesitas elegir por ocasion, comparar marcas o consultar stock, escribinos y te orientamos.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        <article className="rounded-md border border-line bg-white p-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white"><MessageCircle size={18} /></div>
          <h2 className="mt-5 font-display text-2xl text-ink">WhatsApp</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f574c]">{brand.whatsapp}</p>
          <ButtonLink href={whatsappUrl("Hola DecantsCBA, quiero hacer una consulta.")} className="mt-5 w-full">
            Escribir
          </ButtonLink>
        </article>
        <article className="rounded-md border border-line bg-white p-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white"><Mail size={18} /></div>
          <h2 className="mt-5 font-display text-2xl text-ink">Email</h2>
          <a className="mt-3 block break-all text-sm font-semibold leading-6 text-[#5f574c] hover:text-[#9a6f24]" href={`mailto:${brand.email}`}>
            {brand.email}
          </a>
        </article>
        <article className="rounded-md border border-line bg-white p-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white"><MapPin size={18} /></div>
          <h2 className="mt-5 font-display text-2xl text-ink">Ubicacion</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f574c]">{brand.location}. Retiro o entrega local con coordinacion previa.</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-[#8c682b]">{brand.instagram}</p>
        </article>
      </section>
    </main>
  );
}
