import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const hardeningSql = fs.readFileSync(path.join(process.cwd(), "supabase", "production_hardening.sql"), "utf8");
const completeSql = fs.readFileSync(path.join(process.cwd(), "supabase", "decants_store_complete.sql"), "utf8");

describe("Supabase production hardening SQL", () => {
  it("enables RLS on customer and commerce tables", () => {
    for (const table of ["profiles", "orders", "order_items", "payments", "inventory_movements"]) {
      expect(`${completeSql}\n${hardeningSql}`).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("adds database-level checkout idempotency", () => {
    expect(hardeningSql).toContain("checkout_idempotency_key");
    expect(hardeningSql).toContain("orders_customer_checkout_idempotency_idx");
  });

  it("keeps admin write policies behind an admin role helper", () => {
    expect(hardeningSql).toContain("public.has_admin_role()");
    expect(hardeningSql).not.toContain("with check (true)");
  });
});
