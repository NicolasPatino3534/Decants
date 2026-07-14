import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CheckoutShippingMethodError,
  resolveShippingMethod,
} from "@/lib/checkout/options";

const shippingMethodRow = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Envío estándar",
  description: "Entrega a domicilio",
  carrier: "Correo",
  base_price_cents: 450000,
  estimated_days_min: 2,
  estimated_days_max: 5,
};

describe("checkout fail-closed contracts", () => {
  it("rejects shipping resolution when server configuration is absent", async () => {
    await expect(
      resolveShippingMethod(null, shippingMethodRow.id),
    ).rejects.toMatchObject({
      name: "CheckoutShippingMethodError",
      status: 503,
    });
  });

  it("rejects unavailable and failed shipping method lookups", async () => {
    const unavailable = createShippingClient({ data: null, error: null });
    const unavailableResolution = resolveShippingMethod(
      unavailable.client,
      shippingMethodRow.id,
    );
    await expect(unavailableResolution).rejects.toBeInstanceOf(
      CheckoutShippingMethodError,
    );
    await expect(unavailableResolution).rejects.toMatchObject({ status: 400 });

    const failed = createShippingClient({
      data: null,
      error: { code: "PGRST000" },
    });
    const failedResolution = resolveShippingMethod(
      failed.client,
      shippingMethodRow.id,
    );
    await expect(failedResolution).rejects.toBeInstanceOf(
      CheckoutShippingMethodError,
    );
    await expect(failedResolution).rejects.toMatchObject({ status: 503 });
  });

  it("returns only the exact active shipping method requested", async () => {
    const query = createShippingClient({
      data: shippingMethodRow,
      error: null,
    });

    await expect(
      resolveShippingMethod(query.client, shippingMethodRow.id),
    ).resolves.toMatchObject({
      id: shippingMethodRow.id,
      basePriceCents: shippingMethodRow.base_price_cents,
    });
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", shippingMethodRow.id);
    expect(query.eq).toHaveBeenNthCalledWith(2, "active", true);
  });

  it("never retries order creation without shipping or coupon references", () => {
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "app", "api", "checkout", "session", "route.ts"),
      "utf8",
    );
    const createOrderSource = routeSource.match(
      /async function createOrder\([\s\S]*?\n}\n\nasync function createOrderItems/,
    )?.[0];

    expect(createOrderSource).toBeTruthy();
    expect(createOrderSource).toContain("shipping_method_id: shippingMethodId");
    expect(createOrderSource).toContain("coupon_id: couponId");
    expect(createOrderSource).not.toContain("legacyPayload");
    expect(createOrderSource?.match(/\.from\("orders"\)/g)).toHaveLength(1);
    expect(routeSource).toContain("shippingMethodId: shippingMethod.id");
    expect(routeSource).not.toContain("isUuid(shippingMethod.id)");
  });
});

function createShippingClient(result: { data: unknown; error: unknown }) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  const from = vi.fn(() => query);

  return {
    client: { from } as never,
    eq: query.eq,
  };
}
