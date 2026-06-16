"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { calculateSubtotal, clampCartQuantity, mergeCartLines } from "@/lib/cart/pricing";
import type { CartLine, DecantVariant, Product } from "@/lib/types";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  addItem: (product: Product, variant: DecantVariant, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  syncCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "decantscba-cart-v1";

function readStoredCart() {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as CartLine[];
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [serverSyncEnabled, setServerSyncEnabled] = useState(false);
  const skipNextSyncRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [hydrated, lines]);

  const syncCart = useCallback(async () => {
    try {
      const localLines = readStoredCart();
      const response = await fetch("/api/cart", { headers: { Accept: "application/json" } });
      const payload = (await response.json()) as { lines?: CartLine[]; authenticated?: boolean };
      if (!payload.authenticated) {
        setLines(localLines);
        setHydrated(true);
        return;
      }

      setServerSyncEnabled(true);
      const merged = mergeCartLines(payload.lines ?? [], localLines);
      skipNextSyncRef.current = true;
      setLines(merged);

      await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ items: merged.map((line) => ({ variantId: line.variantId, quantity: line.quantity })) }),
      });
    } catch {
      // Local cart remains the source of truth if server sync is unavailable.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void syncCart();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [syncCart]);

  useEffect(() => {
    if (!hydrated || !serverSyncEnabled) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    const timeout = window.setTimeout(async () => {
      await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })) }),
      }).catch(() => undefined);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [hydrated, lines, serverSyncEnabled]);

  const addItem = useCallback((product: Product, variant: DecantVariant, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.variantId === variant.id);
      if (existing) {
        return current.map((line) =>
          line.variantId === variant.id
            ? { ...line, stockOnHand: variant.stockOnHand, quantity: clampCartQuantity(line.quantity + quantity, variant.stockOnHand) }
            : line,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          imageUrl: product.imageUrl,
          variantId: variant.id,
          sizeMl: variant.sizeMl,
          priceCents: variant.priceCents,
          stockOnHand: variant.stockOnHand,
          quantity: clampCartQuantity(quantity, variant.stockOnHand),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setLines((current) =>
      current.map((line) => (line.variantId === variantId ? { ...line, quantity: clampCartQuantity(quantity, line.stockOnHand) } : line)),
    );
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setLines((current) => current.filter((line) => line.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    if (serverSyncEnabled) {
      fetch("/api/cart", { method: "DELETE" }).catch(() => undefined);
    }
  }, [serverSyncEnabled]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotalCents = calculateSubtotal(lines);
    return { lines, count, subtotalCents, addItem, updateQuantity, removeItem, clearCart, syncCart };
  }, [addItem, clearCart, lines, removeItem, syncCart, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used within CartProvider");
  }
  return value;
}
