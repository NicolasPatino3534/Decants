import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const checkoutRouteSource = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "checkout", "session", "route.ts"),
  "utf8",
);
const migrationSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260712214511_align_order_items_product_variants.sql",
  ),
  "utf8",
);

describe("checkout order item compatibility", () => {
  it("tries modern, hybrid and legacy order item payloads", () => {
    expect(checkoutRouteSource).toContain("const modernPayload = lines.map");
    expect(checkoutRouteSource).toContain("const hybridPayload = lines.map");
    expect(checkoutRouteSource).toContain("const legacyPayload = lines.map");
    expect(checkoutRouteSource).toContain("checkout_order_items_insert_error");
  });

  it("aligns order item and movement variant references with product variants", () => {
    expect(migrationSource).toContain(
      "order_items_variant_id_product_variants_fkey",
    );
    expect(migrationSource).toContain("references public.product_variants(id)");
    expect(migrationSource).toContain(
      "inventory_movements_variant_id_product_variants_fkey",
    );
    expect(migrationSource).toContain(
      "add column if not exists order_id uuid references public.orders(id)",
    );
  });
});
