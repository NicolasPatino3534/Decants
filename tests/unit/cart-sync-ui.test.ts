import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cartProviderSource = fs.readFileSync(path.join(process.cwd(), "components", "cart", "cart-provider.tsx"), "utf8");
const checkoutClientSource = fs.readFileSync(path.join(process.cwd(), "components", "checkout", "checkout-client.tsx"), "utf8");

describe("cart sync UI contract", () => {
  it("updates local cart state from the server-sanitized PUT response", () => {
    expect(cartProviderSource).toContain("syncPayload.lines");
    expect(cartProviderSource).toContain("setLines(refreshedLines)");
    expect(cartProviderSource).not.toContain("setLines(merged);\r\n\r\n      await fetch(\"/api/cart\"");
  });

  it("syncs the cart immediately before checkout session creation", () => {
    expect(checkoutClientSource).toContain("const refreshedLines = await syncCart()");
    expect(checkoutClientSource).toContain("items: refreshedLines.map");
    expect(checkoutClientSource.indexOf("const refreshedLines = await syncCart()")).toBeLessThan(
      checkoutClientSource.indexOf('fetch("/api/checkout/session"'),
    );
  });
});
