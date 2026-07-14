import type { Metadata } from "next";
import { CatalogClient } from "@/components/catalog/catalog-client";
import { getProducts } from "@/lib/data/products";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const initialQuery = params.q ?? "";
  const products = await getProducts({ query: initialQuery });
  return <CatalogClient products={products} initialQuery={initialQuery} />;
}
export const metadata: Metadata = {
  title: "Catálogo de decants",
  description:
    "Explorá decants originales por perfume, marca, familia olfativa y tamaño.",
  alternates: { canonical: "/catalogo" },
};
