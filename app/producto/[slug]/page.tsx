import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Gauge,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Star,
  SunMedium,
  Truck,
} from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { AddToCartPanel } from "@/components/product/add-to-cart-panel";
import { getProductBySlug, getProducts } from "@/lib/data/products";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product)
    return {
      title: "Producto no encontrado",
      robots: { index: false, follow: false },
    };

  return {
    title: `${product.name} de ${product.brand.name}`,
    description: product.description,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} de ${product.brand.name}`,
      description: product.description,
      images: [{ url: product.imageUrl, alt: `${product.name} decant` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} de ${product.brand.name}`,
      description: product.description,
      images: [product.imageUrl],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const products = await getProducts();
  const related = products
    .filter(
      (item) =>
        item.id !== product.id && item.family.slug === product.family.slug,
    )
    .slice(0, 3);
  const fallbackRelated = products
    .filter((item) => item.id !== product.id)
    .slice(0, 3);
  const visibleRelated = related.length ? related : fallbackRelated;
  const firstVariant = product.variants[0];
  const lastVariant =
    product.variants[product.variants.length - 1] ?? firstVariant;
  const availableStock = product.variants.reduce(
    (total, variant) => total + Math.max(variant.stockOnHand, 0),
    0,
  );
  const profile = getScentProfile(product);
  const availableSizeLabel = Array.from(
    new Set(product.variants.map((variant) => variant.sizeMl)),
  )
    .sort((a, b) => a - b)
    .map((size) => `${size}ml`)
    .join(", ");
  const descriptionParagraphs = splitDescription(product.description);
  const firstAvailableVariant =
    product.variants.find((variant) => variant.stockOnHand > 0) ??
    product.variants[0];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [product.imageUrl],
    description: product.description,
    sku: firstAvailableVariant?.sku,
    brand: { "@type": "Brand", name: product.brand.name },
    offers: firstAvailableVariant
      ? {
          "@type": "Offer",
          priceCurrency: "ARS",
          price: (firstAvailableVariant.priceCents / 100).toFixed(2),
          availability: product.variants.some(
            (variant) => variant.stockOnHand > 0,
          )
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: `${env.siteUrl.replace(/\/$/, "")}/producto/${product.slug}`,
        }
      : undefined,
  };

  return (
    <main className="premium-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.86fr)] xl:gap-12">
            <section
              aria-label="Imagen del producto"
              className="min-w-0 space-y-4"
            >
              <div className="group relative aspect-[4/5] min-h-[360px] overflow-hidden rounded-md border border-line bg-[var(--surface-strong)] shadow-[var(--shadow-lifted)] sm:min-h-[520px] lg:max-h-[700px]">
                <Image
                  src={product.imageUrl}
                  alt={`${product.name} decant`}
                  fill
                  priority
                  loading="eager"
                  sizes="(min-width: 1024px) 54vw, 100vw"
                  className="object-contain p-5 transition-transform duration-[var(--motion-slow)] ease-[var(--ease-premium)] group-hover:scale-[1.02]"
                />
                <div className="absolute left-4 top-4 rounded-md border border-white/20 bg-black/45 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                  {product.brand.name}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <Attribute label="Familia" value={product.family.name} />
                <Attribute
                  label="Concentración"
                  value={product.concentration}
                />
                <Attribute
                  label="Tamaños"
                  value={
                    product.variants.length > 0
                      ? product.variants
                          .map((variant) => `${variant.sizeMl}ml`)
                          .join(" / ")
                      : "Pendiente"
                  }
                />
                <Attribute
                  label="Stock"
                  value={
                    availableStock > 0
                      ? `${availableStock} unidades`
                      : "Sin stock"
                  }
                />
              </div>
            </section>

            <aside className="min-w-0 space-y-5 lg:sticky lg:top-28">
              <section className="rounded-md border border-line bg-paper p-5 shadow-soft sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-muted)]">
                  <span>{product.family.name}</span>
                  <span aria-hidden="true">/</span>
                  <span>{formatGender(product.gender)}</span>
                </div>
                <h1 className="font-display mt-3 text-4xl leading-tight text-ink sm:text-5xl">
                  {product.name}
                </h1>
                <p className="mt-3 text-base font-semibold text-muted">
                  {product.brand.name} · {product.concentration}
                </p>
                {firstVariant ? (
                  <div className="mt-5 rounded-md bg-warm p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-soft">
                      Precio
                    </p>
                    <p className="font-display mt-1 text-3xl text-ink">
                      {formatMoney(firstVariant.priceCents)}
                      {lastVariant && firstVariant.id !== lastVariant.id
                        ? ` - ${formatMoney(lastVariant.priceCents)}`
                        : ""}
                    </p>
                  </div>
                ) : null}
              </section>

              <AddToCartPanel product={product} />

              <div className="grid gap-2 rounded-md border border-line bg-warm p-4 text-sm font-semibold text-[var(--accent-muted)] sm:grid-cols-3">
                <span className="flex items-center gap-2">
                  <BadgeCheck size={16} /> Originalidad verificada
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck size={16} /> Compra segura
                </span>
                <span className="flex items-center gap-2">
                  <Truck size={16} /> Envío con tracking
                </span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper py-12 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
              Descripción
            </p>
            <h2 className="font-display mt-2 text-4xl leading-tight text-ink sm:text-5xl">
              La ficha olfativa, con más aire
            </h2>
          </div>
          <div className="space-y-4 text-base leading-8 text-muted">
            {descriptionParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
                Notas y atributos
              </p>
              <h2 className="font-display mt-2 text-4xl text-ink">
                Cómo evoluciona en piel
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <NoteList title="Salida" notes={product.notesTop} />
              <NoteList title="Corazón" notes={product.notesHeart} />
              <NoteList title="Fondo" notes={product.notesBase} />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ProfileMeter
              icon={<Clock3 size={17} />}
              label="Duración estimada"
              value={profile.longevity}
              percent={profile.longevityPercent}
            />
            <ProfileMeter
              icon={<Gauge size={17} />}
              label="Proyección"
              value={profile.projection}
              percent={profile.projectionPercent}
            />
            <ProfileFact
              icon={<SunMedium size={17} />}
              label="Estación"
              value={profile.season}
            />
            <ProfileFact
              icon={<CalendarDays size={17} />}
              label="Ocasión"
              value={profile.occasion}
            />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
                Perfil de usuario
              </p>
              <h2 className="font-display mt-2 text-4xl text-ink">
                Para quién es este decant
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <ProfileFact
                icon={<SprayCan size={18} />}
                label="Perfil"
                value={profile.wearer}
              />
              <ProfileFact
                icon={<Sparkles size={18} />}
                label="Mejor uso"
                value={profile.occasion}
              />
              <ProfileFact
                icon={<Star size={18} />}
                label="Recomendación"
                value={
                  availableSizeLabel
                    ? `Presentaciones: ${availableSizeLabel}`
                    : "Consultá disponibilidad"
                }
              />
            </div>
          </div>
        </div>
      </section>

      {visibleRelated.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
                También podría gustarte
              </p>
              <h2 className="font-display mt-2 text-4xl text-ink">
                Comparar antes de decidir
              </h2>
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

function Attribute({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-soft">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function NoteList({ title, notes }: { title: string; notes: string[] }) {
  return (
    <div className="rounded-md border border-line bg-paper p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-muted)]">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {notes.length > 0 ? (
          notes.map((note) => <li key={note}>{note}</li>)
        ) : (
          <li>Sin notas cargadas</li>
        )}
      </ul>
    </div>
  );
}

function ProfileMeter({
  icon,
  label,
  value,
  percent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div className="rounded-md border border-line bg-paper p-4">
      <div className="flex items-center gap-2 text-sm font-black text-ink">
        <span className="text-amber">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm text-muted">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist">
        <div
          className="h-full rounded-full bg-amber"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ProfileFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-line bg-paper p-4">
      <div className="flex items-center gap-2 text-sm font-black text-ink">
        <span className="text-amber">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{value}</p>
    </div>
  );
}

function getScentProfile(product: Product) {
  const family = product.family.name.toLowerCase();
  const concentration = product.concentration.toLowerCase();
  const intense =
    concentration.includes("extrait") ||
    family.includes("oud") ||
    family.includes("ámbar") ||
    family.includes("ambar") ||
    family.includes("cuero");
  const fresh =
    family.includes("cítr") ||
    family.includes("citr") ||
    family.includes("floral") ||
    family.includes("almizcl");

  return {
    longevity:
      product.durationEstimate ||
      (intense ? "8+ horas orientativas" : "5 a 7 horas orientativas"),
    longevityPercent: intense ? 88 : 68,
    projection:
      product.projectionEstimate || (intense ? "Media alta" : "Media suave"),
    projectionPercent: intense ? 82 : 58,
    season:
      product.recommendedSeason ||
      (intense
        ? "Noche, otoño e invierno"
        : fresh
          ? "Día, primavera y verano"
          : "Todo el año"),
    occasion:
      product.recommendedOccasion ||
      (intense
        ? "Salidas, eventos y uso nocturno"
        : "Oficina, día y uso frecuente"),
    wearer:
      product.gender === "unisex"
        ? "Quien busca una firma versátil"
        : product.gender === "feminine"
          ? "Perfil pulido, suave y luminoso"
          : "Perfil intenso, seco y elegante",
  };
}

function formatGender(gender: Product["gender"]) {
  if (gender === "feminine") return "Mujer";
  if (gender === "masculine") return "Hombre";
  return "Unisex";
}

function splitDescription(description: string) {
  if (description.length < 320) return [description];

  const sentences = description.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [
    description,
  ];
  const midpoint = Math.ceil(sentences.length / 2);
  const first = sentences.slice(0, midpoint).join(" ").trim();
  const second = sentences.slice(midpoint).join(" ").trim();
  return [first, second].filter(Boolean);
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
