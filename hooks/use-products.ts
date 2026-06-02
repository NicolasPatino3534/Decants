"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductFilters } from "@/lib/catalog/filters";
import type { Product } from "@/lib/types";

type ProductsResponse = {
  products: Product[];
  error?: string;
};

export function useProducts(filters: ProductFilters, initialProducts: Product[] = []) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryString = useMemo(() => buildProductQuery(filters), [filters]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/catalog/products?${queryString}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as ProductsResponse;

        if (!response.ok || payload.error) {
          throw new Error(payload.error ?? "No se pudieron cargar los productos.");
        }

        setProducts(payload.products);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "No se pudieron cargar los productos.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadProducts();

    return () => controller.abort();
  }, [queryString]);

  return { products, isLoading, error };
}

export function useProduct(slug: string, initialProduct: Product | null = null) {
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();

    async function loadProduct() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/catalog/products/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as { product: Product | null; error?: string };

        if (!response.ok || payload.error) {
          throw new Error(payload.error ?? "No se pudo cargar el producto.");
        }

        setProduct(payload.product);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "No se pudo cargar el producto.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadProduct();

    return () => controller.abort();
  }, [slug]);

  return { product, isLoading, error };
}

function buildProductQuery(filters: ProductFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === "") return;
    params.set(key, String(value));
  });
  return params.toString();
}
