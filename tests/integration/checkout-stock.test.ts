import { describe, expect, it } from "vitest";
import { buildCheckoutLines, CheckoutStockError, normalizeCheckoutItems } from "@/lib/checkout/stock";

const variants = [
  {
    id: "variant_2ml",
    productName: "Citrus Woods",
    sizeMl: 2,
    priceCents: 1600000,
    stockOnHand: 3,
  },
  {
    id: "variant_5ml",
    productName: "Citrus Woods",
    sizeMl: 5,
    priceCents: 2400000,
    stockOnHand: 1,
  },
];

describe("checkout stock integration logic", () => {
  it("combines duplicate items before validating stock", () => {
    const items = normalizeCheckoutItems([
      { variantId: "variant_2ml", quantity: 1 },
      { variantId: "variant_2ml", quantity: 2 },
    ]);

    expect(items).toEqual([{ variantId: "variant_2ml", quantity: 3 }]);
  });

  it("builds checkout lines with server prices", () => {
    const lines = buildCheckoutLines([{ variantId: "variant_2ml", quantity: 2 }], variants);

    expect(lines).toEqual([
      {
        variant: variants[0],
        quantity: 2,
        totalCents: 3200000,
      },
    ]);
  });

  it("prevents checkout when stock is insufficient", () => {
    expect(() => buildCheckoutLines([{ variantId: "variant_5ml", quantity: 2 }], variants)).toThrow(CheckoutStockError);
  });
});
