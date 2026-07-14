import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const productsDataSource = fs.readFileSync(
  path.join(process.cwd(), "lib", "data", "products.ts"),
  "utf8",
);
const productsApiSource = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "catalog", "products", "route.ts"),
  "utf8",
);
const productApiSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "app",
    "api",
    "catalog",
    "products",
    "[slug]",
    "route.ts",
  ),
  "utf8",
);
const cartApiSource = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "cart", "route.ts"),
  "utf8",
);

describe("catalog source contract", () => {
  it("uses the Supabase admin client for server-side catalog reads", () => {
    expect(productsDataSource).toContain("createSupabaseAdminClient");
    expect(productsApiSource).toContain("createSupabaseAdminClient");
    expect(productApiSource).toContain("createSupabaseAdminClient");
  });

  it("does not fall back to demo catalog after Supabase returns an error", () => {
    expect(productsApiSource).not.toContain(
      'source: "demo" });\r\n  }\r\n\r\n  const { products, error }',
    );
    expect(productApiSource).not.toContain("fallbackProduct");
    expect(productsDataSource).not.toContain(
      "if (error) return filterProducts(demoProducts, filters)",
    );
  });

  it("resolves cart item product data with the admin catalog client", () => {
    expect(cartApiSource).toContain(
      "const catalogSupabase = createSupabaseAdminClient() ?? supabase",
    );
    expect(cartApiSource).toMatch(
      /buildCartLinesFromItems\(\s*catalogSupabase/,
    );
    expect(cartApiSource).toMatch(
      /replacePersistedCart\(\s*supabase,\s*user\.id,\s*lines,\s*catalogSupabase/,
    );
  });
});
