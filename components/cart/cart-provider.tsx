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
  syncCart: () => Promise<CartLine[]>;
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

function writeStoredCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(lines));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [serverSyncEnabled, setServerSyncEnabled] = useState(false);
  const linesRef = useRef<CartLine[]>([]);
  const skipNextSyncRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredCart(lines);
  }, [hydrated, lines]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const syncCart = useCallback(async () => {
    try {
      const response = await fetch("/api/cart", { headers: { Accept: "application/json" } });
      const payload = (await response.json()) as { lines?: CartLine[]; authenticated?: boolean };
      if (!payload.authenticated) {
        const latestLocalLines = readStoredCart();
        linesRef.current = latestLocalLines;
        setLines(latestLocalLines);
        setHydrated(true);
        return latestLocalLines;
      }

      setServerSyncEnabled(true);
      const merged = mergeCartLines(payload.lines ?? [], readStoredCart());
      const syncResponse = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ items: merged.map((line) => ({ variantId: line.variantId, quantity: line.quantity })) }),
      });
      const syncPayload = (await syncResponse.json().catch(() => ({}))) as { lines?: CartLine[] };
      const refreshedLines = syncResponse.ok && Array.isArray(syncPayload.lines) ? syncPayload.lines : merged;

      skipNextSyncRef.current = true;
      linesRef.current = refreshedLines;
      writeStoredCart(refreshedLines);
      setLines(refreshedLines);
      return refreshedLines;
    } catch {
      // Local cart remains the source of truth if server sync is unavailable.
      return linesRef.current;
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
    const current = linesRef.current;
    const existing = current.find((line) => line.variantId === variant.id);
    const nextLines = existing
      ? current.map((line) =>
          line.variantId === variant.id
            ? { ...line, stockOnHand: variant.stockOnHand, quantity: clampCartQuantity(line.quantity + quantity, variant.stockOnHand) }
            : line,
        )
      : [
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

    linesRef.current = nextLines;
    writeStoredCart(nextLines);
    setLines(nextLines);
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    const nextLines = linesRef.current.map((line) =>
      line.variantId === variantId ? { ...line, quantity: clampCartQuantity(quantity, line.stockOnHand) } : line,
    );
    linesRef.current = nextLines;
    writeStoredCart(nextLines);
    setLines(nextLines);
  }, []);

  const removeItem = useCallback((variantId: string) => {
    const nextLines = linesRef.current.filter((line) => line.variantId !== variantId);
    linesRef.current = nextLines;
    writeStoredCart(nextLines);
    setLines(nextLines);
  }, []);

  const clearCart = useCallback(() => {
    linesRef.current = [];
    writeStoredCart([]);
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
