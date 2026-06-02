import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/checkout/schema";

const validCheckout = {
  idempotencyKey: "checkout-test-key-123",
  customer: {
    name: "  Ana Cliente\u0000 ",
    email: " ANA@EXAMPLE.COM ",
    phone: " 11111111 ",
  },
  shippingAddress: {
    street: " Avenida Siempre Viva 123 ",
    city: " CABA ",
    state: " Buenos Aires ",
    postalCode: " 1000 ",
    country: " ar ",
  },
  shippingMethodId: "standard",
  couponCode: " aroma10 ",
  items: [{ variantId: "variant_1", quantity: 1 }],
};

describe("checkout schema", () => {
  it("sanitizes customer and address input", () => {
    const parsed = checkoutSchema.parse(validCheckout);

    expect(parsed.customer.name).toBe("Ana Cliente");
    expect(parsed.customer.email).toBe("ana@example.com");
    expect(parsed.shippingAddress.country).toBe("AR");
    expect(parsed.couponCode).toBe("AROMA10");
  });

  it("rejects invalid checkout payloads", () => {
    const parsed = checkoutSchema.safeParse({
      ...validCheckout,
      customer: { ...validCheckout.customer, email: "not-an-email" },
      items: [],
    });

    expect(parsed.success).toBe(false);
  });
});
