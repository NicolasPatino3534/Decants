"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Check, Plus, ShieldCheck, SprayCan } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addItem } = useCart();
  const availableVariants = product.variants.filter((variant) => variant.stockOnHand > 0);
  const firstVariant = availableVariants[0] ?? product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(firstVariant?.id ?? "");
  const [justAdded, setJustAdded] = useState(false);
  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId) ?? firstVariant;
  const isSoldOut = availableVariants.length === 0;
  const lowStock = availableVariants.some((variant) => variant.stockOnHand <= variant.lowStockThreshold);
  const topNotes = [...product.notesTop, ...product.notesHeart].slice(0, 3);
  const badge = getBadge(product, isSoldOut, lowStock);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#caa55c] hover:shadow-[0_8px_18px_rgba(11,13,15,0.10)]">
      <Link href={`/producto/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[#11100e]">
        <Image
          src={product.imageUrl}
          alt={`${product.name} decant`}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw"
          className="object-contain object-center transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-md bg-[#b8872f] px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {badge}
        </span>
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md border border-white/70 bg-white/92 text-ink">
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b7164]">{product.brand.name}</p>
          <Link href={`/producto/${product.slug}`} className="font-display mt-1 block text-2xl leading-tight text-ink hover:underline">
            {product.name}
          </Link>
          <p className="mt-2 text-sm text-[#6b6257]">
            {product.concentration} · {labelGender(product.gender)}
          </p>
        </div>
        <div className="flex min-h-[76px] flex-wrap content-start gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1 rounded-md bg-[#f3ede3] px-2.5 py-1.5 text-[#5b4b33]">
            <SprayCan size={13} /> {product.family.name}
          </span>
          {topNotes.map((note) => (
            <span key={note} className="rounded-md border border-line px-2.5 py-1.5 text-[#6f6658]">
              {note}
            </span>
          ))}
        </div>
        <div className="mt-auto grid gap-3 border-t border-line pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#83796c]">Elegir ml</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {product.variants.map((variant) => (
                <VariantButton
                  key={variant.id}
                  variant={variant}
                  selected={selectedVariant?.id === variant.id}
                  onSelect={() => setSelectedVariantId(variant.id)}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#83796c]">Seleccionado</p>
              <p className="mt-1 text-lg font-black text-ink">
                {selectedVariant ? formatMoney(selectedVariant.priceCents) : "Sin variantes"}
              </p>
            </div>
            <p className="max-w-[9rem] text-right text-xs font-bold text-[#6f6658]">
              {selectedVariant && selectedVariant.stockOnHand > 0
                ? selectedVariant.stockOnHand <= selectedVariant.lowStockThreshold
                  ? `Ultimos ${selectedVariant.stockOnHand}`
                  : `${selectedVariant.stockOnHand} disponibles`
                : "Sin stock"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8a611c]">
            <ShieldCheck size={15} />
            Preparado, rotulado y con stock verificado
          </div>
          <Button
            type="button"
            variant="champagne"
            className="h-11 w-full"
            disabled={!selectedVariant || selectedVariant.stockOnHand <= 0 || isSoldOut}
            onClick={() => {
              if (!selectedVariant) return;
              addItem(product, selectedVariant);
              setJustAdded(true);
              window.setTimeout(() => setJustAdded(false), 1200);
            }}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            {justAdded ? <Check size={17} /> : <Plus size={17} />}
            {justAdded ? "Agregado" : selectedVariant ? `Agregar ${selectedVariant.sizeMl}ml` : "Agregar"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function VariantButton({ variant, selected, onSelect }: { variant: ProductVariant; selected: boolean; onSelect: () => void }) {
  const disabled = variant.stockOnHand <= 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`min-h-[58px] rounded-md border px-2 py-2 text-left transition ${
        selected
          ? "border-[#b8872f] bg-[#b8872f] text-white"
          : "border-line bg-white text-ink hover:border-[#b8872f] hover:bg-[#fbf7ed]"
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <span className="block text-sm font-black">{variant.sizeMl}ml</span>
      <span className="mt-1 block text-[11px] font-bold opacity-80">{disabled ? "Sin stock" : formatMoney(variant.priceCents)}</span>
    </button>
  );
}

function getBadge(product: Product, isSoldOut: boolean, lowStock: boolean) {
  if (isSoldOut) return "Agotado";
  if (lowStock) return "Ultimas unidades";
  if (product.featured) return "Recomendado";
  return "Stock visible";
}

function labelGender(value: Product["gender"]) {
  if (value === "feminine") return "Mujer";
  if (value === "masculine") return "Hombre";
  return "Unisex";
}
