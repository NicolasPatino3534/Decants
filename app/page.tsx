import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
  LockKeyhole,
  PackageCheck,
  Search,
  Sparkles,
  SprayCan,
  Star,
  Truck,
} from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { getProducts } from "@/lib/data/products";

const reviews = [
  {
    name: "Camila R.",
    text: "Compré tres decants para comparar notas florales. Llegaron prolijos, rotulados y con seguimiento claro.",
  },
  {
    name: "Andrés M.",
    text: "Me evitó comprar una botella completa a ciegas. El selector de ml hace muy fácil probar primero.",
  },
  {
    name: "Valentina P.",
    text: "La experiencia se siente cuidada: stock visible, atención rápida y el pedido llegó perfecto.",
  },
];

const packs = [
  { title: "Fresh office set", text: "Cítrico, limpio y elegante para uso diario.", notes: "Bergamota / neroli / musk" },
  { title: "Night signature set", text: "Ámbar, cuero y especias para salidas.", notes: "Canela / oud / vainilla" },
  { title: "Soft floral set", text: "Flores blancas y almizcles fáciles de usar.", notes: "Jazmín / iris / cedro" },
];

const faqs = [
  { q: "¿Qué es un decant?", a: "Una muestra fraccionada en atomizador para probar el perfume antes de comprar una botella completa." },
  { q: "¿Qué tamaño conviene?", a: "2ml para testear, 5ml para varios usos y 10ml para convivir con una fragancia antes de invertir." },
  { q: "¿Cómo se prepara el pedido?", a: "Cada variante se arma con stock controlado, rotulado y embalaje protegido para envío." },
];

export default async function HomePage() {
  const products = await getProducts();
  const featuredProducts = (products.filter((product) => product.featured).length ? products.filter((product) => product.featured) : products).slice(0, 3);
  const brands = Array.from(new Set(products.map((product) => product.brand.name))).slice(0, 6);
  const heroImage = featuredProducts[0]?.imageUrl ?? brand.logoUrl;

  return (
    <main className="premium-shell">
      <section className="overflow-hidden border-b border-line bg-white">
        <div className="mx-auto grid min-h-[calc(100svh-64px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:min-h-[690px] lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-7 flex items-center gap-3">
              <span className="relative h-14 w-14 overflow-hidden rounded-md border border-line bg-white">
                <Image src={brand.logoUrl} alt="" fill sizes="56px" className="object-contain p-1" />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8c682b]">{brand.tagline}</p>
            </div>
            <h1 className="font-display text-6xl leading-[0.94] tracking-normal text-ink sm:text-7xl lg:text-8xl">
              {brand.displayName}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#514a40] sm:text-xl">
              Descubrí tu próxima firma sin comprar a ciegas: decants originales de tus perfumes favoritos, stock visible y atención por WhatsApp.
            </p>
            <form action="/catalogo" className="mt-8 grid gap-3 rounded-md border border-line bg-white p-2 shadow-[0_20px_54px_rgba(11,13,15,0.08)] sm:grid-cols-[1fr_auto]">
              <label className="relative">
                <span className="sr-only">Buscar perfume</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#81786b]" size={18} />
                <input
                  name="q"
                  placeholder="Buscar por perfume, marca o nota"
                  className="h-12 w-full rounded-md border border-transparent bg-mist pl-10 pr-3 text-sm font-semibold text-ink outline-none focus:border-[#b88939]"
                />
              </label>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#afa466] px-5 text-sm font-bold text-[#151515] transition hover:bg-[#fcffcc]">
                Explorar catálogo <ArrowRight size={17} />
              </button>
            </form>
            <div className="mt-8 grid grid-cols-3 gap-3 border-y border-line py-5 text-sm text-[#5f574c]">
              <p><span className="block font-display text-3xl text-ink">+40</span> perfumes curados</p>
              <p><span className="block font-display text-3xl text-ink">24h</span> preparación</p>
              <p><span className="block font-display text-3xl text-ink">3</span> tamaños para probar</p>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-md border border-line bg-mist shadow-[0_30px_90px_rgba(11,13,15,0.12)] sm:min-h-[560px]">
            <Image
              src={heroImage}
              alt="Decants originales de perfumes"
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-x-4 bottom-4 grid gap-3 rounded-md border border-white/70 bg-white/88 p-4 backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c682b]">Selección recomendada</p>
                <p className="mt-1 font-semibold text-ink">Aromas frescos, intensos y limpios para comparar.</p>
              </div>
              <ButtonLink href="/catalogo" variant="champagne" className="h-10 whitespace-nowrap">
                Armar set <ChevronRight size={16} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section id="confianza" className="border-b border-line bg-[#f8f8f6] py-6">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          <Proof icon={<BadgeCheck size={19} />} title="Originalidad verificada" text="Productos curados, rotulados y preparados con control." />
          <Proof icon={<LockKeyhole size={19} />} title="Compra cuidada" text="Datos claros, stock visible y confirmación antes de avanzar." />
          <Proof icon={<PackageCheck size={19} />} title="Stock visible" text="Variantes por ml, disponibilidad y bajo stock a la vista." />
          <Proof icon={<Truck size={19} />} title="Envío coordinado" text="Seguimiento cuando el pedido pasa a preparación." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">Selección boutique</p>
            <h2 className="font-display mt-2 text-4xl tracking-normal text-ink sm:text-5xl">Decants para decidir mejor</h2>
            <p className="mt-3 max-w-2xl leading-7 text-[#5f574c]">Elegí por familia olfativa, ocasión y tamaño. Cada tarjeta está pensada para comparar rápido sin perder detalle.</p>
          </div>
          <ButtonLink href="/catalogo" variant="secondary">
            Ver todo el catálogo <ArrowRight size={17} />
          </ButtonLink>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 3} />
          ))}
        </div>
      </section>

      <section id="discovery-sets" className="border-y border-line bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-9 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">Packs de descubrimiento</p>
            <h2 className="font-display mt-2 text-4xl leading-tight text-ink sm:text-5xl">Menos duda, mejor compra.</h2>
            <p className="mt-4 leading-7 text-[#5f574c]">
              Los packs agrupan perfiles que se comparan bien entre sí: fresco diario, noche intensa y floral limpio.
            </p>
            <ButtonLink href="/catalogo" className="mt-7">
              Armar discovery set <ArrowRight size={17} />
            </ButtonLink>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {packs.map((pack) => (
              <article key={pack.title} className="rounded-md border border-line bg-[#fbfaf7] p-5">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
                  <Sparkles size={18} />
                </div>
                <h3 className="mt-5 font-display text-2xl text-ink">{pack.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5f574c]">{pack.text}</p>
                <p className="mt-4 border-t border-line pt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#7b7164]">{pack.notes}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="marcas" className="bg-ink py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d7b779]">Marcas destacadas</p>
              <h2 className="font-display mt-2 text-4xl sm:text-5xl">Casas para explorar por perfil</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/66">Una selección corta transmite curaduría. El catálogo completo mantiene filtros simples para profundizar.</p>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(brands.length ? brands : ["Al Haramain", "Armaf", "Lattafa"]).map((brandName) => (
              <a key={brandName} href="/catalogo" className="flex items-center justify-between rounded-md border border-white/14 bg-white/[0.04] p-5 transition hover:bg-white/[0.08]">
                <span className="font-display text-2xl">{brandName}</span>
                <ArrowRight size={18} />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">Cómo funciona</p>
            <h2 className="font-display mt-2 text-4xl text-ink sm:text-5xl">Probar antes de invertir</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Step icon={<SprayCan size={18} />} title="Elegís" text="Buscá por nota, marca, género y tamaño." />
            <Step icon={<Clock3 size={18} />} title="Preparamos" text="Armamos cada atomizador con rotulado y control." />
            <Step icon={<Truck size={18} />} title="Recibís" text="Seguís el estado del pedido desde tu cuenta." />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-[#f8f8f6] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">Reviews verificadas</p>
              <h2 className="font-display mt-2 text-4xl text-ink sm:text-5xl">Confianza antes de confirmar</h2>
            </div>
            <div className="flex gap-1 text-[#b88939]" aria-label="5 estrellas">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={18} fill="currentColor" />
              ))}
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.name} className="rounded-md border border-line bg-white p-5">
                <p className="text-sm leading-7 text-[#4d463d]">{review.text}</p>
                <p className="mt-5 text-sm font-black text-ink">{review.name}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">FAQ</p>
          <h2 className="font-display mt-2 text-4xl text-ink sm:text-5xl">Comprar decants con claridad</h2>
        </div>
        <div className="divide-y divide-line rounded-md border border-line bg-white">
          {faqs.map((faq) => (
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

function Proof({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-line bg-white p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-white">{icon}</div>
      <div>
        <p className="font-black text-ink">{title}</p>
        <p className="mt-1 text-sm leading-5 text-[#6f6658]">{text}</p>
      </div>
    </div>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-5">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-[#edf2ee] text-[#5f7d69]">{icon}</div>
      <p className="mt-5 font-black text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f6658]">{text}</p>
    </div>
  );
}
