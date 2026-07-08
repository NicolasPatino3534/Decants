import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Gauge,
  History,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  SprayCan,
  SunMedium,
  Truck,
} from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { AddToCartPanel } from "@/components/product/add-to-cart-panel";
import { ButtonLink } from "@/components/ui/button";
import { brand, whatsappUrl } from "@/lib/brand";
import { getProductBySlug, getProducts } from "@/lib/data/products";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { sizeGuide } from "@/lib/site-content";
import type { Product } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };

  const firstVariant = product.variants[0];
  const sizes = product.variants.map((variant) => `${variant.sizeMl}ml`).join(", ");

  return {
    title: `${product.name} ${product.brand.name} decant ${sizes}`,
    description: `${buildDescriptor(product)} Disponible en decants ${sizes}${firstVariant ? ` desde ${formatMoney(firstVariant.priceCents)}` : ""}.`,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      title: `${product.name} - ${product.brand.name} | ${brand.displayName}`,
      description: buildDescriptor(product),
      url: `/producto/${product.slug}`,
      images: [{ url: product.imageUrl, alt: `${product.name} decant` }],
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const products = await getProducts();
  const relatedCandidates = getRelatedProducts(product, products);
  const visibleRelated = (relatedCandidates.length ? relatedCandidates : products.filter((item) => item.id !== product.id)).slice(0, 3);
  const firstVariant = product.variants[0];
  const lastVariant = product.variants[product.variants.length - 1] ?? firstVariant;
  const profile = getScentProfile(product);
  const descriptor = buildDescriptor(product);
  const siteUrl = env.siteUrl.replace(/\/$/, "");
  const productUrl = `${siteUrl}/producto/${product.slug}`;
  const jsonLd = buildJsonLd(product, productUrl);

  return (
    <main className="premium-shell pb-24 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#6f6658]" aria-label="Breadcrumb">
          <Link href="/catalogo" className="hover:text-[#9a6f24]">Catalogo</Link>
          <ChevronRight size={15} />
          <Link href={`/catalogo?q=${encodeURIComponent(product.brand.name)}`} className="hover:text-[#9a6f24]">{product.brand.name}</Link>
          <ChevronRight size={15} />
          <span className="text-ink">{product.name}</span>
        </nav>
      </div>

      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(390px,0.72fr)] lg:px-8 lg:py-9">
        <section>
          <div className="relative min-h-[360px] overflow-hidden rounded-md border border-line bg-mist shadow-[0_8px_18px_rgba(11,13,15,0.12)] lg:min-h-[620px]">
            <Image
              src={product.imageUrl}
              alt={`${product.name} decant`}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 54vw, 100vw"
              className="object-cover"
            />
            <div className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8c682b] backdrop-blur">
              {product.brand.name}
            </div>
            <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
              {[product.family.name, product.concentration, `${firstVariant?.sizeMl ?? 2}ml+`].map((label) => (
                <div key={label} className="rounded-md border border-white/50 bg-white/90 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#6f5522] shadow-sm backdrop-blur">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex flex-col lg:sticky lg:top-28 lg:h-fit">
          <div className="order-2 mt-4 rounded-md border border-line bg-white p-5 shadow-[0_8px_18px_rgba(24,20,14,0.08)] sm:p-6 lg:order-1 lg:mt-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8c682b]">
              <span>{product.family.name}</span>
              <span>/</span>
              <span>{labelGender(product.gender)}</span>
            </div>
            <h1 className="font-display mt-3 text-4xl leading-tight text-ink sm:text-5xl">{product.name}</h1>
            <p className="mt-2 text-base font-semibold text-[#5f574c]">
              {product.brand.name} - {product.concentration}
            </p>
            <p className="mt-4 text-lg font-black leading-7 text-ink">{descriptor}</p>
            {firstVariant ? (
              <p className="font-display mt-4 text-2xl text-ink">
                {formatMoney(firstVariant.priceCents)} - {formatMoney(lastVariant.priceCents)}
              </p>
            ) : null}
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <MiniSignal label="Uso" value={profile.occasion} tone="teal" />
              <MiniSignal label="Temporada" value={profile.season} tone="rose" />
              <MiniSignal label="Perfil" value={profile.wearer} tone="clay" />
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:mt-4">
            <AddToCartPanel product={product} />
          </div>

          <div className="order-3 mt-4 grid gap-2 sm:grid-cols-3">
            <span className="flex items-center justify-center gap-2 rounded-md border border-line bg-white p-3 text-xs font-bold text-[#7a5a20]">
              <BadgeCheck size={15} /> Original verificado
            </span>
            <span className="flex items-center justify-center gap-2 rounded-md border border-line bg-white p-3 text-xs font-bold text-[#28756f]">
              <ShieldCheck size={15} /> Stock por ml
            </span>
            <span className="flex items-center justify-center gap-2 rounded-md border border-line bg-white p-3 text-xs font-bold text-[#8b4963]">
              <Truck size={15} /> Envio coordinado
            </span>
          </div>

          <div className="order-4 mt-4 rounded-md border border-line bg-[#fbf7ed] p-4">
            <p className="flex items-center gap-2 text-sm font-black text-[#7a5a20]">
              <Sparkles size={17} /> Compra rapida, con contexto suficiente
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6f6658]">
              Elegi ml y cantidad arriba. Abajo queda el detalle olfativo para comparar sin perder de vista la compra.
            </p>
          </div>
        </aside>
      </div>

      <section className="border-y border-line bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="grid gap-4">
            <article className="rounded-md border border-line bg-[#fbfaf6] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Resumen olfativo</p>
              <h2 className="font-display mt-2 text-4xl text-ink">Lo importante antes de probarlo</h2>
              <p className="mt-4 text-sm leading-7 text-[#4f493f]">{buildScentStory(product)}</p>
            </article>
            <article className="rounded-md border border-line bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#28756f]">
                <History size={16} /> Relato olfativo
              </p>
              <h2 className="font-display mt-2 text-3xl text-ink">Para quien es este decant</h2>
              <p className="mt-4 text-sm leading-7 text-[#5f574c]">{buildBehindStory(product)}</p>
            </article>
          </div>

          <div className="grid gap-4">
            <div className="rounded-md border border-line bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Notas</p>
                  <h2 className="font-display mt-2 text-3xl text-ink">Lectura por etapas</h2>
                </div>
                <SprayCan className="text-[#8b4963]" size={24} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <NoteList title="Salida" notes={product.notesTop} />
                <NoteList title="Corazon" notes={product.notesHeart} />
                <NoteList title="Fondo" notes={product.notesBase} />
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-line bg-[#f8f8f6] p-4 sm:grid-cols-2">
              <ProfileMeter icon={<Clock3 size={17} />} label="Duracion estimada" value={profile.longevity} percent={profile.longevityPercent} />
              <ProfileMeter icon={<Gauge size={17} />} label="Proyeccion" value={profile.projection} percent={profile.projectionPercent} />
              <ProfileFact icon={<SunMedium size={17} />} label="Estacion" value={profile.season} />
              <ProfileFact icon={<CalendarDays size={17} />} label="Ocasion" value={profile.occasion} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Elegir tamano</p>
          <h2 className="font-display mt-2 text-4xl text-ink">Cuanto probar segun tu intencion</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {sizeGuide.map((item) => (
              <article key={item.size} className="rounded-md border border-line bg-white p-5">
                <p className="font-display text-4xl text-ink">{item.size}</p>
                <h3 className="mt-3 font-black text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f574c]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#28756f]">Como llega</p>
          <h2 className="font-display mt-2 text-4xl text-ink">Atomizador listo para identificar</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ProfileFact icon={<PackageCheck size={18} />} label="Rotulo" value="Nombre y tamano visibles para no confundir decants." />
            <ProfileFact icon={<ShieldCheck size={18} />} label="Control" value="Se revisa stock y estado antes de preparar el pedido." />
            <ProfileFact icon={<Truck size={18} />} label="Proteccion" value="Embalaje cuidado para retiro o envio coordinado." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-md border border-line bg-white p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="font-display text-3xl text-ink">Tenes dudas sobre este perfume?</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f574c]">Consulta por el perfil, la intensidad o el tamano que mas te conviene.</p>
          </div>
          <ButtonLink href={whatsappUrl(`Hola DecantsCBA, quiero consultar por ${product.name} de ${product.brand.name}.`)} variant="secondary" className="mt-5 sm:mt-0">
            <MessageCircle size={17} /> Consultar por WhatsApp
          </ButtonLink>
        </div>
      </section>

      {visibleRelated.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Tambien podria gustarte</p>
              <h2 className="font-display mt-2 text-4xl text-ink">Comparar por familia, nota o marca</h2>
            </div>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRelated.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function NoteList({ title, notes }: { title: string; notes: string[] }) {
  return (
    <div className="rounded-md border border-line bg-mist p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8c682b]">{title}</p>
      {notes.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-[#6f6658]">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#6f6658]">Consultar</p>
      )}
    </div>
  );
}

function MiniSignal({ label, value, tone }: { label: string; value: string; tone: "teal" | "rose" | "clay" }) {
  const toneClass = {
    teal: "accent-teal",
    rose: "accent-rose",
    clay: "accent-clay",
  }[tone];

  return (
    <div className="rounded-md border border-line bg-mist p-3">
      <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>{label}</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#4f493f]">{value}</p>
    </div>
  );
}

function ProfileMeter({ icon, label, value, percent }: { icon: React.ReactNode; label: string; value: string; percent: number }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-black text-ink">
        <span className="text-[#8a611c]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm text-[#5f574c]">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full bg-[#b8872f]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ProfileFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-black text-ink">
        <span className="text-[#b88939]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#5f574c]">{value}</p>
    </div>
  );
}

function getScentProfile(product: Product) {
  const family = product.family.name.toLowerCase();
  const concentration = product.concentration.toLowerCase();
  const notes = [...product.notesTop, ...product.notesHeart, ...product.notesBase].join(" ").toLowerCase();
  const intense =
    concentration.includes("extrait") ||
    family.includes("oud") ||
    family.includes("ambar") ||
    family.includes("cuero") ||
    notes.includes("tabaco") ||
    notes.includes("vainilla");
  const fresh = family.includes("citr") || family.includes("floral") || family.includes("almizcl") || notes.includes("bergamota") || notes.includes("limon");

  return {
    longevity: product.durationEstimate || (intense ? "8+ horas orientativas" : "5 a 7 horas orientativas"),
    longevityPercent: intense ? 88 : 68,
    projection: product.projectionEstimate || (intense ? "Media alta" : "Media suave"),
    projectionPercent: intense ? 82 : 58,
    season: product.recommendedSeason || (intense ? "Noche, otono e invierno" : fresh ? "Dia, primavera y verano" : "Todo el ano"),
    occasion: product.recommendedOccasion || (intense ? "Salidas, eventos y uso nocturno" : "Oficina, dia y uso frecuente"),
    wearer: product.gender === "unisex" ? "Quien busca una firma versatil" : product.gender === "feminine" ? "Perfil pulido, suave y luminoso" : "Perfil intenso, seco y elegante",
  };
}

function buildDescriptor(product: Product) {
  const notes = [...product.notesTop, ...product.notesHeart, ...product.notesBase].slice(0, 3);
  const occasion = getScentProfile(product).occasion.toLowerCase();
  return `${notes.length ? notes.join(", ") : product.family.name} para ${occasion}`;
}

function buildScentStory(product: Product) {
  const profile = getScentProfile(product);
  const notes = [...product.notesTop, ...product.notesHeart, ...product.notesBase].slice(0, 4).join(", ");
  return `${product.name} se entiende mejor en piel: abre con ${notes || product.family.name.toLowerCase()} y deja un perfil ${product.family.name.toLowerCase()} pensado para ${profile.occasion.toLowerCase()}. El decant te permite probar rendimiento, evolucion y comodidad antes de invertir en el frasco completo.`;
}

function buildBehindStory(product: Product) {
  return `${product.brand.name} queda ubicado dentro de ${product.family.name.toLowerCase()}, con una lectura ${labelGender(product.gender).toLowerCase()} y ${product.concentration}. Si ya conoces perfumes similares, este decant sirve para comparar matices, duracion y presencia sin depender solo de una descripcion tecnica.`;
}

function getRelatedProducts(product: Product, products: Product[]) {
  const productNotes = new Set([...product.notesTop, ...product.notesHeart, ...product.notesBase].map((note) => note.toLowerCase()));

  return products
    .filter((item) => item.id !== product.id)
    .map((item) => {
      const sharedNotes = [...item.notesTop, ...item.notesHeart, ...item.notesBase].filter((note) => productNotes.has(note.toLowerCase())).length;
      const score = Number(item.family.slug === product.family.slug) * 4 + Number(item.brand.slug === product.brand.slug) * 3 + sharedNotes;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => item);
}

function buildJsonLd(product: Product, productUrl: string) {
  const availability = product.variants.some((variant) => variant.stockOnHand > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: buildDescriptor(product),
      image: product.imageUrl,
      brand: {
        "@type": "Brand",
        name: product.brand.name,
      },
      offers: product.variants.map((variant) => ({
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "ARS",
        price: (variant.priceCents / 100).toFixed(2),
        availability: variant.stockOnHand > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      })),
      aggregateOffer: product.variants.length
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "ARS",
            lowPrice: (Math.min(...product.variants.map((variant) => variant.priceCents)) / 100).toFixed(2),
            highPrice: (Math.max(...product.variants.map((variant) => variant.priceCents)) / 100).toFixed(2),
            offerCount: product.variants.length,
            availability,
          }
        : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Catalogo", item: `${env.siteUrl.replace(/\/$/, "")}/catalogo` },
        { "@type": "ListItem", position: 2, name: product.brand.name, item: `${env.siteUrl.replace(/\/$/, "")}/catalogo?q=${encodeURIComponent(product.brand.name)}` },
        { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
      ],
    },
  ];
}

function labelGender(value: Product["gender"]) {
  if (value === "feminine") return "Mujer";
  if (value === "masculine") return "Hombre";
  return "Unisex";
}
