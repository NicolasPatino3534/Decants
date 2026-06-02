export type CheckoutStockVariant = {
  id: string;
  productName: string;
  sizeMl: number;
  priceCents: number;
  stockOnHand: number;
};

export type CheckoutItemInput = {
  variantId: string;
  quantity: number;
};

export class CheckoutStockError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

export function normalizeCheckoutItems(items: CheckoutItemInput[]) {
  const byVariant = new Map<string, number>();
  items.forEach((item) => {
    const quantity = Math.max(1, Math.trunc(item.quantity));
    if (!item.variantId || !Number.isFinite(quantity)) return;
    byVariant.set(item.variantId, (byVariant.get(item.variantId) ?? 0) + quantity);
  });
  return Array.from(byVariant.entries()).map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function buildCheckoutLines<TVariant extends CheckoutStockVariant>(
  items: CheckoutItemInput[],
  variants: TVariant[],
) {
  const normalizedItems = normalizeCheckoutItems(items);
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  return normalizedItems.map((item) => {
    const variant = variantMap.get(item.variantId);
    if (!variant) throw new CheckoutStockError("Uno o mas productos ya no estan disponibles.");
    if (variant.stockOnHand < item.quantity) {
      throw new CheckoutStockError(`${variant.productName} ${variant.sizeMl}ml no tiene stock suficiente.`);
    }

    return {
      variant,
      quantity: item.quantity,
      totalCents: variant.priceCents * item.quantity,
    };
  });
}
