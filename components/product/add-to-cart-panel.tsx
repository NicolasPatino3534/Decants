"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Check, CreditCard, Minus, Plus, ShieldCheck, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export function AddToCartPanel({ product }: { product: Product }) {
  const firstAvailableVariant = product.variants.find((item) => item.stockOnHand > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailableVariant?.id ?? "");
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const variant = useMemo(
    () => product.variants.find((item) => item.id === variantId) ?? firstAvailableVariant,
    [firstAvailableVariant, product.variants, variantId],
  );

  if (!variant) {
    return (
      <div className="rounded-md border border-line bg-paper p-5 text-sm text-muted">
        Este producto todavía no tiene variantes disponibles.
      </div>
    );
  }

  const quantity = Math.min(Math.max(requestedQuantity, 1), Math.max(variant.stockOnHand, 1));
  const stockLabel =
    variant.stockOnHand <= 0
      ? "Sin stock"
      : variant.stockOnHand <= variant.lowStockThreshold
        ? "Últimas unidades"
        : `${variant.stockOnHand} disponibles`;

  return (
    <div className={`rounded-md border border-line bg-paper p-5 shadow-soft transition duration-300 ${added ? "scale-[1.01] border-amber shadow-[0_24px_70px_rgba(184,135,47,0.18)]" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-muted)]">Elegí tu decant</p>
          <p className="mt-1 text-sm leading-6 text-muted">Atomizador rotulado, preparado con stock real y listo para probar.</p>
        </div>
        <div className="rounded-md bg-warm px-4 py-3 text-right">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-soft">Precio</p>
          <p className="font-display text-3xl text-ink">{formatMoney(variant.priceCents)}</p>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-black text-ink">Tamaño</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {product.variants.map((item) => {
            const isSelected = item.id === variant.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.stockOnHand <= 0}
                aria-pressed={isSelected}
                onClick={() => {
                  setVariantId(item.id);
                  setRequestedQuantity(1);
                }}
                className={`min-h-[92px] rounded-md border px-3 py-3 text-left text-sm transition ${
                  isSelected
                    ? "border-amber bg-amber text-white"
                    : "border-line bg-paper text-ink hover:border-[var(--border-strong)] hover:bg-warm"
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <span className="block text-base font-black">{item.sizeMl}ml</span>
                <span className="mt-1 block text-xs font-semibold opacity-80">
                  {item.stockOnHand > 0 ? formatMoney(item.priceCents) : "Sin stock"}
                </span>
                <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.08em] opacity-75">{getSizeUse(item.sizeMl)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-col gap-3 rounded-md border border-line bg-mist p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-ink">Cantidad</p>
          <p className="mt-1 text-xs font-semibold text-soft">{stockLabel}</p>
        </div>
        <div className="flex h-11 w-fit items-center rounded-md border border-line bg-paper">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-ink disabled:opacity-35"
            disabled={quantity <= 1}
            onClick={() => setRequestedQuantity((current) => Math.max(1, current - 1))}
            aria-label="Restar cantidad"
          >
            <Minus size={16} />
          </button>
          <span className="grid h-11 w-10 place-items-center text-sm font-bold text-ink">{quantity}</span>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-ink disabled:opacity-35"
            disabled={quantity >= variant.stockOnHand}
            onClick={() => setRequestedQuantity((current) => Math.min(variant.stockOnHand, current + 1))}
            aria-label="Sumar cantidad"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <Button
        className="mt-5 h-12 w-full text-base"
        disabled={variant.stockOnHand <= 0}
        onClick={() => {
          addItem(product, variant, quantity);
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1600);
        }}
      >
        {added ? <Check size={18} /> : <ShoppingBag size={18} />}
        {added ? "Agregado al carrito" : "Agregar al carrito"}
      </Button>
      {added ? (
        <ButtonLink href="/carrito" variant="secondary" className="mt-3 w-full">
          Ver carrito
        </ButtonLink>
      ) : null}
      <div className="mt-4 grid gap-2 text-xs font-semibold text-muted sm:grid-cols-3">
        <span className="flex items-center gap-1.5 rounded-md bg-mist p-2"><ShieldCheck size={14} /> Compra segura</span>
        <span className="flex items-center gap-1.5 rounded-md bg-mist p-2"><CreditCard size={14} /> Confirmación clara</span>
        <span className="flex items-center gap-1.5 rounded-md bg-mist p-2"><BadgeCheck size={14} /> Stock real</span>
      </div>
    </div>
  );
}

function getSizeUse(sizeMl: number) {
  if (sizeMl <= 2) return "Test inicial";
  if (sizeMl <= 5) return "Comparar";
  return "Uso extendido";
}
