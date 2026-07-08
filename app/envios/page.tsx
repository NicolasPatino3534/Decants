import type { Metadata } from "next";
import { MapPin, PackageCheck, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Envios",
  description: "Informacion sobre retiro en Cordoba, envios al resto del pais y preparacion de pedidos en Decants.CBA.",
  alternates: { canonical: "/envios" },
};

const options = [
  { title: "Retiro en Cordoba", text: "Coordinamos punto y horario por WhatsApp cuando el pedido esta listo.", icon: <MapPin size={18} /> },
  { title: "Envio al pais", text: "Despachamos con datos completos y seguimiento para que puedas ubicar tu pedido.", icon: <Truck size={18} /> },
  { title: "Pedido protegido", text: "Cada atomizador va rotulado y embalado para reducir golpes o filtraciones.", icon: <PackageCheck size={18} /> },
];

export default function ShippingPage() {
  return (
    <main className="premium-shell">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Envios</p>
          <h1 className="font-display mt-3 max-w-4xl text-5xl leading-tight text-ink sm:text-6xl">Entrega clara desde Cordoba</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[#514a40]">
            La entrega se informa con datos visibles y coordinacion directa. Los tiempos pueden variar segun zona y disponibilidad logistica.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        {options.map((option) => (
          <article key={option.title} className="rounded-md border border-line bg-white p-5">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white">{option.icon}</div>
            <h2 className="mt-5 font-display text-2xl text-ink">{option.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#5f574c]">{option.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
