import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, Clock3, Gauge, ShieldCheck, Sparkles, SprayCan, Star, SunMedium, Truck } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { AddToCartPanel } from "@/components/product/add-to-cart-panel";
import { getProductBySlug, getProducts } from "@/lib/data/products";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const products = await getProducts();
  const related = products.filter((item) => item.id !== product.id && item.family.slug === product.family.slug).slice(0, 3);
  const fallbackRelated = products.filter((item) => item.id !== product.id).slice(0, 3);
  const visibleRelated = related.length ? related : fallbackRelated;
  const firstVariant = product.variants[0];
  const lastVariant = product.variants[product.variants.length - 1] ?? firstVariant;
  const profile = getScentProfile(product);

  return (
    <main className="premium-shell">
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-12">
        <section>
          <div className="relative min-h-[430px] overflow-hidden rounded-md border border-line bg-mist shadow-[0_24px_76px_rgba(11,13,15,0.12)] lg:min-h-[650px]">
            <Image
              src={product.imageUrl}
              alt={`${product.name} decant`}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
            <div className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8c682b] backdrop-blur">
              {product.brand.name}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[product.family.name, product.concentration, `${firstVariant?.sizeMl ?? 2}ml+`].map((label) => (
              <div key={label} className="rounded-md border border-line bg-white p-3 text-center text-xs font-bold uppercase tracking-[0.1em] text-[#6f6658]">
                {label}
              </div>
            ))}
          </div>
        </section>

        <section className="lg:pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8c682b]">
            <span>{product.family.name}</span>
            <span>/</span>
            <span>{product.gender}</span>
          </div>
          <h1 className="font-display mt-4 text-5xl leading-tight text-ink sm:text-6xl">{product.name}</h1>
          <p className="mt-3 text-lg font-semibold text-[#5f574c]">
            {product.brand.name} · {product.concentration}
          </p>
          {firstVariant ? (
            <p className="font-display mt-6 text-3xl text-ink">
              {formatMoney(firstVariant.priceCents)} - {formatMoney(lastVariant.priceCents)}
            </p>
          ) : null}
          <p className="mt-6 text-base leading-8 text-[#4f493f]">{product.description}</p>

          <div className="mt-6 grid gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-3">
            <NoteList title="Salida" notes={product.notesTop} />
            <NoteList title="Corazon" notes={product.notesHeart} />
            <NoteList title="Fondo" notes={product.notesBase} />
          </div>

          <div className="mt-5 grid gap-3 rounded-md border border-line bg-[#f8f8f6] p-4 sm:grid-cols-2">
            <ProfileMeter icon={<Clock3 size={17} />} label="Duracion estimada" value={profile.longevity} percent={profile.longevityPercent} />
            <ProfileMeter icon={<Gauge size={17} />} label="Proyeccion" value={profile.projection} percent={profile.projectionPercent} />
            <ProfileFact icon={<SunMedium size={17} />} label="Estacion" value={profile.season} />
            <ProfileFact icon={<CalendarDays size={17} />} label="Ocasion" value={profile.occasion} />
          </div>

          <div className="mt-5 grid gap-2 rounded-md border border-[#dfe8df] bg-[#f5faf6] p-4 text-sm font-semibold text-[#47624f] sm:grid-cols-3">
            <span className="flex items-center gap-2"><BadgeCheck size={16} /> Originalidad verificada</span>
            <span className="flex items-center gap-2"><ShieldCheck size={16} /> Pago seguro</span>
            <span className="flex items-center gap-2"><Truck size={16} /> Envio con tracking</span>
          </div>

          <div className="mt-6">
            <AddToCartPanel product={product} />
          </div>
        </section>
      </div>

      <section className="border-t border-line bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">Perfil de usuario</p>
              <h2 className="font-display mt-2 text-4xl text-ink">Para quien es este decant</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <ProfileFact icon={<SprayCan size={18} />} label="Perfil" value={profile.wearer} />
              <ProfileFact icon={<Sparkles size={18} />} label="Mejor uso" value={profile.occasion} />
              <ProfileFact icon={<Star size={18} />} label="Recomendacion" value="Empieza con 2ml o compara con 5ml" />
            </div>
          </div>
        </div>
      </section>

      {visibleRelated.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8c682b]">Tambien podria gustarte</p>
              <h2 className="font-display mt-2 text-4xl text-ink">Comparar antes de decidir</h2>
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
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c682b]">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-[#6f6658]">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

function ProfileMeter({ icon, label, value, percent }: { icon: React.ReactNode; label: string; value: string; percent: number }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-black text-ink">
        <span className="text-[#5f7d69]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm text-[#5f574c]">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full bg-[#5f7d69]" style={{ width: `${percent}%` }} />
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
  const intense = concentration.includes("extrait") || family.includes("oud") || family.includes("ambar") || family.includes("cuero");
  const fresh = family.includes("citr") || family.includes("floral") || family.includes("almizcl");

  return {
    longevity: intense ? "8+ horas orientativas" : "5 a 7 horas orientativas",
    longevityPercent: intense ? 88 : 68,
    projection: intense ? "Media alta" : "Media suave",
    projectionPercent: intense ? 82 : 58,
    season: intense ? "Noche, otono e invierno" : fresh ? "Dia, primavera y verano" : "Todo el ano",
    occasion: intense ? "Salidas, eventos y uso nocturno" : "Oficina, dia y uso frecuente",
    wearer: product.gender === "unisex" ? "Quien busca una firma versatil" : product.gender === "feminine" ? "Perfil pulido, suave y luminoso" : "Perfil intenso, seco y elegante",
  };
}
