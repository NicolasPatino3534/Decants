import { describe, expect, it } from "vitest";
import {
  calculateCartTotals,
  clampCartQuantity,
  mergeCartLines,
} from "@/lib/cart/pricing";
import type { CartLine } from "@/lib/types";

const baseLine: CartLine = {
  productId: "prod_1",
  productSlug: "citrus",
  productName: "Citrus",
  imageUrl: "/image.png",
  variantId: "variant_1",
  sizeMl: 2,
  priceCents: 1000,
  stockOnHand: 5,
  quantity: 1,
};

describe("cart pricing", () => {
  it("calculates subtotal, capped discount, shipping and total", () => {
    const totals = calculateCartTotals({
      lines: [{ ...baseLine, quantity: 3 }],
      shippingCents: 250,
      discountCents: 5000,
    });

    expect(totals).toEqual({
      subtotalCents: 3000,
      discountCents: 3000,
      shippingCents: 250,
      totalCents: 250,
    });
  });

  it("clamps quantities to available stock", () => {
    expect(clampCartQuantity(10, 4)).toBe(4);
    expect(clampCartQuantity(0, 4)).toBe(1);
    expect(clampCartQuantity(2.9, 4)).toBe(2);
  });

  it("merges duplicate variants without exceeding stock", () => {
    const merged = mergeCartLines(
      [{ ...baseLine, quantity: 3 }],
      [{ ...baseLine, quantity: 4 }],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(5);
  });
});
