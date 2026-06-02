import { CatalogClient } from "@/components/catalog/catalog-client";
import { getProducts } from "@/lib/data/products";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const products = await getProducts();
  return <CatalogClient products={products} initialQuery={params.q ?? ""} />;
}
