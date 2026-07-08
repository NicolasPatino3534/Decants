import type { Metadata } from "next";
import { AlertCircle, Camera, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Devoluciones y reclamos",
  description: "Politica visible para problemas de entrega, roturas o productos equivocados en Decants.CBA.",
  alternates: { canonical: "/devoluciones" },
};

export default function ReturnsPage() {
  return (
    <main className="premium-shell">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Devoluciones y reclamos</p>
          <h1 className="font-display mt-3 max-w-4xl text-5xl leading-tight text-ink sm:text-6xl">Que hacer si algo llega mal</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[#514a40]">
            Por higiene y seguridad, los decants no se cambian por gusto personal una vez abiertos. Si hubo rotura, filtracion o error de preparacion, lo revisamos.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        <article className="rounded-md border border-line bg-white p-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white"><AlertCircle size={18} /></div>
          <h2 className="mt-5 font-display text-2xl text-ink">Avisanos rapido</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f574c]">Escribinos dentro de las 48 horas de recibido para poder revisar el estado del pedido.</p>
        </article>
        <article className="rounded-md border border-line bg-white p-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white"><Camera size={18} /></div>
          <h2 className="mt-5 font-display text-2xl text-ink">Mandanos fotos</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f574c]">Inclui fotos del paquete, atomizador, etiqueta y cualquier perdida visible.</p>
        </article>
        <article className="rounded-md border border-line bg-white p-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white"><MessageCircle size={18} /></div>
          <h2 className="mt-5 font-display text-2xl text-ink">Lo resolvemos por WhatsApp</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f574c]">Te respondemos con el paso siguiente segun el caso y la evidencia recibida.</p>
        </article>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <ButtonLink href={whatsappUrl("Hola DecantsCBA, necesito hacer un reclamo sobre mi pedido.")}>
          <MessageCircle size={17} /> Iniciar reclamo
        </ButtonLink>
      </section>
    </main>
  );
}
