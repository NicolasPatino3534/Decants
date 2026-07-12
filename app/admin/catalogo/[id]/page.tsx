import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductEditor } from "@/components/admin/product-editor";
import { getAdminBrands, getAdminCategories, getAdminProductById } from "@/lib/data/admin";

export default async function AdminCatalogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, brands, categories] = await Promise.all([getAdminProductById(id), getAdminBrands(), getAdminCategories()]);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/catalogo" className="inline-flex items-center gap-2 text-sm font-bold text-[#7a5a20] hover:text-ink">
        <ArrowLeft size={16} />
        Volver al catálogo
      </Link>
      <div className="mt-4">
        <ProductEditor product={product} brands={brands} categories={categories} />
      </div>
    </div>
  );
}
