import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { fetchProductsFromSupabase } from "@/lib/data/products";
import { env } from "@/lib/env";

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
    ...products.map((product) => ({
      url: `${siteUrl}/producto/${product.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: product.featured ? 0.8 : 0.7,
    })),
  ];
}
