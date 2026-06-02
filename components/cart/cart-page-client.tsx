"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, LockKeyhole, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { calculateCartTotals, fallbackShippingMethods } from "@/lib/cart/pricing";
import { formatMoney } from "@/lib/format";

export function CartPageClient() {
  const { lines, updateQuantity, removeItem, clearCart } = useCart();
  const totals = calculateCartTotals({
    lines,
    shippingCents: lines.length > 0 ? fallbackShippingMethods[0].basePriceCents : 0,
  });

  if (lines.length === 0) {
    return (
      <main className="premium-shell mx-auto grid min-h-[70vh] place-items-center px-4 py-16 text-center">
        <div className="max-w-md rounded-md border border-line bg-white p-8 shadow-[0_18px_50px_rgba(11,13,15,0.08)]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[#edf2ee] text-[#5f7d69]">
            <ShoppingBag size={20} />
          </div>
          <h1 className="font-display mt-5 text-4xl text-ink">Tu carrito esta vacio</h1>
          <p className="mt-3 text-sm leading-6 text-[#6f6658]">
            Elegi tus decants favoritos y arma un set para probarlos antes de comprar botella completa.
          </p>
          <ButtonLink href="/catalogo" className="mt-6">
            Explorar catalogo
          </ButtonLink>
        </div>
      </main>
    );
  }

  return (
    <main className="premium-shell">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8 lg:py-12">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8c682b]">Carrito</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-display text-5xl text-ink">Tu seleccion</h1>
            <Button variant="secondary" className="w-fit" onClick={clearCart}>
              Vaciar carrito
            </Button>
          </div>
          <div className="mt-5 grid gap-2 rounded-md border border-[#dfe8df] bg-[#f5faf6] p-3 text-sm font-semibold text-[#47624f] sm:grid-cols-3">
            <span className="flex items-center gap-2"><ShieldCheck size={16} /> Compra segura</span>
            <span className="flex items-center gap-2"><BadgeCheck size={16} /> Stock reservado al pagar</span>
            <span className="flex items-center gap-2"><Truck size={16} /> Envio con tracking</span>
          </div>
          <div className="mt-6 divide-y divide-line rounded-md border border-line bg-white">
            {lines.map((line, index) => (
              <div key={line.variantId} className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto]">
                <div className="relative aspect-square overflow-hidden rounded-md bg-mist">
                  <Image
                    src={line.imageUrl}
                    alt={line.productName}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <Link href={`/producto/${line.productSlug}`} className="font-display text-xl text-ink hover:underline">
                    {line.productName}
                  </Link>
                  <p className="mt-1 text-sm text-[#6f6658]">{line.sizeMl}ml</p>
                  {line.stockOnHand != null ? <p className="mt-1 text-xs text-[#8b806f]">{line.stockOnHand} disponibles</p> : null}
                  <p className="mt-3 text-sm font-bold text-ink">{formatMoney(line.priceCents)}</p>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <Button
                    variant="subtle"
                    className="h-10 w-10 px-0 text-ink"
                    aria-label={`Restar ${line.productName}`}
                    onClick={() => updateQuantity(line.variantId, line.quantity - 1)}
                  >
                    <Minus size={18} strokeWidth={2.4} />
                  </Button>
                  <span className="grid h-9 w-10 place-items-center rounded-md border border-line bg-white text-sm font-bold">{line.quantity}</span>
                  <Button
                    variant="subtle"
                    className="h-10 w-10 px-0 text-ink"
                    aria-label={`Sumar ${line.productName}`}
                    disabled={line.stockOnHand != null && line.quantity >= line.stockOnHand}
                    onClick={() => updateQuantity(line.variantId, line.quantity + 1)}
                  >
                    <Plus size={18} strokeWidth={2.4} />
                  </Button>
                  <Button
                    variant="subtle"
                    className="h-10 w-10 px-0 text-ink"
                    aria-label={`Eliminar ${line.productName}`}
                    onClick={() => removeItem(line.variantId)}
                  >
                    <Trash2 size={18} strokeWidth={2.2} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <ButtonLink href="/catalogo" variant="subtle" className="mt-5 w-full sm:w-fit">
            Seguir explorando
          </ButtonLink>
        </section>
        <aside className="h-fit rounded-md border border-line bg-white p-5 shadow-[0_18px_50px_rgba(11,13,15,0.08)] lg:sticky lg:top-28">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl text-ink">Resumen</h2>
            <LockKeyhole className="text-[#5f7d69]" size={20} />
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <SummaryRow label="Subtotal" value={formatMoney(totals.subtotalCents)} />
            <SummaryRow label="Descuento" value={`-${formatMoney(totals.discountCents)}`} />
            <SummaryRow label="Envio" value={formatMoney(totals.shippingCents)} />
            <div className="border-t border-line pt-3">
              <div className="flex justify-between text-base">
                <span className="font-bold">Total</span>
                <span className="font-black">{formatMoney(totals.totalCents)}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 rounded-md bg-mist p-3 text-xs leading-5 text-[#5f574c]">
            El envio exacto y los datos de entrega se confirman en el siguiente paso antes de pagar.
          </p>
          <ButtonLink href="/checkout" className="mt-5 h-12 w-full">
            Checkout seguro <ArrowRight size={17} />
          </ButtonLink>
        </aside>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#6f6658]">{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}
