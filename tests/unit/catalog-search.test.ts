import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { fetchProductsFromSupabase } from "@/lib/data/products";

const rows = [
  productRow({
    id: "product-nocturne",
    name: "Nocturne",
    slug: "nocturne",
    brandName: "Maison Lumière",
    categoryName: "Oriental",
    concentration: "Extrait",
    topNotes: ["Bergamota"],
  }),
  productRow({
    id: "product-ocean",
    name: "Ocean Mist",
    slug: "ocean-mist",
    brandName: "Atelier Blue",
    categoryName: "Acuática",
    concentration: "Eau de parfum",
    topNotes: ["Limón"],
  }),
];

describe("Supabase catalog search", () => {
  it.each([
    ["nombre", "nocturne"],
    ["marca", "maison lumière"],
    ["categoría", "oriental"],
    ["concentración", "extrait"],
    ["notas", "bergamota"],
  ])("matches products by %s", async (_field, query) => {
    const result = await fetchProductsFromSupabase(createSupabaseStub(rows), {
      query,
    });

    expect(result.error).toBeNull();
    expect(result.products.map((product) => product.slug)).toEqual([
      "nocturne",
    ]);
  });
});

class CatalogQueryStub {
  constructor(private readonly data: unknown[]) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  gte() {
    return this;
  }

  lte() {
    return this;
  }

  ilike() {
    throw new Error("Search must not be narrowed to products.name");
  }

  order(column: string) {
    if (column === "name")
      return Promise.resolve({ data: this.data, error: null });
    return this;
  }
}

function createSupabaseStub(data: unknown[]) {
  return {
    from: () => new CatalogQueryStub(data),
  } as unknown as SupabaseClient;
}

function productRow({
  id,
  name,
  slug,
  brandName,
  categoryName,
  concentration,
  topNotes,
}: {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  categoryName: string;
  concentration: string;
  topNotes: string[];
}) {
  return {
    id,
    name,
    slug,
    concentration,
    description: `${name} description`,
    top_notes: topNotes,
    heart_notes: [],
    base_notes: [],
    gender: "unisex",
    duration_estimate: null,
    projection_estimate: null,
    recommended_occasion: null,
    recommended_season: null,
    active: true,
    featured: false,
    perfume_brands: {
      id: `brand-${id}`,
      name: brandName,
      slug: brandName.toLowerCase().replaceAll(" ", "-"),
      country: null,
      active: true,
    },
    categories: {
      id: `category-${id}`,
      name: categoryName,
      slug: categoryName.toLowerCase(),
      description: null,
      active: true,
    },
    product_images: [],
    product_variants: [
      {
        id: `variant-${id}`,
        size_ml: 5,
        price_cents: 10_000,
        stock: 10,
        low_stock_threshold: 2,
        sku: `SKU-${id}`,
        active: true,
      },
    ],
  };
}
