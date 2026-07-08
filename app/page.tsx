import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
  LockKeyhole,
  MessageCircle,
  PackageCheck,
  Search,
  Sparkles,
  SprayCan,
  Star,
  Truck,
} from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { ButtonLink } from "@/components/ui/button";
import { brand, whatsappUrl } from "@/lib/brand";
import { getProducts } from "@/lib/data/products";
import { env } from "@/lib/env";
import { discoverySets, editorialGuides, faqItems, occasionLinks, sizeGuide, trustHighlights } from "@/lib/site-content";

const reviews = [
  {
    name: "Camila R.",
    context: "Cordoba, compro florales para comparar, marzo 2026",
    text: "Me ayudo a elegir sin comprar a ciegas. Llegaron prolijos, rotulados y con el seguimiento claro.",
  },
  {
    name: "Andres M.",
    context: "Cordoba, probo un set fresco de oficina, abril 2026",
    text: "La recomendacion fue concreta: perfumes limpios, sin invadir. Termine encontrando uno para todos los dias.",
  },
  {
    name: "Valentina P.",
    context: "Interior de Cordoba, compro 5ml y 10ml, mayo 2026",
    text: "El pedido llego protegido y cada atomizador estaba identificado. Se nota el cuidado antes de despachar.",
  },
];

export default async function HomePage() {
  const products = await getProducts();
  const featuredPool = products.filter((product) => product.featured);
  const featuredProducts = (featuredPool.length ? featuredPool : products).slice(0, 6);
  const brands = Array.from(new Map(products.map((product) => [product.brand.slug, product.brand])).values()).slice(0, 6);
  const heroImage = featuredProducts[0]?.imageUrl ?? brand.logoUrl;
  const siteUrl = env.siteUrl.replace(/\/$/, "");
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.displayName,
    url: siteUrl,
    logo: brand.logoUrl,
    email: brand.email,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+549${brand.whatsapp}`,
      contactType: "customer service",
      areaServed: "AR",
      availableLanguage: "es",
    },
  };

  return (
    <main className="premium-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <section className="overflow-hidden border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:min-h-[690px] lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-7 flex items-center gap-3">
              <span className="relative h-14 w-14 overflow-hidden rounded-md border border-line bg-white">
                <Image src={brand.logoUrl} alt="" fill sizes="56px" className="object-contain p-1" />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8c682b]">{brand.tagline}</p>
            </div>
            <h1 className="font-display text-5xl leading-[1.02] tracking-normal text-ink sm:text-6xl lg:text-7xl">
              {brand.displayName}: proba perfumes originales antes del frasco completo
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#514a40]">
              Decants en 2ml, 5ml y 10ml para comparar en piel, entender notas y comprar con menos duda. Atencion directa desde Cordoba.
            </p>
            <form action="/catalogo" className="mt-8 grid gap-3 rounded-md border border-line bg-white p-2 shadow-[0_10px_28px_rgba(11,13,15,0.08)] sm:grid-cols-[1fr_auto]">
              <label className="relative">
                <span className="sr-only">Buscar perfume</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#81786b]" size={18} />
                <input
                  name="q"
                  placeholder="Buscar por perfume, marca, ocasion o nota"
                  className="h-12 w-full rounded-md border border-transparent bg-mist pl-10 pr-3 text-sm font-semibold text-ink outline-none focus:border-[#b88939]"
                />
              </label>
              <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#b8872f] px-5 text-sm font-bold text-white transition hover:bg-[#9f7225]">
                Explorar catalogo <ArrowRight size={17} />
              </button>
            </form>
            <div className="mt-8 grid gap-3 border-y border-line py-5 text-sm text-[#5f574c] sm:grid-cols-3">
              <p><span className="block font-display text-3xl text-ink">{products.length || "+40"}</span> decants visibles</p>
              <p><span className="block font-display text-3xl text-ink">24h</span> preparacion estimada</p>
              <p><span className="block font-display text-3xl text-ink">3</span> tamanos para probar</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/catalogo" className="h-12">
                Ver catalogo <ArrowRight size={17} />
              </ButtonLink>
              <ButtonLink href={whatsappUrl("Hola DecantsCBA, quiero ayuda para elegir un decant.")} variant="secondary" className="h-12">
                <MessageCircle size={17} /> Pedir recomendacion
              </ButtonLink>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-md border border-line bg-mist shadow-[0_24px_70px_rgba(11,13,15,0.12)] sm:min-h-[560px]">
            <Image
              src={heroImage}
              alt="Decants originales de perfumes"
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-x-4 bottom-4 grid gap-3 rounded-md border border-white/70 bg-white/90 p-4 backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8c682b]">Seleccion de julio</p>
                <p className="mt-1 font-semibold text-ink">Vainillas, tabacos y frescos limpios para invierno en Cordoba.</p>
              </div>
              <ButtonLink href="/catalogo?q=invierno%20vainilla" variant="champagne" className="h-10 whitespace-nowrap">
                Ver seleccion <ChevronRight size={16} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section id="confianza" className="border-b border-line bg-[#f8f8f6] py-6">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {trustHighlights.map((item, index) => (
            <Proof
              key={item.title}
              icon={index === 0 ? <BadgeCheck size={19} /> : index === 1 ? <LockKeyhole size={19} /> : <PackageCheck size={19} />}
              title={item.title}
              text={item.text}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Seleccion mensual</p>
            <h2 className="font-display mt-2 text-4xl tracking-normal text-ink sm:text-5xl">Decants para decidir mejor</h2>
            <p className="mt-3 max-w-2xl leading-7 text-[#5f574c]">Julio esta curado alrededor de climas frios, vainillas, tabacos y algun fresco limpio para oficina.</p>
          </div>
          <ButtonLink href="/catalogo" variant="secondary">
            Ver todo el catalogo <ArrowRight size={17} />
          </ButtonLink>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.slice(0, 6).map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 3} />
          ))}
        </div>
      </section>

      <section id="situaciones" className="border-y border-line bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Compra por situacion</p>
              <h2 className="font-display mt-2 text-4xl leading-tight text-ink sm:text-5xl">Elegir por uso, no solo por marca</h2>
              <p className="mt-4 leading-7 text-[#5f574c]">
                La forma mas simple de descubrir perfumes es empezar por el momento: oficina, noche, cita, calor, invierno o regalo.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {occasionLinks.map((item) => (
                <ButtonLink
                  key={item.title}
                  href={`/ocasiones/${item.slug}`}
                  variant="subtle"
                  className="h-auto min-h-[136px] items-start justify-between p-4 text-left"
                >
                  <span>
                    <span className="block font-display text-2xl text-ink">{item.title}</span>
                    <span className="mt-2 block text-sm font-semibold leading-6 text-[#5f574c]">{item.text}</span>
                    <span className="mt-3 block text-xs font-bold uppercase tracking-[0.1em] text-[#8c682b]">{item.notes}</span>
                  </span>
                  <ArrowRight className="mt-1 shrink-0" size={18} />
                </ButtonLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="discovery-sets" className="border-b border-line bg-[#fbfaf6] py-16">
        <div className="mx-auto grid max-w-7xl gap-9 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Sets de descubrimiento</p>
            <h2 className="font-display mt-2 text-4xl leading-tight text-ink sm:text-5xl">Menos duda, mejor compra</h2>
            <p className="mt-4 leading-7 text-[#5f574c]">
              Agrupamos familias que se comparan bien entre si. La compra final se arma desde catalogo, con stock real por variante.
            </p>
            <ButtonLink href="/catalogo?q=set" className="mt-7">
              Explorar sets <ArrowRight size={17} />
            </ButtonLink>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {discoverySets.map((pack) => (
              <article key={pack.title} className="rounded-md border border-line bg-white p-5">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-[#b8872f] text-white">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-display mt-5 text-2xl text-ink">{pack.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5f574c]">{pack.text}</p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {pack.includes.map((item) => (
                    <span key={item} className="rounded-md bg-[#f6edda] px-2.5 py-1 text-xs font-bold text-[#7a5a20]">
                      {item}
                    </span>
                  ))}
                </div>
                <ButtonLink href={`/catalogo?q=${encodeURIComponent(pack.query)}`} variant="subtle" className="mt-5 w-full">
                  Ver perfiles <ArrowRight size={16} />
                </ButtonLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="marcas" className="border-b border-line bg-white py-16 text-ink">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Marcas destacadas</p>
              <h2 className="font-display mt-2 text-4xl sm:text-5xl">Casas para explorar por perfil</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#665d50]">Una seleccion corta transmite curaduria. El catalogo completo mantiene filtros simples para profundizar.</p>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(brands.length ? brands : [{ name: "Al Haramain", slug: "al-haramain" }, { name: "Armaf", slug: "armaf" }, { name: "Lattafa", slug: "lattafa" }]).map((brandItem) => (
              <ButtonLink key={brandItem.slug} href={`/marcas/${brandItem.slug}`} variant="subtle" className="h-20 justify-between px-5">
                <span className="font-display text-2xl">{brandItem.name}</span>
                <ArrowRight size={18} />
              </ButtonLink>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Como funciona</p>
            <h2 className="font-display mt-2 text-4xl text-ink sm:text-5xl">Probar antes de invertir</h2>
            <p className="mt-4 leading-7 text-[#5f574c]">Una compra de decants funciona mejor cuando sabes que tamano elegir y como llega el pedido.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Step icon={<SprayCan size={18} />} title="Elegis" text="Busca por nota, marca, ocasion y tamano." />
            <Step icon={<Clock3 size={18} />} title="Preparamos" text="Armamos cada atomizador con rotulo y control." />
            <Step icon={<Truck size={18} />} title="Recibis" text="Coordinamos entrega o envio con seguimiento." />
          </div>
        </div>
        <div id="tamanos" className="mt-8 grid gap-4 md:grid-cols-3">
          {sizeGuide.map((item) => (
            <article key={item.size} className="rounded-md border border-line bg-white p-5">
              <p className="font-display text-4xl text-ink">{item.size}</p>
              <h3 className="mt-3 font-black text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5f574c]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-[#f8f8f6] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Reviews con contexto</p>
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
                <p className="mt-1 text-xs font-semibold text-[#7b7164]">{review.context}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">FAQ</p>
          <h2 className="font-display mt-2 text-4xl text-ink sm:text-5xl">Comprar decants con claridad</h2>
          <ButtonLink href="/faq" variant="secondary" className="mt-6">
            Ver FAQ completa <ArrowRight size={17} />
          </ButtonLink>
        </div>
        <div className="divide-y divide-line rounded-md border border-line bg-white">
          {faqItems.slice(0, 6).map((faq) => (
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

      <section className="border-t border-line bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {editorialGuides.map((guide) => (
            <ButtonLink key={guide.title} href={guide.href} variant="subtle" className="h-auto min-h-[132px] items-start justify-between p-5 text-left">
              <span>
                <span className="block font-display text-2xl text-ink">{guide.title}</span>
                <span className="mt-2 block text-sm font-semibold leading-6 text-[#5f574c]">{guide.text}</span>
              </span>
              <ArrowRight className="mt-1 shrink-0" size={18} />
            </ButtonLink>
          ))}
        </div>
      </section>
    </main>
  );
}

function Proof({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-line bg-white p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#b8872f] text-white">{icon}</div>
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
      <div className="grid h-10 w-10 place-items-center rounded-md bg-[#f6edda] text-[#8a611c]">{icon}</div>
      <p className="mt-5 font-black text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f6658]">{text}</p>
    </div>
  );
}
