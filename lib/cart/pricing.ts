import type { CartLine, CartTotals, ShippingMethod } from "@/lib/types";

export const fallbackShippingMethods: ShippingMethod[] = [
  {
    id: "standard",
    name: "Envío estándar",
    description: "Entrega a domicilio con seguimiento.",
    carrier: "Correo",
    basePriceCents: 250000,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
  },
  {
    id: "express",
    name: "Envío express",
    description: "Prioridad de preparación y despacho.",
    carrier: "Mensajería",
    basePriceCents: 450000,
    estimatedDaysMin: 1,
    estimatedDaysMax: 2,
  },
];

export function calculateSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
}

export function calculateCartTotals({
  lines,
  shippingCents,
  discountCents = 0,
}: {
  lines: CartLine[];
  shippingCents: number;
  discountCents?: number;
}): CartTotals {
  const subtotalCents = calculateSubtotal(lines);
  const safeDiscountCents = Math.min(Math.max(discountCents, 0), subtotalCents);
  return {
    subtotalCents,
    discountCents: safeDiscountCents,
    shippingCents,
    totalCents: Math.max(0, subtotalCents - safeDiscountCents + shippingCents),
  };
}

export function clampCartQuantity(quantity: number, stockOnHand?: number) {
  const requested = Math.max(1, Math.trunc(quantity));
  if (stockOnHand == null) return requested;
  return Math.min(requested, Math.max(stockOnHand, 0));
}

export function mergeCartLines(primary: CartLine[], secondary: CartLine[]) {
  const merged = new Map<string, CartLine>();

  [...primary, ...secondary].forEach((line) => {
    const existing = merged.get(line.variantId);
    if (!existing) {
      merged.set(line.variantId, {
        ...line,
        quantity: clampCartQuantity(line.quantity, line.stockOnHand),
      });
      return;
    }

    const stockOnHand = line.stockOnHand ?? existing.stockOnHand;
    merged.set(line.variantId, {
      ...existing,
      ...line,
      stockOnHand,
      quantity: clampCartQuantity(existing.quantity + line.quantity, stockOnHand),
    });
  });

  return Array.from(merged.values()).filter((line) => line.quantity > 0);
}
