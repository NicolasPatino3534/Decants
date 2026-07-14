import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const hardeningSql = fs.readFileSync(
  path.join(process.cwd(), "supabase", "production_hardening.sql"),
  "utf8",
);
const completeSql = fs.readFileSync(
  path.join(process.cwd(), "supabase", "decants_store_complete.sql"),
  "utf8",
);

describe("Supabase production hardening SQL", () => {
  it("enables RLS on customer and commerce tables", () => {
    for (const table of [
      "profiles",
      "orders",
      "order_items",
      "payments",
      "inventory_movements",
    ]) {
      expect(`${completeSql}\n${hardeningSql}`).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  it("adds database-level checkout idempotency", () => {
    expect(hardeningSql).toContain("checkout_idempotency_key");
    expect(hardeningSql).toContain("orders_customer_checkout_idempotency_idx");
  });

  it("keeps admin write policies behind an admin role helper", () => {
    expect(hardeningSql).toContain("public.has_admin_role()");
    expect(hardeningSql).toContain("request.jwt.claims");
    expect(hardeningSql).toContain(
      "public.custom_access_token_hook(event jsonb)",
    );
    expect(hardeningSql).not.toContain("with check (true)");
  });

  it("does not query profiles from the complete-schema admin helper", () => {
    const isAdminFunction =
      completeSql.match(
        /create or replace function public\.is_admin\(\)[\s\S]*?\$\$;/,
      )?.[0] ?? "";

    expect(isAdminFunction).toContain("request.jwt.claims");
    expect(isAdminFunction).not.toContain("from public.profiles");
  });

  it("defines atomic stock reservation and release functions", () => {
    const combinedSql = `${completeSql}\n${hardeningSql}`;

    expect(combinedSql).toContain(
      "public.reserve_checkout_stock(p_items jsonb)",
    );
    expect(combinedSql).toContain(
      "public.increment_variant_stock(p_variant_id uuid, p_quantity integer)",
    );
    expect(combinedSql).toContain(
      "public.increment_decant_variant_stock(p_variant_id uuid, p_quantity integer)",
    );
  });
});
