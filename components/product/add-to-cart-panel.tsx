"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Check, MessageCircle, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/brand";
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
  const disabled = variant.stockOnHand <= 0;
  const consultUrl = whatsappUrl(`Hola DecantsCBA, quiero consultar por ${product.name} de ${product.brand.name} en ${variant.sizeMl}ml.`);

  function handleAdd() {
    if (disabled) return;
    addItem(product, variant, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <>
      <div className={`product-buy-panel rounded-md border p-5 transition duration-200 ${added ? "scale-[1.01] border-[#b8872f]" : ""}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c682b]">Elegir decant</p>
            <p className="mt-1 text-sm text-[#6f6658]">Atomizador listo para probar antes de invertir.</p>
          </div>
          <p className="font-display text-2xl text-ink">{formatMoney(variant.priceCents)}</p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {product.variants.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.stockOnHand <= 0}
              onClick={() => setVariantId(item.id)}
              className={`rounded-md border px-3 py-3 text-left text-sm transition ${
                item.id === variant.id
                  ? "border-[#b8872f] bg-[#b8872f] text-white"
                  : "border-line bg-white text-ink hover:border-[#b8872f] hover:bg-[#fbf7ed]"
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
              type="button"
              className="grid h-11 w-11 place-items-center text-ink disabled:opacity-35"
              disabled={quantity <= 1}
              onClick={() => setRequestedQuantity((current) => Math.max(1, current - 1))}
              aria-label="Restar cantidad"
            >
              <Minus size={16} />
            </button>
            <span className="grid h-11 w-10 place-items-center text-sm font-bold">{quantity}</span>
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

        <Button type="button" className="mt-5 h-12 w-full" disabled={disabled} onClick={handleAdd}>
          {added ? <Check size={18} /> : <ShoppingBag size={18} />}
          {added ? "Agregado al carrito" : "Agregar al carrito"}
        </Button>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {added ? (
            <ButtonLink href="/carrito" variant="secondary" className="w-full">
              Ver carrito
            </ButtonLink>
          ) : null}
          <ButtonLink href={consultUrl} variant="subtle" className="w-full">
            <MessageCircle size={17} /> Consultar
          </ButtonLink>
        </div>
        <div className="mt-4 grid gap-2 text-xs font-semibold text-[#5f665d] sm:grid-cols-3">
          <span className="flex items-center gap-1.5 rounded-md bg-mist p-2"><ShieldCheck className="accent-teal" size={14} /> Compra cuidada</span>
          <span className="flex items-center gap-1.5 rounded-md bg-mist p-2"><PackageCheck className="accent-rose" size={14} /> Rotulado</span>
          <span className="flex items-center gap-1.5 rounded-md bg-mist p-2"><BadgeCheck className="accent-clay" size={14} /> Stock real</span>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white p-3 shadow-[0_-4px_8px_rgba(24,20,14,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-ink">{product.name}</p>
            <p className="text-xs font-semibold text-[#6f6658]">{variant.sizeMl}ml - {formatMoney(variant.priceCents)}</p>
          </div>
          <Button type="button" className="h-11 shrink-0 px-4" disabled={disabled} onClick={handleAdd}>
            {added ? <Check size={17} /> : <ShoppingBag size={17} />}
            {added ? "Listo" : "Agregar"}
          </Button>
        </div>
      </div>
    </>
  );
}

function getSizeUse(sizeMl: number) {
  if (sizeMl <= 2) return "Test inicial";
  if (sizeMl <= 5) return "Comparar";
  return "Uso extendido";
}
