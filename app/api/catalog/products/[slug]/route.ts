import { NextResponse } from "next/server";
import { fetchProductBySlugFromSupabase } from "@/lib/data/products";
import { demoProducts } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const product = demoProducts.find((item) => item.slug === slug) ?? null;
    return product ? NextResponse.json({ product, source: "demo" }) : NextResponse.json({ product: null }, { status: 404 });
  }

  const { product, error } = await fetchProductBySlugFromSupabase(supabase, slug);
  if (error) {
    return NextResponse.json({ product: null, error: "No se pudo cargar el producto." }, { status: 500 });
  }
  if (!product) {
    return NextResponse.json({ product: null, error: "Producto no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ product, source: "supabase" });
}
