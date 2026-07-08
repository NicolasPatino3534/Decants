import type { Product } from "@/lib/types";

export type ProductSort = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc" | "best-selling";

export type ProductFilters = {
  query?: string;
  brand?: string;
  category?: string;
  gender?: Product["gender"];
  family?: string;
  sizeMl?: number;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: ProductSort;
};

export function productMatchesFilters(product: Product, filters: ProductFilters) {
  const normalizedQuery = filters.query?.trim().toLowerCase();
  const matchesQuery =
    !normalizedQuery ||
    [
      product.name,
      product.brand.name,
      product.category.name,
      product.concentration,
      product.description,
      product.recommendedOccasion,
      product.recommendedSeason,
      ...product.notesTop,
      ...product.notesHeart,
      ...product.notesBase,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);

  return (
    matchesQuery &&
    (!filters.brand || product.brand.slug === filters.brand) &&
    (!filters.category || product.category.slug === filters.category) &&
    (!filters.family || product.family.slug === filters.family) &&
    (!filters.gender || product.gender === filters.gender) &&
    (!filters.sizeMl || product.variants.some((variant) => variant.sizeMl === filters.sizeMl)) &&
    priceRangeMatches(product, filters)
  );
}

export function filterProducts(products: Product[], filters: ProductFilters) {
  return sortProducts(products.filter((product) => productMatchesFilters(product, filters)), filters.sort);
}

export function sortProducts(products: Product[], sort: ProductSort = "featured") {
  return [...products].sort((a, b) => {
    if (sort === "name-asc") return a.name.localeCompare(b.name);
    if (sort === "name-desc") return b.name.localeCompare(a.name);
    if (sort === "price-asc") return lowestPrice(a) - lowestPrice(b);
    if (sort === "price-desc") return lowestPrice(b) - lowestPrice(a);
    if (sort === "best-selling") return Number(b.featured) - Number(a.featured) || totalStock(b) - totalStock(a);
    return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
  });
}

export function lowestPrice(product: Product) {
  if (product.variants.length === 0) return Number.MAX_SAFE_INTEGER;
  return Math.min(...product.variants.map((variant) => variant.priceCents));
}

function totalStock(product: Product) {
  return product.variants.reduce((total, variant) => total + variant.stockOnHand, 0);
}

function priceRangeMatches(product: Product, filters: ProductFilters) {
  if (filters.minPriceCents == null && filters.maxPriceCents == null) return true;
  return product.variants.some((variant) => {
    const aboveMin = filters.minPriceCents == null || variant.priceCents >= filters.minPriceCents;
    const belowMax = filters.maxPriceCents == null || variant.priceCents <= filters.maxPriceCents;
    return aboveMin && belowMax;
  });
}
