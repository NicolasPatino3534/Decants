import type { Metadata } from "next";
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
  Truck,
} from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { ButtonLink } from "@/components/ui/button";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { SplitSection } from "@/components/ui/split-section";
import { brand } from "@/lib/brand";
import { getProducts } from "@/lib/data/products";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const packs = [
  {
    title: "Set fresco de oficina",
    text: "Cítrico, limpio y elegante para uso diario.",
    notes: "Bergamota / neroli / musk",
  },
  {
    title: "Set de noche",
    text: "Ámbar, cuero y especias para salidas.",
    notes: "Canela / oud / vainilla",
  },
  {
    title: "Set floral suave",
    text: "Flores blancas y almizcles fáciles de usar.",
    notes: "Jazmín / iris / cedro",
  },
];

const faqs = [
  {
    q: "¿Qué es un decant?",
    a: "Una muestra fraccionada en atomizador para probar el perfume antes de comprar una botella completa.",
  },
  {
    q: "¿Qué tamaño conviene?",
    a: "3ml para testear, 5ml para varios usos y 10ml para convivir con una fragancia antes de invertir.",
  },
  {
    q: "¿Cómo se prepara el pedido?",
    a: "Cada variante se arma con stock controlado, rotulado y embalaje protegido para envío.",
  },
];

export default async function HomePage() {
  const products = await getProducts();
  const featuredProducts = (
    products.filter((product) => product.featured).length
      ? products.filter((product) => product.featured)
      : products
  ).slice(0, 3);
  const brands = Array.from(
    new Set(products.map((product) => product.brand.name)),
  ).slice(0, 6);
  const heroImage = featuredProducts[0]?.imageUrl ?? brand.logoUrl;

  return (
    <main className="premium-shell">
      <section className="overflow-hidden border-b border-line bg-paper">
        <div
          className="premium-split mx-auto min-h-[calc(100svh-64px)] max-w-7xl px-4 py-10 sm:px-6 lg:min-h-[690px] lg:px-8"
          data-split-section
          data-reverse="false"
        >
          <MotionReveal
            className="premium-split__content max-w-2xl"
            data-split-content
          >
            <div className="mb-7 flex items-center gap-3">
              <span className="relative h-14 w-14 overflow-hidden rounded-md border border-line bg-paper">
                <Image
                  src={brand.logoUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-muted)]">
                {brand.tagline}
              </p>
            </div>
            <h1 className="font-display text-6xl leading-[0.94] tracking-normal text-ink sm:text-7xl lg:text-8xl">
              {brand.displayName}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted sm:text-xl">
              Descubrí tu próxima firma sin comprar a ciegas: decants originales
              de tus perfumes favoritos, stock visible y atención por WhatsApp.
            </p>
            <form
              action="/catalogo"
              className="mt-8 grid gap-3 rounded-md border border-line bg-paper p-2 shadow-soft sm:grid-cols-[1fr_auto]"
            >
              <label className="relative">
                <span className="sr-only">Buscar perfume</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft"
                  size={18}
                />
                <input
                  name="q"
                  placeholder="Buscar por perfume, marca o nota"
                  className="h-12 w-full rounded-md border border-transparent bg-mist pl-10 pr-3 text-sm font-semibold text-ink outline-none focus:border-amber"
                />
              </label>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-amber px-5 text-sm font-bold text-[var(--on-accent)] transition hover:bg-[var(--accent-hover)]">
                Explorar catálogo <ArrowRight size={17} />
              </button>
            </form>
            <div className="mt-8 grid grid-cols-3 gap-3 border-y border-line py-5 text-sm text-muted">
              <p>
                <span className="font-display block text-3xl text-ink">
                  +40
                </span>{" "}
                perfumes curados
              </p>
              <p>
                <span className="font-display block text-3xl text-ink">
                  24h
                </span>{" "}
                preparación
              </p>
              <p>
                <span className="font-display block text-3xl text-ink">3</span>{" "}
                tamaños para probar
              </p>
            </div>
          </MotionReveal>

          <MotionReveal
            delay={80}
            className="premium-split__visual"
            data-split-visual
          >
            <div className="relative min-h-[420px] overflow-hidden rounded-md border border-line bg-[var(--surface-strong)] shadow-[var(--shadow-lifted)] sm:min-h-[560px]">
              <Image
                src={heroImage}
                alt="Decants originales de perfumes"
                fill
                priority
                loading="eager"
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-contain object-center"
              />
              <div className="absolute inset-x-4 bottom-4 grid gap-3 rounded-md border border-line bg-paper/90 p-4 backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-muted)]">
                    Selección recomendada
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    Aromas frescos, intensos y limpios para comparar.
                  </p>
                </div>
                <ButtonLink
                  href="/catalogo"
                  variant="champagne"
                  className="h-10 whitespace-nowrap"
                >
                  Armar set <ChevronRight size={16} />
                </ButtonLink>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      <section id="confianza" className="border-b border-line bg-mist py-6">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          <Proof
            icon={<BadgeCheck size={19} />}
            title="Originalidad verificada"
            text="Productos curados, rotulados y preparados con control."
          />
          <Proof
            icon={<LockKeyhole size={19} />}
            title="Compra cuidada"
            text="Datos claros, stock visible y confirmación antes de avanzar."
          />
          <Proof
            icon={<PackageCheck size={19} />}
            title="Stock visible"
            text="Variantes por ml, disponibilidad y bajo stock a la vista."
          />
          <Proof
            icon={<Truck size={19} />}
            title="Envío coordinado"
            text="Seguimiento cuando el pedido pasa a preparación."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <MotionReveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
              Selección boutique
            </p>
            <h2 className="font-display mt-2 text-4xl tracking-normal text-ink sm:text-5xl">
              Decants para decidir mejor
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-muted">
              Elegí por familia olfativa, ocasión y tamaño. Cada tarjeta está
              pensada para comparar rápido sin perder detalle.
            </p>
          </div>
          <ButtonLink href="/catalogo" variant="secondary">
            Ver todo el catálogo <ArrowRight size={17} />
          </ButtonLink>
        </MotionReveal>
        <MotionReveal
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          delay={80}
        >
          {featuredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 3}
            />
          ))}
        </MotionReveal>
      </section>

      <section
        id="discovery-sets"
        className="border-y border-line bg-paper py-16"
      >
        <div
          className="premium-split premium-split--content-left mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          data-split-section
          data-reverse="true"
        >
          <MotionReveal className="premium-split__content" data-split-content>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
              Packs de descubrimiento
            </p>
            <h2 className="font-display mt-2 text-4xl leading-tight text-ink sm:text-5xl">
              Menos duda, mejor compra.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Los packs agrupan perfiles que se comparan bien entre sí: fresco
              diario, noche intensa y floral limpio.
            </p>
            <ButtonLink href="/catalogo" className="mt-7">
              Armar discovery set <ArrowRight size={17} />
            </ButtonLink>
          </MotionReveal>
          <MotionReveal
            delay={80}
            className="premium-split__visual grid gap-4 md:grid-cols-3"
            data-split-visual
          >
            {packs.map((pack) => (
              <article
                key={pack.title}
                className="rounded-md border border-line bg-mist p-5"
              >
                <div className="grid h-10 w-10 place-items-center rounded-md bg-amber text-[var(--on-accent)]">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-display mt-5 text-2xl text-ink">
                  {pack.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{pack.text}</p>
                <p className="mt-4 border-t border-line pt-4 text-xs font-bold uppercase tracking-[0.12em] text-soft">
                  {pack.notes}
                </p>
              </article>
            ))}
          </MotionReveal>
        </div>
      </section>

      <section
        id="marcas"
        className="border-y border-line bg-paper py-16 text-ink"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
                Marcas destacadas
              </p>
              <h2 className="font-display mt-2 text-4xl sm:text-5xl">
                Casas para explorar por perfil
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted">
              Una selección corta transmite curaduría. El catálogo completo
              mantiene filtros simples para profundizar.
            </p>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(brands.length ? brands : ["Al Haramain", "Armaf", "Lattafa"]).map(
              (brandName) => (
                <a
                  key={brandName}
                  href="/catalogo"
                  className="flex items-center justify-between rounded-md border border-line bg-mist p-5 transition hover:border-[var(--border-strong)] hover:bg-warm"
                >
                  <span className="font-display text-2xl">{brandName}</span>
                  <ArrowRight size={18} />
                </a>
              ),
            )}
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div
          className="premium-split gap-8"
          data-split-section
          data-reverse="false"
        >
          <MotionReveal className="premium-split__content" data-split-content>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
              Cómo funciona
            </p>
            <h2 className="font-display mt-2 text-4xl text-ink sm:text-5xl">
              Probar antes de invertir
            </h2>
          </MotionReveal>
          <MotionReveal
            delay={80}
            className="premium-split__visual grid gap-4 sm:grid-cols-3"
            data-split-visual
          >
            <Step
              icon={<SprayCan size={18} />}
              title="Elegís"
              text="Buscá por nota, marca, género y tamaño."
            />
            <Step
              icon={<Clock3 size={18} />}
              title="Preparamos"
              text="Armamos cada atomizador con rotulado y control."
            />
            <Step
              icon={<Truck size={18} />}
              title="Recibís"
              text="Seguís el estado del pedido desde tu cuenta."
            />
          </MotionReveal>
        </div>
      </section>

      <section
        id="faq"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <SplitSection
          reverse
          content={
            <MotionReveal>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-muted)]">
                FAQ
              </p>
              <h2 className="font-display mt-2 text-4xl text-ink sm:text-5xl">
                Comprar decants con claridad
              </h2>
            </MotionReveal>
          }
          visual={
            <MotionReveal
              delay={80}
              className="divide-y divide-line rounded-md border border-line bg-paper"
            >
              {faqs.map((faq) => (
                <details key={faq.q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink">
                    {faq.q}
                    <ChevronRight
                      className="transition-transform duration-[var(--motion-base)] ease-[var(--ease-premium)] group-open:rotate-90"
                      size={18}
                    />
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                    {faq.a}
                  </p>
                </details>
              ))}
            </MotionReveal>
          }
        />
      </section>
    </main>
  );
}

function Proof({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-line bg-paper p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber text-[var(--on-accent)]">
        {icon}
      </div>
      <div>
        <p className="font-black text-ink">{title}</p>
        <p className="mt-1 text-sm leading-5 text-muted">{text}</p>
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-md border border-line bg-paper p-5">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-warm text-[var(--accent-muted)]">
        {icon}
      </div>
      <p className="mt-5 font-black text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
