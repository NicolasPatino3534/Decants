import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { fetchProductsFromSupabase } from "@/lib/data/products";
import { env } from "@/lib/env";
import { noteLandings, occasionLinks } from "@/lib/site-content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = env.siteUrl.replace(/\/$/, "");
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/catalogo`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...["quienes-somos", "como-comprar", "faq", "envios", "devoluciones", "contacto", "guias"].map((route) => ({
      url: `${siteUrl}/${route}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...occasionLinks.map((occasion) => ({
      url: `${siteUrl}/ocasiones/${occasion.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
    ...noteLandings.map((note) => ({
      url: `${siteUrl}/notas/${note.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  ];

  if (!env.supabaseUrl || !env.supabasePublishableKey) return staticRoutes;

  const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { products, error } = await fetchProductsFromSupabase(supabase);
  if (error) return staticRoutes;

  return [
    ...staticRoutes,
    ...Array.from(new Map(products.map((product) => [product.brand.slug, product.brand])).values()).map((brand) => ({
      url: `${siteUrl}/marcas/${brand.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/producto/${product.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: product.featured ? 0.8 : 0.7,
    })),
  ];
}
