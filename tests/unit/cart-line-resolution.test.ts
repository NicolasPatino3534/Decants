import { describe, expect, it } from "vitest";
import { selectCartLinesForItems } from "@/lib/cart/server";
import type { CartLine } from "@/lib/types";

const legacyLine: CartLine = {
  productId: "legacy_product",
  productSlug: "legacy-product",
  productName: "Legacy Product",
  imageUrl: "/legacy.png",
  variantId: "legacy_variant",
  sizeMl: 2,
  priceCents: 120000,
  stockOnHand: 5,
  quantity: 1,
};

const modernLine: CartLine = {
  productId: "modern_product",
  productSlug: "modern-product",
  productName: "Modern Product",
  imageUrl: "/modern.png",
  variantId: "modern_variant",
  sizeMl: 5,
  priceCents: 240000,
  stockOnHand: 3,
  quantity: 2,
};

describe("cart line resolution", () => {
  it("returns mixed legacy and modern cart lines in requested order", () => {
    const selected = selectCartLinesForItems(
      [
        { variantId: "modern_variant", quantity: 2 },
        { variantId: "legacy_variant", quantity: 1 },
      ],
      [legacyLine, modernLine],
    );

    expect(selected.map((line) => line.variantId)).toEqual(["modern_variant", "legacy_variant"]);
  });

  it("prefers the latest resolved line for duplicate variant ids", () => {
    const selected = selectCartLinesForItems([{ variantId: "modern_variant", quantity: 2 }], [
      { ...modernLine, priceCents: 1 },
      modernLine,
    ]);

    expect(selected[0]?.priceCents).toBe(240000);
  });
});
