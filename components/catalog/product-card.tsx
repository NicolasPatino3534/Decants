"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus, ShieldCheck, SprayCan } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addItem } = useCart();
  const availableVariants = product.variants.filter((variant) => variant.stockOnHand > 0);
  const firstVariant = availableVariants[0] ?? product.variants[0];
  const lastVariant = product.variants[product.variants.length - 1] ?? firstVariant;
  const isSoldOut = availableVariants.length === 0;
  const lowStock = availableVariants.some((variant) => variant.stockOnHand <= variant.lowStockThreshold);
  const topNotes = [...product.notesTop, ...product.notesHeart].slice(0, 3);

  return (
    <article className="group overflow-hidden rounded-md border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-[#d7c5a7] hover:shadow-[0_22px_58px_rgba(11,13,15,0.10)]">
      <Link href={`/producto/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-mist">
        <Image
          src={product.imageUrl}
          alt={`${product.name} decant`}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw"
          className="object-cover object-center transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-md bg-ink/92 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {isSoldOut ? "Agotado" : lowStock ? "Ultimas unidades" : `${firstVariant?.sizeMl ?? 2}ml disponible`}
        </span>
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md border border-white/70 bg-white/92 text-ink">
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7b7164]">{product.brand.name}</p>
          <Link href={`/producto/${product.slug}`} className="font-display mt-1 block text-2xl leading-tight text-ink hover:underline">
            {product.name}
          </Link>
          <p className="mt-2 text-sm text-[#6b6257]">
            {product.concentration} · {product.gender}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1 rounded-md bg-[#f3ede3] px-2.5 py-1.5 text-[#5b4b33]">
            <SprayCan size={13} /> {product.family.name}
          </span>
          {topNotes.map((note) => (
            <span key={note} className="rounded-md border border-line px-2.5 py-1.5 text-[#6f6658]">
              {note}
            </span>
          ))}
        </div>
        <div className="grid gap-3 border-t border-line pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#83796c]">Desde</p>
              <p className="mt-1 text-lg font-black text-ink">
                {firstVariant ? formatMoney(firstVariant.priceCents) : "Sin variantes"}
              </p>
              {firstVariant && lastVariant && firstVariant.id !== lastVariant.id ? (
                <p className="text-xs text-[#83796c]">Hasta {formatMoney(lastVariant.priceCents)}</p>
              ) : null}
            </div>
            <p className="text-right text-xs font-bold text-[#6f6658]">
              {product.variants.length > 0 ? product.variants.map((variant) => `${variant.sizeMl}ml`).join(" / ") : "Stock pendiente"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5f7d69]">
            <ShieldCheck size={15} />
            Decant preparado y stock verificado
          </div>
          <Button
            variant="champagne"
            className="h-11 w-full"
            disabled={!firstVariant || isSoldOut}
            onClick={() => firstVariant && addItem(product, firstVariant)}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            <Plus size={17} />
            Agregar desde {firstVariant ? `${firstVariant.sizeMl}ml` : ""}
          </Button>
        </div>
      </div>
    </article>
  );
}
