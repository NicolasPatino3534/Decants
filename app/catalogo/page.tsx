import type { Metadata } from "next";
import { CatalogClient } from "@/components/catalog/catalog-client";
import { getProducts } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Catalogo de decants",
  description: "Explora decants originales por perfume, marca, nota, ocasion, genero y tamano disponible.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const products = await getProducts();
  return <CatalogClient products={products} initialQuery={params.q ?? ""} />;
}
