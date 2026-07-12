"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Plus, ShieldCheck, SprayCan } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const availableVariants = product.variants.filter((variant) => variant.stockOnHand > 0);
  const firstVariant = availableVariants[0] ?? product.variants[0];
  const lastVariant = product.variants[product.variants.length - 1] ?? firstVariant;
  const isSoldOut = availableVariants.length === 0;
  const lowStock = availableVariants.some((variant) => variant.stockOnHand <= variant.lowStockThreshold);
  const topNotes = [...product.notesTop, ...product.notesHeart].slice(0, 3);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-paper transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-soft">
      <Link href={`/producto/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[var(--surface-strong)]">
        <Image
          src={product.imageUrl}
          alt={`${product.name} decant`}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw"
          className="object-contain object-center transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-md bg-amber px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {isSoldOut ? "Agotado" : lowStock ? "Últimas unidades" : `${firstVariant?.sizeMl ?? 2}ml disponible`}
        </span>
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md border border-white/50 bg-white/90 text-[#18140e]">
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-soft">{product.brand.name}</p>
          <Link href={`/producto/${product.slug}`} className="font-display mt-1 block text-2xl leading-tight text-ink hover:underline">
            {product.name}
          </Link>
          <p className="mt-2 text-sm text-muted">
            {product.concentration} · {labelGender(product.gender)}
          </p>
        </div>
        <div className="flex min-h-[76px] flex-wrap content-start gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1 rounded-md bg-warm px-2.5 py-1.5 text-[var(--accent-muted)]">
            <SprayCan size={13} /> {product.family.name}
          </span>
          {topNotes.map((note) => (
            <span key={note} className="rounded-md border border-line px-2.5 py-1.5 text-muted">
              {note}
            </span>
          ))}
        </div>
        <div className="mt-auto grid gap-3 border-t border-line pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-soft">Desde</p>
              <p className="mt-1 text-lg font-black text-ink">
                {firstVariant ? formatMoney(firstVariant.priceCents) : "Sin variantes"}
              </p>
              {firstVariant && lastVariant && firstVariant.id !== lastVariant.id ? (
                <p className="text-xs text-soft">Hasta {formatMoney(lastVariant.priceCents)}</p>
              ) : null}
            </div>
            <p className="text-right text-xs font-bold text-muted">
              {product.variants.length > 0 ? product.variants.map((variant) => `${variant.sizeMl}ml`).join(" / ") : "Stock pendiente"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-muted)]">
            <ShieldCheck size={15} />
            Decant preparado y stock verificado
          </div>
          <Button
            variant="champagne"
            className="h-11 w-full"
            disabled={!firstVariant || isSoldOut}
            onClick={() => {
              if (!firstVariant) return;
              addItem(product, firstVariant);
              setJustAdded(true);
              window.setTimeout(() => setJustAdded(false), 1200);
            }}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            {justAdded ? <Check size={17} /> : <Plus size={17} />}
            {justAdded ? "Agregado" : `Agregar desde ${firstVariant ? `${firstVariant.sizeMl}ml` : ""}`}
          </Button>
        </div>
      </div>
    </article>
  );
}

function labelGender(value: Product["gender"]) {
  if (value === "feminine") return "Mujer";
  if (value === "masculine") return "Hombre";
  return "Unisex";
}
