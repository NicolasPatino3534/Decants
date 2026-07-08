import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { ButtonLink } from "@/components/ui/button";
import { getProducts } from "@/lib/data/products";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const products = await getProducts();
  const brand = products.find((product) => product.brand.slug === slug)?.brand;
  if (!brand) return { title: "Marca no encontrada" };

  return {
    title: `Decants ${brand.name}`,
    description: `Explora decants de ${brand.name} disponibles por tamano, notas y stock visible.`,
    alternates: { canonical: `/marcas/${brand.slug}` },
  };
}

export async function generateStaticParams() {
  const products = await getProducts();
  return Array.from(new Set(products.map((product) => product.brand.slug))).map((slug) => ({ slug }));
}

export default async function BrandLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getProducts();
  const brand = products.find((product) => product.brand.slug === slug)?.brand;
  if (!brand) notFound();

  const brandProducts = products.filter((product) => product.brand.slug === slug);

  return (
    <main className="premium-shell">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#6f6658]" aria-label="Breadcrumb">
            <Link href="/catalogo" className="hover:text-[#9a6f24]">Catalogo</Link>
            <ChevronRight size={15} />
            <span className="text-ink">{brand.name}</span>
          </nav>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Marca</p>
          <h1 className="font-display mt-3 max-w-4xl text-5xl leading-tight text-ink sm:text-6xl">Decants {brand.name}</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[#514a40]">
            Una seleccion de {brand.name} para comparar en piel, elegir tamano y decidir si vale invertir en el frasco completo.
          </p>
          <ButtonLink href={`/catalogo?q=${encodeURIComponent(brand.name)}`} variant="secondary" className="mt-7">
            Ver en catalogo <ArrowRight size={17} />
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {brandProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 3} />
          ))}
        </div>
      </section>
    </main>
  );
}
