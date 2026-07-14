import { NextResponse } from "next/server";
import {
  filterProducts,
  type ProductFilters,
  type ProductSort,
} from "@/lib/catalog/filters";
import { fetchProductsFromSupabase } from "@/lib/data/products";
import { demoProducts } from "@/lib/demo-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const filters = parseProductFilters(new URL(request.url).searchParams);

  const supabase =
    createSupabaseAdminClient() ?? (await createSupabaseServerClient());

  if (!supabase) {
    return NextResponse.json({
      products: filterProducts(demoProducts, filters),
      source: "demo",
    });
  }

  const { products, error } = await fetchProductsFromSupabase(
    supabase,
    filters,
  );
  if (error) {
    console.error("catalog_products_supabase_error", {
      message: error.message,
    });
    return NextResponse.json(
      {
        products: [],
        source: "supabase",
        error: "No se pudo cargar el catálogo.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ products, source: "supabase" });
}

function parseProductFilters(params: URLSearchParams): ProductFilters {
  return {
    query: optionalParam(params, "query"),
    brand: optionalParam(params, "brand"),
    category: optionalParam(params, "category"),
    family: optionalParam(params, "family"),
    gender: parseGender(optionalParam(params, "gender")),
    sizeMl: parseNumberParam(params, "sizeMl"),
    minPriceCents: parseNumberParam(params, "minPriceCents"),
    maxPriceCents: parseNumberParam(params, "maxPriceCents"),
    sort: parseSort(optionalParam(params, "sort")),
  };
}

function optionalParam(params: URLSearchParams, key: string) {
  const value = params.get(key);
  return value && value !== "all" ? value : undefined;
}

function parseNumberParam(params: URLSearchParams, key: string) {
  const value = optionalParam(params, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseGender(value: string | undefined) {
  return value === "unisex" || value === "feminine" || value === "masculine"
    ? value
    : undefined;
}

function parseSort(value: string | undefined): ProductSort | undefined {
  const allowed: ProductSort[] = [
    "featured",
    "price-asc",
    "price-desc",
    "name-asc",
    "name-desc",
    "best-selling",
  ];
  return allowed.find((sort) => sort === value);
}
