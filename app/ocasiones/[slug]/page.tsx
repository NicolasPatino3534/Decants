import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { ButtonLink } from "@/components/ui/button";
import { filterProducts } from "@/lib/catalog/filters";
import { getProducts } from "@/lib/data/products";
import { occasionLinks } from "@/lib/site-content";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const occasion = occasionLinks.find((item) => item.slug === slug);
  if (!occasion) return { title: "Ocasion no encontrada" };

  return {
    title: `Decants para ${occasion.title.toLowerCase()}`,
    description: occasion.text,
    alternates: { canonical: `/ocasiones/${occasion.slug}` },
  };
}

export function generateStaticParams() {
  return occasionLinks.map((item) => ({ slug: item.slug }));
}

export default async function OccasionLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const occasion = occasionLinks.find((item) => item.slug === slug);
  if (!occasion) notFound();

  const products = filterProducts(await getProducts(), { query: occasion.query }).slice(0, 24);

  return (
    <main className="premium-shell">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#6f6658]" aria-label="Breadcrumb">
            <Link href="/catalogo" className="hover:text-[#9a6f24]">Catalogo</Link>
            <ChevronRight size={15} />
            <span className="text-ink">{occasion.title}</span>
          </nav>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Ocasion</p>
          <h1 className="font-display mt-3 max-w-4xl text-5xl leading-tight text-ink sm:text-6xl">Decants para {occasion.title.toLowerCase()}</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[#514a40]">{occasion.text}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#8c682b]">{occasion.notes}</p>
          <ButtonLink href={`/catalogo?q=${encodeURIComponent(occasion.query)}`} variant="secondary" className="mt-7">
            Ver busqueda completa <ArrowRight size={17} />
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 3} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-line bg-white p-8 text-center">
            <h2 className="font-display text-3xl text-ink">No hay resultados directos</h2>
            <p className="mt-2 text-sm text-[#6f6658]">Proba la busqueda completa en catalogo para combinar mas filtros.</p>
          </div>
        )}
      </section>
    </main>
  );
}
