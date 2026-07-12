import { describe, expect, it } from "vitest";
import { buildCheckoutLines, CheckoutStockError, normalizeCheckoutItems, selectCheckoutVariantsForItems } from "@/lib/checkout/stock";

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

  it("allows checkout when requested quantity exactly matches stock", () => {
    const lines = buildCheckoutLines([{ variantId: "variant_2ml", quantity: 3 }], variants);

    expect(lines[0]?.quantity).toBe(3);
    expect(lines[0]?.totalCents).toBe(4800000);
  });

  it("prevents checkout when stock is insufficient", () => {
    expect(() => buildCheckoutLines([{ variantId: "variant_5ml", quantity: 2 }], variants)).toThrow(CheckoutStockError);
  });

  it("returns a controlled stock error for missing or inactive variants", () => {
    expect(() => buildCheckoutLines([{ variantId: "archived_variant", quantity: 1 }], variants)).toThrow(CheckoutStockError);
  });

  it("keeps checkout variants from mixed catalog sources", () => {
    const selected = selectCheckoutVariantsForItems(
      [
        { variantId: "legacy_variant", quantity: 1 },
        { variantId: "modern_variant", quantity: 1 },
      ],
      [
        {
          id: "legacy_variant",
          productName: "Legacy",
          sizeMl: 2,
          priceCents: 120000,
          stockOnHand: 4,
          source: "decant_variants",
        },
        {
          id: "modern_variant",
          productName: "Modern",
          sizeMl: 5,
          priceCents: 220000,
          stockOnHand: 6,
          source: "product_variants",
        },
      ],
    );

    expect(selected.map((variant) => variant.id)).toEqual(["legacy_variant", "modern_variant"]);
  });
});
