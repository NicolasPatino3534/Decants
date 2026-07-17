import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = resolve(process.cwd(), "supabase", "migrations");
const bootstrap = readFileSync(
  resolve(
    process.cwd(),
    "supabase",
    "staging",
    "historical_storefront_baseline_after_0002.sql",
  ),
  "utf8",
);
const firstTwoMigrations = ["0001_init.sql", "0002_production_hardening.sql"]
  .map((name) => readFileSync(resolve(migrationsDirectory, name), "utf8"))
  .join("\n");
const workdirBuilder = readFileSync(
  resolve(process.cwd(), "scripts", "prepare-staging-validation.ps1"),
  "utf8",
);
const releaseIntegrityMigration = readFileSync(
  resolve(
    migrationsDirectory,
    "20260716165809_validate_variant_integrity_and_profile_guard.sql",
  ),
  "utf8",
);

describe("migration chain from an empty Supabase database", () => {
  it("keeps the staging bootstrap outside the production migration directory", () => {
    expect(bootstrap).toContain("STAGING VALIDATION ONLY");
    expect(workdirBuilder).toContain(
      "historical_storefront_baseline_after_0002.sql",
    );
    expect(workdirBuilder).toMatch(
      /0002_production_hardening[\s\S]*historical_storefront_baseline[\s\S]*0003_security_advisor_fixes/,
    );
  });

  it.each([
    "public.next_order_number()",
    "public.is_admin()",
    "public.is_order_owner(uuid)",
    "public.confirm_paid_order(uuid)",
  ])("restores the historical function dependency %s", (signature) => {
    expect(firstTwoMigrations).not.toContain(`function ${signature}`);
    expect(bootstrap).toContain(`to_regprocedure('${signature}')`);
  });

  it.each([
    "perfume_brands",
    "categories",
    "product_variants",
    "carts",
    "cart_items",
    "shipping_methods",
    "coupons",
    "reviews",
  ])("restores and protects the historical table public.%s", (table) => {
    expect(bootstrap).toMatch(
      new RegExp(`create table if not exists public\\.${table}\\b`),
    );
    expect(bootstrap).toContain(`'${table}'`);
  });

  it.each([
    "category_id",
    "top_notes",
    "heart_notes",
    "base_notes",
    "active",
    "featured",
    "shipping_method_id",
    "coupon_id",
    "provider_payment_id",
  ])("restores the historical column dependency %s", (column) => {
    expect(bootstrap).toMatch(new RegExp(`add column if not exists ${column}`));
  });

  it("appends the forward-only integrity migration to the disposable chain", () => {
    expect(workdirBuilder).toMatch(
      /validate_final_schema[\s\S]*validate_variant_integrity_and_profile_guard/,
    );
    expect(releaseIntegrityMigration).toContain(
      "validate constraint order_items_variant_id_product_variants_fkey",
    );
    expect(releaseIntegrityMigration).toContain(
      "validate constraint inventory_movements_variant_id_product_variants_fkey",
    );
    expect(releaseIntegrityMigration).toContain(
      "RELEASE_PREFLIGHT_COUPON_CODE_COLLISION",
    );
    expect(releaseIntegrityMigration).toContain("security invoker");
    expect(releaseIntegrityMigration).not.toContain("auth.role()");
  });
});
