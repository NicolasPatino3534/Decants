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
      <div className="rounded-md border border-line bg-white p-5 text-sm text-[#6f6658]">
        Este producto todavia no tiene variantes disponibles.
      </div>
    );
  }

  const quantity = Math.min(Math.max(requestedQuantity, 1), Math.max(variant.stockOnHand, 1));

  return (
    <div className="rounded-md border border-line bg-white p-5 shadow-[0_18px_50px_rgba(11,13,15,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c682b]">Elegir decant</p>
          <p className="mt-1 text-sm text-[#6f6658]">Atomizador listo para probar antes de invertir.</p>
        </div>
        <p className="font-display text-2xl text-ink">{formatMoney(variant.priceCents)}</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {product.variants.map((item) => (
          <button
            key={item.id}
            disabled={item.stockOnHand <= 0}
            onClick={() => setVariantId(item.id)}
            className={`rounded-md border px-3 py-3 text-left text-sm transition ${
              item.id === variant.id
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-ink hover:border-[#b88939]"
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <span className="block font-semibold">{item.sizeMl}ml</span>
            <span className="mt-1 block text-xs opacity-75">
              {item.stockOnHand > 0 ? formatMoney(item.priceCents) : "Sin stock"}
            </span>
            <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.08em] opacity-70">{getSizeUse(item.sizeMl)}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-ink">Cantidad</p>
          <p className="mt-1 text-xs text-[#7d7467]">
            {variant.stockOnHand <= 0
              ? "Sin stock"
              : variant.stockOnHand <= variant.lowStockThreshold
                ? "Ultimas unidades"
                : `${variant.stockOnHand} disponibles`}
          </p>
        </div>
        <div className="flex h-11 items-center rounded-md border border-line bg-white">
          <button
            className="grid h-11 w-11 place-items-center text-ink disabled:opacity-35"
            disabled={quantity <= 1}
            onClick={() => setRequestedQuantity((current) => Math.max(1, current - 1))}
            aria-label="Restar cantidad"
          >
            <Minus size={16} />
          </button>
          <span className="grid h-11 w-10 place-items-center text-sm font-bold">{quantity}</span>
          <button
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
        className="mt-5 h-12 w-full"
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
      <div className="mt-4 grid gap-2 text-xs font-semibold text-[#5f665d] sm:grid-cols-3">
        <span className="flex items-center gap-1.5 rounded-md bg-mist p-2"><ShieldCheck size={14} /> Compra segura</span>
        <span className="flex items-center gap-1.5 rounded-md bg-mist p-2"><CreditCard size={14} /> Pago online</span>
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
